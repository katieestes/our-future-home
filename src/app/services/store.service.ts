import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { shrinkImage } from './shrink-image';
import { Settings, TableName, Tables } from '../models';

const TABLES: TableName[] = [
  'finishes',
  'plans',
  'plan_images',
  'dos_donts',
  'inspiration',
  'canva_designs',
  'costs',
  'builders',
];

/**
 * Holds all the planning data in signals and saves changes to Supabase.
 * Usage in a component:  store.rows.finishes()   -> Finish[]
 *                         store.save('finishes', row)
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private supabase = inject(SupabaseService);
  private db = this.supabase.client;

  readonly rows = Object.fromEntries(TABLES.map((t) => [t, signal<unknown[]>([])])) as {
    [K in TableName]: WritableSignal<Tables[K][]>;
  };
  readonly settings = signal<Settings | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await Promise.all([...TABLES.map((t) => this.load(t)), this.loadSettings()]);
    } finally {
      this.loading.set(false);
    }
  }

  async load<K extends TableName>(table: K): Promise<void> {
    const { data, error } = await this.db
      .from(table)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return this.fail(error.message);
    this.rows[table].set((data ?? []) as Tables[K][]);
  }

  async loadSettings(): Promise<void> {
    const { data, error } = await this.db.from('settings').select('*').eq('id', 1).single();
    if (error) return this.fail(error.message);
    this.settings.set(data as Settings);
  }

  /** Insert a new row (no id) or update an existing one (has id). */
  async save<K extends TableName>(table: K, row: Tables[K]): Promise<boolean> {
    const { id, ...fields } = row as Tables[K] & { id?: string };
    const clean = this.emptyToNull(fields);

    if (id) {
      const { error } = await this.db.from(table).update(clean).eq('id', id);
      if (error) return this.fail(error.message), false;
    } else {
      const nextOrder = this.rows[table]().length + 1;
      const { error } = await this.db.from(table).insert({ ...clean, sort_order: nextOrder });
      if (error) return this.fail(error.message), false;
    }
    await this.load(table);
    return true;
  }

  /** Insert one row and return it (with its new id), or null on error. */
  async insert<K extends TableName>(table: K, row: Omit<Tables[K], 'id'>): Promise<Tables[K] | null> {
    const nextOrder = this.rows[table]().length + 1;
    const { data, error } = await this.db
      .from(table)
      .insert({ ...this.emptyToNull(row as Record<string, unknown>), sort_order: nextOrder })
      .select()
      .single();
    if (error) return this.fail(error.message), null;
    this.rows[table].update((list) => [...list, data as Tables[K]]);
    return data as Tables[K];
  }

  /**
   * Change a few fields on one row. The screen updates right away;
   * the database save happens in the background.
   */
  async patch<K extends TableName>(table: K, id: string, fields: Partial<Tables[K]>): Promise<boolean> {
    this.rows[table].update((list) =>
      list.map((r) => ((r as { id?: string }).id === id ? { ...r, ...fields } : r)),
    );
    const { error } = await this.db.from(table).update(fields as never).eq('id', id);
    if (error) return this.fail(error.message), false;
    return true;
  }

  async remove(table: TableName, id: string): Promise<boolean> {
    const { error } = await this.db.from(table).delete().eq('id', id);
    if (error) return this.fail(error.message), false;
    await this.load(table);
    return true;
  }

  async saveSettings(patch: Partial<Settings>): Promise<boolean> {
    const { error } = await this.db
      .from('settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) return this.fail(error.message), false;
    await this.loadSettings();
    return true;
  }

  /** Shrinks a photo, uploads it to Supabase Storage, and returns its public URL. */
  async uploadImage(original: File): Promise<string | null> {
    const file = await shrinkImage(original);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await this.db.storage.from('images').upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (error) {
      this.fail(error.message);
      return null;
    }
    return this.db.storage.from('images').getPublicUrl(path).data.publicUrl;
  }

  /** How much photo storage is used (bytes + file count). */
  async storageUsage(): Promise<{ bytes: number; files: number } | null> {
    const { data, error } = await this.db.rpc('storage_usage');
    if (error || !data?.[0]) return null;
    return { bytes: Number(data[0].bytes), files: Number(data[0].files) };
  }

  // ----- household members -----
  async listMembers(): Promise<string[]> {
    const { data } = await this.db.from('household_members').select('email').order('added_at');
    return (data ?? []).map((r: { email: string }) => r.email);
  }

  async addMember(email: string): Promise<boolean> {
    const { error } = await this.db.from('household_members').insert({ email: email.trim().toLowerCase() });
    if (error) return this.fail(error.message), false;
    return true;
  }

  async removeMember(email: string): Promise<boolean> {
    const { error } = await this.db.from('household_members').delete().eq('email', email);
    if (error) return this.fail(error.message), false;
    return true;
  }

  private emptyToNull(obj: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = v === '' ? null : v;
    return out;
  }

  private fail(message: string): void {
    this.error.set(message);
    setTimeout(() => this.error.set(null), 6000);
  }
}

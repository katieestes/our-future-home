import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Plan, PlanImage, Stroke } from '../models';
import { Icon } from '../shared/icon';
import { MarkupEditor } from './markup/markup-editor';
import { PLAN_FIELDS, planTag } from './plan-helpers';

/** One plan: its images, the drawing area, and our notes. Route: #/plans/:id */
@Component({
  selector: 'app-plan-detail',
  imports: [RouterLink, Icon, MarkupEditor],
  templateUrl: './plan-detail.html',
  styleUrl: './plan-detail.css',
})
export class PlanDetail {
  /** Filled in from the URL by the router (withComponentInputBinding). */
  id = input.required<string>();

  store = inject(StoreService);
  private editor = inject(EditorService);
  private router = inject(Router);
  tag = planTag;

  plan = computed(() => this.store.rows.plans().find((p) => p.id === this.id()));
  images = computed(() => this.store.rows.plan_images().filter((i) => i.plan_id === this.id()));
  selectedId = signal<string | null>(null);
  selected = computed<PlanImage | undefined>(
    () => this.images().find((i) => i.id === this.selectedId()) ?? this.images()[0],
  );

  uploading = signal(false);
  saveState = signal<'idle' | 'saving' | 'saved'>('idle');
  private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    // Reset the selected image when switching to a different plan.
    effect(() => {
      this.id();
      this.selectedId.set(null);
    });
  }

  // ----- markup -----

  onMarkup(image: PlanImage, strokes: Stroke[]) {
    const id = image.id!;
    // update the screen now…
    this.store.rows.plan_images.update((list) => list.map((i) => (i.id === id ? { ...i, markup: strokes } : i)));
    // …and save to the database once drawing pauses for a moment
    this.saveState.set('saving');
    clearTimeout(this.saveTimers.get(id));
    this.saveTimers.set(
      id,
      setTimeout(async () => {
        const ok = await this.store.patch('plan_images', id, {
          markup: strokes,
          markup_updated_at: new Date().toISOString(),
        });
        this.saveTimers.delete(id);
        if (ok && this.saveTimers.size === 0) this.saveState.set('saved');
      }, 800),
    );
  }

  // ----- images -----

  async addFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.uploading.set(true);
    let last: PlanImage | null = null;
    for (const file of files) {
      const url = await this.store.uploadImage(file);
      if (!url) continue;
      last = await this.store.insert('plan_images', {
        plan_id: this.id(),
        image_url: url,
        caption: file.name.replace(/\.[^.]+$/, ''),
        markup: [],
      });
    }
    this.uploading.set(false);
    if (last?.id) this.selectedId.set(last.id);
  }

  addByLink() {
    this.editor.open({
      title: 'Add image from a link',
      value: { image_url: '', caption: '' },
      fields: [
        { key: 'image_url', label: 'Image', type: 'image' },
        { key: 'caption', label: 'Caption', type: 'text', placeholder: 'e.g. Main floor' },
      ],
      onSave: async (v) => {
        if (!v['image_url']) return false;
        const row = await this.store.insert('plan_images', {
          plan_id: this.id(),
          image_url: v['image_url'],
          caption: v['caption'],
          markup: [],
        });
        if (row?.id) this.selectedId.set(row.id);
        return !!row;
      },
    });
  }

  editImage(img: PlanImage) {
    this.editor.open({
      title: 'Edit image',
      value: { caption: img.caption ?? '' },
      fields: [{ key: 'caption', label: 'Caption', type: 'text', placeholder: 'e.g. Main floor, Option B' }],
      onSave: (v) => this.store.patch('plan_images', img.id!, { caption: v['caption'] || null }),
      onDelete: async () => {
        const ok = await this.store.remove('plan_images', img.id!);
        if (ok) this.selectedId.set(null);
        return ok;
      },
    });
  }

  // ----- plan info + notes -----

  editPlan() {
    const p = this.plan();
    if (!p) return;
    this.editor.open({
      title: 'Edit plan',
      value: p,
      fields: PLAN_FIELDS,
      onSave: (v) => this.store.save('plans', v as Plan),
      onDelete: async () => {
        const ok = await this.store.remove('plans', p.id!);
        if (ok) {
          this.store.load('plan_images');
          this.router.navigate(['/plans']);
        }
        return ok;
      },
    });
  }

  saveNote(field: 'likes' | 'changes' | 'notes', event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    const p = this.plan();
    if (!p?.id || (p[field] ?? '') === value) return;
    this.store.patch('plans', p.id, { [field]: value || null });
  }
}

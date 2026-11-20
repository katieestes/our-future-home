import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorService, FieldDef } from '../services/editor.service';
import { StoreService } from '../services/store.service';

/**
 * The single add/edit form used by every section.
 * It builds its inputs from the FieldDef list it is given.
 */
@Component({
  selector: 'app-edit-dialog',
  imports: [FormsModule],
  template: `
    @if (editor.current(); as req) {
      <div class="backdrop" (click)="close()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="req.title" #dialog>
        <form (ngSubmit)="save()">
          <h2>{{ req.title }}</h2>

          @for (f of req.fields; track f.key) {
            <div class="field">
              @switch (f.type) {
                @case ('checkbox') {
                  <label class="check">
                    <input type="checkbox" [(ngModel)]="req.value[f.key]" [name]="f.key" />
                    {{ f.label }}
                  </label>
                }
                @case ('textarea') {
                  <label [for]="'f-' + f.key">{{ f.label }}</label>
                  <textarea class="input" [id]="'f-' + f.key" [name]="f.key"
                    [(ngModel)]="req.value[f.key]" [placeholder]="f.placeholder ?? ''"></textarea>
                }
                @case ('select') {
                  <label [for]="'f-' + f.key">{{ f.label }}</label>
                  <select class="input" [id]="'f-' + f.key" [name]="f.key" [(ngModel)]="req.value[f.key]">
                    @for (o of f.options; track o.value) {
                      <option [value]="o.value">{{ o.label }}</option>
                    }
                  </select>
                }
                @case ('color') {
                  <label [for]="'f-' + f.key">{{ f.label }}</label>
                  <div class="row">
                    <input type="color" class="swatch" [id]="'f-' + f.key" [name]="f.key"
                      [ngModel]="asColor(req.value[f.key])" (ngModelChange)="req.value[f.key] = $event" />
                    <span class="small">{{ req.value[f.key] || 'No color yet' }}</span>
                  </div>
                }
                @case ('image') {
                  <label [for]="'f-' + f.key">{{ f.label }}</label>
                  @if (req.value[f.key]) {
                    <div class="preview">
                      <img [src]="req.value[f.key]" alt="" />
                      <button type="button" class="add-link" (click)="req.value[f.key] = null">Remove photo</button>
                    </div>
                  }
                  <input type="file" accept="image/*" [id]="'f-' + f.key" (change)="upload($event, f)" />
                  <input class="input" type="url" [name]="f.key + '-url'" [(ngModel)]="req.value[f.key]"
                    placeholder="…or paste an image link" [attr.aria-label]="f.label + ' link'" />
                  @if (uploading()) { <span class="small">Uploading…</span> }
                }
                @default {
                  <label [for]="'f-' + f.key">{{ f.label }}</label>
                  <input class="input" [type]="f.type" [id]="'f-' + f.key" [name]="f.key"
                    [(ngModel)]="req.value[f.key]" [placeholder]="f.placeholder ?? ''"
                    [required]="!!f.required" />
                }
              }
            </div>
          }

          <div class="actions">
            @if (req.onDelete) {
              <button type="button" class="btn btn-danger" (click)="remove()" [disabled]="busy()">
                {{ confirmingDelete() ? 'Click again to delete' : 'Delete' }}
              </button>
            }
            <span class="spacer"></span>
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy() || uploading()">
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgba(46, 42, 38, 0.35); z-index: 50; }
    .dialog {
      position: fixed; z-index: 51; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 24px)); max-height: calc(100vh - 32px); overflow: auto;
      background: var(--surface); border-radius: 12px; border: 1px solid var(--border);
      box-shadow: 0 20px 50px rgba(46, 42, 38, 0.18);
    }
    form { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
    h2 { font-family: var(--font-display); font-weight: 600; font-size: 22px; }
    .check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); }
    .check input { width: 18px; height: 18px; }
    .row { display: flex; align-items: center; gap: 10px; }
    .swatch { width: 48px; height: 40px; padding: 2px; border: 1px solid #ddd4c6; border-radius: 6px; background: #fff; }
    .preview { display: flex; align-items: flex-end; gap: 12px; }
    .preview img { width: 120px; height: 80px; object-fit: cover; border-radius: 6px; }
    .actions { display: flex; gap: 8px; align-items: center; padding-top: 6px; flex-wrap: wrap; }
    .spacer { flex: 1; }
  `,
  host: { '(document:keydown.escape)': 'close()' },
})
export class EditDialog {
  editor = inject(EditorService);
  private store = inject(StoreService);
  busy = signal(false);
  uploading = signal(false);
  confirmingDelete = signal(false);
  private dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Focus the first input whenever the dialog opens.
    effect(() => {
      const el = this.dialog()?.nativeElement;
      if (el) setTimeout(() => el.querySelector<HTMLElement>('input, textarea, select')?.focus());
    });
  }

  asColor(v: unknown): string {
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#c8a27a';
  }

  async upload(event: Event, field: FieldDef) {
    const file = (event.target as HTMLInputElement).files?.[0];
    const req = this.editor.current();
    if (!file || !req) return;
    this.uploading.set(true);
    const url = await this.store.uploadImage(file);
    this.uploading.set(false);
    if (url) req.value[field.key] = url;
  }

  async save() {
    const req = this.editor.current();
    if (!req) return;
    this.busy.set(true);
    const ok = await req.onSave(req.value);
    this.busy.set(false);
    if (ok) this.close();
  }

  async remove() {
    const req = this.editor.current();
    if (!req?.onDelete) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.busy.set(true);
    const ok = await req.onDelete();
    this.busy.set(false);
    if (ok) this.close();
  }

  close() {
    this.confirmingDelete.set(false);
    this.editor.close();
  }
}

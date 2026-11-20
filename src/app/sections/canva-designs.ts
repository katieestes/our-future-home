import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { CanvaDesign } from '../models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-canva-designs',
  imports: [Icon],
  template: `
    <section class="section" id="canva">
      <div class="section-head">
        <h2><app-icon name="palette" [size]="17" />Canva Designs</h2>
        <button class="add-link" type="button" (click)="edit()">+ Link design</button>
      </div>

      @if (items().length === 0) {
        <p class="empty">Paste links to your Canva concept boards and layouts.</p>
      } @else {
        <div class="grid">
          @for (d of items(); track d.id) {
            <article class="card">
              <button class="edit-hit thumb" type="button" (click)="edit(d)" [attr.aria-label]="'Edit ' + d.title">
                @if (d.thumbnail_url) {
                  <img [src]="d.thumbnail_url" alt="" />
                } @else {
                  <div class="mood" aria-hidden="true">
                    <span style="background:#93A18B"></span><span style="background:#C8A27A"></span>
                    <span style="background:#EFEBE4"></span><span style="background:#B97A5E"></span>
                  </div>
                }
              </button>
              <div class="card-body">
                <span class="name">{{ d.title }}</span>
                @if (d.url) {
                  <a class="small-link" [href]="d.url" target="_blank" rel="noopener">Open in Canva ↗</a>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .thumb { margin: 8px 8px 0; height: 104px; border-radius: 5px; overflow: hidden; background: var(--surface); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .mood { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; padding: 6px; height: 100%; box-sizing: border-box; }
    .mood span { border-radius: 3px; }
    .name { font-size: 13px; font-weight: 600; }
    .small-link { font-size: 12px; }
  `,
})
export class CanvaDesigns {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.canva_designs;

  edit(item?: CanvaDesign) {
    this.editor.open({
      title: item ? 'Edit design link' : 'Link a Canva design',
      value: item ?? { title: '' },
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Kitchen concept board' },
        { key: 'url', label: 'Canva link', type: 'url', placeholder: 'https://www.canva.com/design/…' },
        { key: 'thumbnail_url', label: 'Preview image (optional)', type: 'image' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      onSave: (v) => this.store.save('canva_designs', v as unknown as CanvaDesign),
      onDelete: item?.id ? () => this.store.remove('canva_designs', item.id!) : undefined,
    });
  }
}

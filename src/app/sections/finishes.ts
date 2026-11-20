import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Finish } from '../models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-finishes',
  imports: [Icon],
  template: `
    <section class="section" id="finishes">
      <div class="section-head">
        <h2><app-icon name="grid" [size]="17" />Finishes We Love</h2>
        <button class="add-link" type="button" (click)="edit()">+ Add finish</button>
      </div>

      @if (items().length === 0) {
        <p class="empty">No finishes yet — add flooring, cabinets, paint and more.</p>
      } @else {
        <div class="grid">
          @for (f of items(); track f.id) {
            <article class="card">
              <button class="edit-hit" type="button" (click)="edit(f)" [attr.aria-label]="'Edit ' + f.name">
                @if (f.image_url) {
                  <img class="swatch" [src]="f.image_url" alt="" />
                } @else {
                  <div class="swatch" [style.background]="f.swatch_color || '#e3dcd0'"></div>
                }
              </button>
              <div class="card-body">
                <span class="eyebrow">{{ f.category }}</span>
                <span class="name">{{ f.name }}</span>
                @if (f.note) { <span class="small">Note: {{ f.note }}</span> }
                @if (f.source_url) {
                  <a class="src" [href]="f.source_url" target="_blank" rel="noopener">↗ Source link</a>
                } @else {
                  <span class="src small">No source yet</span>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .swatch { width: 100%; height: 104px; object-fit: cover; }
    .name { font-size: 14px; font-weight: 600; }
    .src { font-size: 12px; margin-top: auto; padding-top: 4px; }
  `,
})
export class Finishes {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.finishes;

  edit(item?: Finish) {
    this.editor.open({
      title: item ? 'Edit finish' : 'Add a finish',
      value: item ?? { category: '', name: '' },
      fields: [
        {
          key: 'category', label: 'Category', type: 'text', required: true,
          placeholder: 'Flooring, Cabinetry, Tile…',
        },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'note', label: 'Note', type: 'text' },
        { key: 'source_url', label: 'Source link', type: 'url', placeholder: 'https://' },
        { key: 'swatch_color', label: 'Swatch color', type: 'color' },
        { key: 'image_url', label: 'Photo (optional — shows instead of the color)', type: 'image' },
      ],
      onSave: (v) => this.store.save('finishes', v as unknown as Finish),
      onDelete: item?.id ? () => this.store.remove('finishes', item.id!) : undefined,
    });
  }
}

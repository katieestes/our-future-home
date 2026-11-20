import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Inspiration } from '../models';
import { Icon } from '../shared/icon';

const ROOMS = ['Kitchen', 'Bathroom', 'Living room', 'Bedroom', 'Storage', 'Mudroom', 'Laundry', 'Exterior', 'Other'];

@Component({
  selector: 'app-inspiration',
  imports: [Icon],
  template: `
    <section class="section" id="inspiration">
      <div class="section-head">
        <h2><app-icon name="image" [size]="17" />Inspiration Gallery</h2>
        <button class="add-link" type="button" (click)="edit()">+ Add photo</button>
      </div>

      @if (items().length === 0) {
        <p class="empty">Save photos of kitchens, bathrooms, storage and living spaces you love.<br />
          Upload a photo or paste an image link.</p>
      } @else {
        <div class="gallery">
          @for (p of items(); track p.id) {
            <figure [class.big]="$first">
              <button class="edit-hit" type="button" (click)="edit(p)" [attr.aria-label]="'Edit ' + p.title">
                @if (p.image_url) {
                  <img [src]="p.image_url" [alt]="p.title" loading="lazy" />
                } @else {
                  <div class="placeholder"><app-icon name="image" [size]="28" [stroke]="1.4" /></div>
                }
              </button>
              <figcaption>{{ p.title }}</figcaption>
            </figure>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      grid-auto-rows: 104px;
      gap: 8px;
    }
    figure { margin: 0; position: relative; border-radius: 8px; overflow: hidden; background: var(--sand); }
    figure.big { grid-column: span 2; grid-row: span 2; }
    .edit-hit { width: 100%; height: 100%; }
    img, .placeholder { width: 100%; height: 100%; object-fit: cover; }
    .placeholder { display: flex; align-items: center; justify-content: center; color: #b3a898; }
    figcaption {
      position: absolute; left: 8px; bottom: 8px; padding: 3px 8px; pointer-events: none;
      background: rgba(255, 253, 249, 0.92); border-radius: 5px; font-size: 12px; font-weight: 500;
      max-width: calc(100% - 16px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
  `,
})
export class InspirationGallery {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.inspiration;

  edit(item?: Inspiration) {
    this.editor.open({
      title: item ? 'Edit inspiration' : 'Add inspiration',
      value: item ?? { title: '', room: 'Kitchen' },
      fields: [
        { key: 'image_url', label: 'Photo', type: 'image' },
        { key: 'title', label: 'Caption', type: 'text', required: true, placeholder: 'e.g. Sage kitchen with wood island' },
        { key: 'room', label: 'Room', type: 'select', options: ROOMS.map((r) => ({ value: r, label: r })) },
        { key: 'source_url', label: 'Where we found it', type: 'url', placeholder: 'https://' },
        { key: 'notes', label: 'What we like about it', type: 'textarea' },
      ],
      onSave: (v) => this.store.save('inspiration', v as unknown as Inspiration),
      onDelete: item?.id ? () => this.store.remove('inspiration', item.id!) : undefined,
    });
  }
}

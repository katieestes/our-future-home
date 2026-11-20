import { Component, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Plan, PlanTag } from '../models';
import { Icon } from '../shared/icon';

const TAGS: Record<PlanTag, { label: string; css: string }> = {
  favorite: { label: '★ Favorite', css: 'pill-sage' },
  revisit: { label: 'Revisit', css: 'pill-clay' },
  idea: { label: 'Idea', css: 'pill-neutral' },
};

@Component({
  selector: 'app-plans',
  imports: [Icon],
  template: `
    <section class="section" id="plans">
      <div class="section-head">
        <h2><app-icon name="plan" [size]="17" />House Plans &amp; Layouts</h2>
        <button class="add-link" type="button" (click)="edit()">+ Add plan</button>
      </div>

      @if (items().length === 0) {
        <p class="empty">Save floor plans you like, with a link back to the source.</p>
      } @else {
        <div class="grid">
          @for (p of items(); track p.id) {
            <article class="card">
              <button class="edit-hit thumb" type="button" (click)="edit(p)" [attr.aria-label]="'Edit ' + p.name">
                @if (p.image_url) {
                  <img [src]="p.image_url" alt="" />
                } @else {
                  <!-- Generic floor-plan sketch shown until a real plan image is added -->
                  <svg viewBox="0 0 120 90" aria-hidden="true">
                    <g fill="none" stroke="#4A443D" stroke-width="1.6">
                      <rect x="10" y="10" width="100" height="70" />
                      <path d="M50 10v40M10 45h40M50 50h60M80 50v30M80 10v22" />
                    </g>
                  </svg>
                }
              </button>
              <div class="card-body">
                <span class="name">{{ p.name }}</span>
                @if (p.details) { <span class="small">{{ p.details }}</span> }
                <div class="foot">
                  <span class="pill tag" [class]="tag(p.tag).css">{{ tag(p.tag).label }}</span>
                  @if (p.link_url) {
                    <a [href]="p.link_url" target="_blank" rel="noopener" [attr.aria-label]="'Open ' + p.name">
                      <app-icon name="external" [size]="14" />
                    </a>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .thumb { margin: 10px 10px 0; background: var(--surface); border-radius: 5px; height: 110px; overflow: hidden; }
    .thumb img, .thumb svg { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb svg { padding: 6px; }
    .name { font-size: 13px; font-weight: 600; }
    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
  `,
})
export class Plans {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.plans;
  tag = (t: PlanTag) => TAGS[t] ?? TAGS.idea;

  edit(item?: Plan) {
    this.editor.open({
      title: item ? 'Edit plan' : 'Add a plan',
      value: item ?? { name: '', tag: 'idea' },
      fields: [
        { key: 'name', label: 'Plan name', type: 'text', required: true },
        { key: 'details', label: 'Details', type: 'text', placeholder: 'e.g. 1 story · 4 bed' },
        {
          key: 'tag', label: 'Tag', type: 'select',
          options: [
            { value: 'favorite', label: 'Favorite' },
            { value: 'revisit', label: 'Revisit' },
            { value: 'idea', label: 'Idea' },
          ],
        },
        { key: 'link_url', label: 'Link to plan', type: 'url', placeholder: 'https://' },
        { key: 'image_url', label: 'Floor plan image', type: 'image' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      onSave: (v) => this.store.save('plans', v as unknown as Plan),
      onDelete: item?.id ? () => this.store.remove('plans', item.id!) : undefined,
    });
  }
}

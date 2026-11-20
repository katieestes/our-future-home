import { Component, computed, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Builder } from '../models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-builders',
  imports: [Icon],
  template: `
    <section class="section" id="builders">
      <div class="section-head">
        <h2><app-icon name="builder" [size]="17" />Builder Comparison</h2>
        <span class="meta">{{ researched() }} of {{ items().length }} researched</span>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Builder</th><th>Service area</th><th>Strengths</th><th>Questions to ask</th><th>Est. pricing</th></tr>
          </thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr class="clickable" (click)="edit(b)">
                <td class="first"><button type="button" (click)="edit(b); $event.stopPropagation()">{{ b.name }}</button></td>
                <td>@if (b.service_area) { {{ b.service_area }} } @else { <span class="todo">To research</span> }</td>
                <td>@if (b.strengths) { {{ b.strengths }} } @else { <span class="todo">To research</span> }</td>
                <td class="q">{{ b.questions }}</td>
                <td>@if (b.est_pricing) { {{ b.est_pricing }} } @else { <span class="todo">To research</span> }</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="q">No builders yet.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="tip">
        <app-icon name="bulb" [size]="15" />
        Tip: ask neighbors near the land who they built with.
      </div>
      <button class="add-link start" type="button" (click)="edit()">+ Add builder</button>
    </section>
  `,
  styles: `
    .q { color: var(--text-2); }
    .tip { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--sand);
      border-radius: 6px; font-size: 13px; color: var(--text-2); }
    .tip app-icon { color: var(--sage-icon); }
    .start { align-self: flex-start; }
  `,
})
export class Builders {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.builders;
  researched = computed(
    () => this.items().filter((b) => b.service_area && b.strengths && b.est_pricing).length,
  );

  edit(item?: Builder) {
    this.editor.open({
      title: item ? 'Edit builder' : 'Add a builder',
      value: item ?? { name: '' },
      fields: [
        { key: 'name', label: 'Builder name', type: 'text', required: true },
        { key: 'service_area', label: 'Location / service area', type: 'text' },
        { key: 'strengths', label: 'Strengths', type: 'text' },
        { key: 'questions', label: 'Questions to ask', type: 'textarea' },
        { key: 'est_pricing', label: 'Estimated pricing', type: 'text', placeholder: 'e.g. per sq ft range from their quote' },
        { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      onSave: (v) => this.store.save('builders', v as unknown as Builder),
      onDelete: item?.id ? () => this.store.remove('builders', item.id!) : undefined,
    });
  }
}

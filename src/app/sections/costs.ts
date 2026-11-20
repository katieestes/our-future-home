import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Cost } from '../models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-costs',
  imports: [Icon, CurrencyPipe],
  template: `
    <section class="section" id="budget">
      <div class="section-head">
        <h2><app-icon name="budget" [size]="17" />Pricing &amp; Budget</h2>
        <span class="pill pill-clay"><app-icon name="info" [size]="12" [stroke]="2" />Costs to research — update as we get closer</span>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Category</th><th>Est. cost</th><th>Source</th><th>Notes</th></tr>
          </thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr class="clickable" [class.diy]="c.is_diy" (click)="edit(c)">
                <td class="first"><button type="button" (click)="edit(c); $event.stopPropagation()">{{ c.category }}</button></td>
                <td>
                  @if (c.estimate != null) { {{ c.estimate | currency: 'USD' : 'symbol' : '1.0-0' }} }
                  @else { <span class="muted">TBD</span> }
                </td>
                <td>{{ c.source || '—' }}</td>
                <td class="notes">{{ c.notes }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">No cost items yet.</td></tr>
            }
          </tbody>
          @if (known().count > 0) {
            <tfoot>
              <tr>
                <td class="first">Known so far</td>
                <td>{{ known().total | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
                <td colspan="2" class="muted">{{ known().count }} of {{ items().length }} items have estimates</td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
      <button class="add-link start" type="button" (click)="edit()">+ New cost item</button>
    </section>
  `,
  styles: `
    .muted { color: var(--muted); }
    tr.diy td { background: #f6f8f3; }
    tr.diy .notes { color: var(--sage-text); }
    tfoot td { border-top: 1px solid #e3dacb; font-weight: 600; background: var(--sand); }
    .start { align-self: flex-start; }
  `,
})
export class Costs {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  items = this.store.rows.costs;

  known = computed(() => {
    const withEst = this.items().filter((c) => c.estimate != null && !c.is_diy);
    return { count: withEst.length, total: withEst.reduce((sum, c) => sum + Number(c.estimate), 0) };
  });

  edit(item?: Cost) {
    this.editor.open({
      title: item ? 'Edit cost item' : 'Add a cost item',
      value: item ?? { category: '', is_diy: false },
      fields: [
        { key: 'category', label: 'Category', type: 'text', required: true },
        { key: 'estimate', label: 'Estimated cost (leave blank if unknown)', type: 'number' },
        { key: 'source', label: 'Source', type: 'text', placeholder: 'e.g. Builder quote, online research' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        { key: 'is_diy', label: 'This is something we could DIY', type: 'checkbox' },
      ],
      onSave: (v) => {
        const est = v['estimate'];
        v['estimate'] = est === '' || est == null ? null : Number(est);
        return this.store.save('costs', v as unknown as Cost);
      },
      onDelete: item?.id ? () => this.store.remove('costs', item.id!) : undefined,
    });
  }
}

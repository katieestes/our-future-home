import { Component, computed, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { DoDont } from '../models';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-dos-donts',
  imports: [Icon],
  template: `
    <section class="section" id="dos-donts">
      <div class="section-head">
        <h2><app-icon name="list" [size]="17" />Our Do’s &amp; Don’ts</h2>
        <span class="meta">Agreed together</span>
      </div>
      <div class="cols">
        <div class="col do">
          <span class="eyebrow head">Must-haves</span>
          <ul>
            @for (d of dos(); track d.id) {
              <li><app-icon name="check" [size]="14" [stroke]="2.4" />
                <button type="button" (click)="edit(d)">{{ d.text }}</button></li>
            }
          </ul>
          <button class="add-link" type="button" (click)="edit(undefined, 'do')">+ Add must-have</button>
        </div>
        <div class="col dont">
          <span class="eyebrow head">Things to avoid</span>
          <ul>
            @for (d of donts(); track d.id) {
              <li><app-icon name="x" [size]="14" [stroke]="2.4" />
                <button type="button" (click)="edit(d)">{{ d.text }}</button></li>
            }
          </ul>
          <button class="add-link" type="button" (click)="edit(undefined, 'dont')">+ Add thing to avoid</button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; flex: 1; }
    .col { border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
    .do { background: var(--sage-wash); }
    .dont { background: var(--clay-wash); }
    .do .head { color: var(--sage-text); }
    .dont .head { color: var(--clay-text); }
    .do app-icon { color: var(--sage-icon); }
    .dont app-icon { color: var(--clay); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; flex: 1; }
    li { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; line-height: 1.3; }
    li app-icon { margin-top: 1px; }
    li button { all: unset; cursor: pointer; }
    li button:hover { text-decoration: underline; }
    li button:focus-visible { outline: 2px solid var(--sage); outline-offset: 2px; }
    .add-link { align-self: flex-start; }
    @media (max-width: 520px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class DosDonts {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  dos = computed(() => this.store.rows.dos_donts().filter((d) => d.kind === 'do'));
  donts = computed(() => this.store.rows.dos_donts().filter((d) => d.kind === 'dont'));

  edit(item?: DoDont, kind: 'do' | 'dont' = 'do') {
    this.editor.open({
      title: item ? 'Edit item' : kind === 'do' ? 'Add a must-have' : 'Add something to avoid',
      value: item ?? { kind, text: '' },
      fields: [
        { key: 'text', label: 'Text', type: 'text', required: true },
        {
          key: 'kind', label: 'List', type: 'select',
          options: [
            { value: 'do', label: 'Must-haves' },
            { value: 'dont', label: 'Things to avoid' },
          ],
        },
      ],
      onSave: (v) => this.store.save('dos_donts', v as unknown as DoDont),
      onDelete: item?.id ? () => this.store.remove('dos_donts', item.id!) : undefined,
    });
  }
}

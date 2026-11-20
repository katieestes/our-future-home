import { Component, computed, inject } from '@angular/core';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Icon } from '../shared/icon';

const STAGES = ['Dream & collect', 'Save & research costs', 'Choose plan & builder', 'Build'];

@Component({
  selector: 'app-page-header',
  imports: [Icon],
  template: `
    <div class="head">
      <div class="title">
        <div class="row">
          <span class="logo"><app-icon name="home" [size]="26" [stroke]="1.6" /></span>
          <h1>Our Future Home</h1>
        </div>
        <p>{{ s()?.intro }}</p>
      </div>

      <section class="section timeline" aria-label="Timeline">
        <div class="section-head">
          <div class="row wrap">
            <span class="pill pill-sage"><span class="dot"></span>{{ s()?.status_label }}</span>
            <span class="meta">Collecting ideas · no deadlines yet</span>
          </div>
          <div class="row">
            <span class="pill pill-clay"><app-icon name="calendar" [size]="13" [stroke]="2" />Target build: {{ s()?.target_build }}</span>
            <button class="btn btn-ghost sm" type="button" (click)="edit()" aria-label="Edit timeline">
              <app-icon name="edit" [size]="14" />
            </button>
          </div>
        </div>
        <ol class="stages">
          @for (stage of stages(); track stage.label) {
            <li [class.done]="stage.reached">
              <span class="bar"></span>
              <span class="label">{{ $index + 1 }} · {{ stage.label }}</span>
            </li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    .head { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 20px; align-items: stretch; }
    .title { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
    .row { display: flex; align-items: center; gap: 12px; }
    .wrap { flex-wrap: wrap; gap: 10px; }
    .logo { width: 44px; height: 44px; border-radius: 10px; background: var(--clay-tint); color: var(--clay);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(30px, 4vw, 42px);
      letter-spacing: -0.01em; line-height: 1.05; }
    p { margin: 0; font-size: 15px; color: var(--text-2); max-width: 620px; }
    .timeline { gap: 16px; justify-content: space-between; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #6a7c62; }
    .pill { font-size: 13px; }
    .sm { padding: 6px 8px; min-height: 30px; }
    .stages { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .stages li { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-2); }
    .bar { height: 6px; border-radius: 3px; background: #e3dcd0; }
    .stages li.done .bar { background: var(--sage); }
    .stages li.done .label { color: var(--text); font-weight: 600; }
    @media (max-width: 900px) {
      .head { grid-template-columns: 1fr; }
      .stages { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `,
})
export class PageHeader {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  s = this.store.settings;

  stages = computed(() => {
    const current = this.s()?.current_stage ?? 1;
    return STAGES.map((label, i) => ({ label, reached: i + 1 <= current }));
  });

  edit() {
    const s = this.s();
    if (!s) return;
    this.editor.open({
      title: 'Edit timeline',
      value: { ...s, current_stage: String(s.current_stage) },
      fields: [
        { key: 'status_label', label: 'Status', type: 'text' },
        { key: 'target_build', label: 'Target build', type: 'text', placeholder: 'e.g. 3–4 years' },
        {
          key: 'current_stage',
          label: 'Current stage',
          type: 'select',
          options: STAGES.map((l, i) => ({ value: String(i + 1), label: `${i + 1} · ${l}` })),
        },
        { key: 'intro', label: 'Intro line', type: 'textarea' },
      ],
      onSave: (v) =>
        this.store.saveSettings({
          status_label: v['status_label'] as string,
          target_build: v['target_build'] as string,
          current_stage: Number(v['current_stage']),
          intro: v['intro'] as string,
        }),
    });
  }
}

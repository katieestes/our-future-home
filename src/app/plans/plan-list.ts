import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Plan, PlanTag } from '../models';
import { Icon } from '../shared/icon';
import { PLAN_FIELDS, blankPlan, planTag } from './plan-helpers';

type Filter = 'all' | PlanTag;

/** The "House Plans" page: every plan we've saved, as cards. */
@Component({
  selector: 'app-plan-list',
  imports: [RouterLink, FormsModule, Icon],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h1>House Plans</h1>
          <p>Plans we like, with our sketches and notes on what we’d change.</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="add()"><app-icon name="plus" />Add plan</button>
      </header>

      <div class="filters">
        <div class="chips" role="group" aria-label="Filter by tag">
          @for (f of filters; track f.id) {
            <button type="button" class="chip" [class.on]="filter() === f.id" (click)="filter.set(f.id)"
              [attr.aria-pressed]="filter() === f.id">
              {{ f.label }} <span class="n">{{ countFor(f.id) }}</span>
            </button>
          }
        </div>
        <label class="search">
          <app-icon name="search" [size]="15" />
          <span class="sr-only">Search plans</span>
          <input type="search" placeholder="Search plans" [ngModel]="query()" (ngModelChange)="query.set($event)" />
        </label>
      </div>

      @if (store.rows.plans().length === 0) {
        <div class="empty big">
          <p>No plans yet. Add one, then upload its floor plan images and start sketching.</p>
          <button class="btn btn-primary" type="button" (click)="add()"><app-icon name="plus" />Add your first plan</button>
        </div>
      } @else if (shown().length === 0) {
        <p class="empty">No plans match.</p>
      } @else {
        <div class="grid">
          @for (p of shown(); track p.plan.id) {
            <a class="card plan" [routerLink]="['/plans', p.plan.id]">
              <div class="cover">
                @if (p.cover) {
                  <img [src]="p.cover" alt="" loading="lazy" />
                } @else {
                  <svg viewBox="0 0 120 90" aria-hidden="true">
                    <g fill="none" stroke="#B3A898" stroke-width="1.4">
                      <rect x="10" y="10" width="100" height="70" />
                      <path d="M50 10v40M10 45h40M50 50h60M80 50v30M80 10v22" />
                    </g>
                  </svg>
                }
                @if (p.imageCount) {
                  <span class="badge">{{ p.imageCount }} {{ p.imageCount === 1 ? 'image' : 'images' }}</span>
                }
              </div>
              <div class="card-body">
                <div class="row">
                  <span class="name">{{ p.plan.name }}</span>
                  <span class="pill tag" [class]="tag(p.plan.tag).css">{{ tag(p.plan.tag).label }}</span>
                </div>
                @if (p.plan.details) { <span class="small">{{ p.plan.details }}</span> }
                <span class="small marks">
                  @if (p.marked) { <app-icon name="pen" [size]="13" /> Marked up }
                  @else if (p.imageCount) { No markup yet }
                  @else { Add images to start sketching }
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding: 24px 40px 48px; max-width: 1680px; display: flex; flex-direction: column; gap: 20px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    h1 { font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, 3.5vw, 38px); }
    .head p { margin: 4px 0 0; color: var(--text-2); }
    .filters { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border: 1px solid #e0d8cc; background: var(--surface); border-radius: 999px; padding: 6px 14px;
      font-size: 13px; color: var(--text-2); min-height: 36px; }
    .chip.on { background: var(--sage-tint); border-color: #cfd8c8; color: var(--sage-text); font-weight: 600; }
    .chip .n { color: var(--muted); font-weight: 400; margin-left: 2px; }
    .search { display: flex; align-items: center; gap: 6px; border: 1px solid #ddd4c6; border-radius: 6px;
      background: #fff; padding: 0 10px; color: var(--muted); min-height: 38px; }
    .search input { border: none; outline: none; font: inherit; font-size: 14px; width: 200px; background: transparent; }
    .search:focus-within { outline: 2px solid var(--sage); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .plan { color: var(--text); text-decoration: none; border: 1px solid transparent; transition: border-color .15s; }
    .plan:hover { text-decoration: none; border-color: #d8cfc1; }
    .cover { position: relative; height: 190px; margin: 10px 10px 0; background: var(--surface); border-radius: 6px; overflow: hidden; }
    .cover img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .cover svg { width: 100%; height: 100%; padding: 16px; }
    .badge { position: absolute; right: 8px; bottom: 8px; background: rgba(255,253,249,.94); border-radius: 5px;
      padding: 2px 8px; font-size: 12px; font-weight: 500; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .name { font-size: 15px; font-weight: 600; }
    .marks { display: inline-flex; gap: 5px; align-items: center; margin-top: 2px; }
    .big { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; }
    .big p { margin: 0; }
    @media (max-width: 860px) { .page { padding: 16px 14px 40px; } .search input { width: 140px; } }
  `,
})
export class PlanList {
  store = inject(StoreService);
  private editor = inject(EditorService);
  private router = inject(Router);
  tag = planTag;
  filter = signal<Filter>('all');
  query = signal('');

  filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorite', label: 'Favorites' },
    { id: 'revisit', label: 'Revisit' },
    { id: 'idea', label: 'Ideas' },
  ];

  private cards = computed(() => {
    const images = this.store.rows.plan_images();
    return this.store.rows.plans().map((plan) => {
      const mine = images.filter((i) => i.plan_id === plan.id);
      return {
        plan,
        cover: mine[0]?.image_url ?? plan.image_url ?? null,
        imageCount: mine.length,
        marked: mine.some((i) => i.markup?.length),
      };
    });
  });

  shown = computed(() => {
    const f = this.filter();
    const q = this.query().trim().toLowerCase();
    return this.cards().filter(
      (c) =>
        (f === 'all' || c.plan.tag === f) &&
        (!q || `${c.plan.name} ${c.plan.details ?? ''} ${c.plan.source ?? ''}`.toLowerCase().includes(q)),
    );
  });

  countFor(f: Filter) {
    const plans = this.store.rows.plans();
    return f === 'all' ? plans.length : plans.filter((p) => p.tag === f).length;
  }

  add() {
    this.editor.open({
      title: 'Add a plan',
      value: blankPlan(),
      fields: PLAN_FIELDS,
      onSave: async (v) => {
        const row = await this.store.insert('plans', v as Plan);
        if (row?.id) this.router.navigate(['/plans', row.id]);
        return !!row;
      },
    });
  }
}

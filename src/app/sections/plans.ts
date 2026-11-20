import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../services/store.service';
import { EditorService } from '../services/editor.service';
import { Plan } from '../models';
import { Icon } from '../shared/icon';
import { PLAN_FIELDS, blankPlan, planTag } from '../plans/plan-helpers';

/** Dashboard preview of the House Plans view (first few plans). */
@Component({
  selector: 'app-plans',
  imports: [Icon, RouterLink],
  template: `
    <section class="section" id="plans">
      <div class="section-head">
        <h2><app-icon name="plan" [size]="17" />House Plans &amp; Layouts</h2>
        <a routerLink="/plans" class="view-all">View all →</a>
      </div>

      @if (cards().length === 0) {
        <p class="empty">Save floor plans you like and sketch your changes on them.</p>
      } @else {
        <div class="grid">
          @for (c of cards(); track c.plan.id) {
            <a class="card" [routerLink]="['/plans', c.plan.id]">
              <div class="thumb">
                @if (c.cover) {
                  <img [src]="c.cover" alt="" loading="lazy" />
                } @else {
                  <svg viewBox="0 0 120 90" aria-hidden="true">
                    <g fill="none" stroke="#4A443D" stroke-width="1.6">
                      <rect x="10" y="10" width="100" height="70" />
                      <path d="M50 10v40M10 45h40M50 50h60M80 50v30M80 10v22" />
                    </g>
                  </svg>
                }
              </div>
              <div class="card-body">
                <span class="name">{{ c.plan.name }}</span>
                @if (c.plan.details) { <span class="small">{{ c.plan.details }}</span> }
                <div class="foot">
                  <span class="pill tag" [class]="tag(c.plan.tag).css">{{ tag(c.plan.tag).label }}</span>
                  @if (c.marked) { <span class="small mk"><app-icon name="pen" [size]="12" />Marked up</span> }
                </div>
              </div>
            </a>
          }
        </div>
      }
      <button class="add-link start" type="button" (click)="add()">+ Add plan</button>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .card { color: var(--text); text-decoration: none; }
    .card:hover { text-decoration: none; outline: 1px solid #d8cfc1; }
    .thumb { margin: 10px 10px 0; background: var(--surface); border-radius: 5px; height: 110px; overflow: hidden; }
    .thumb img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .thumb svg { width: 100%; height: 100%; padding: 6px; display: block; }
    .name { font-size: 13px; font-weight: 600; }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
    .mk { display: inline-flex; gap: 4px; align-items: center; }
    .view-all { font-size: 13px; font-weight: 500; }
    .start { align-self: flex-start; }
  `,
})
export class Plans {
  private store = inject(StoreService);
  private editor = inject(EditorService);
  private router = inject(Router);
  tag = planTag;

  cards = computed(() => {
    const images = this.store.rows.plan_images();
    return this.store.rows
      .plans()
      .slice(0, 3)
      .map((plan) => {
        const mine = images.filter((i) => i.plan_id === plan.id);
        return { plan, cover: mine[0]?.image_url ?? plan.image_url, marked: mine.some((i) => i.markup?.length) };
      });
  });

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

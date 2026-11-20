import { Component } from '@angular/core';
import { PageHeader } from './sections/page-header';
import { Finishes } from './sections/finishes';
import { DosDonts } from './sections/dos-donts';
import { InspirationGallery } from './sections/inspiration';
import { Plans } from './sections/plans';
import { CanvaDesigns } from './sections/canva-designs';
import { Costs } from './sections/costs';
import { Builders } from './sections/builders';

/** The main "Our Future Home" overview page. Route: #/ */
@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, Finishes, DosDonts, InspirationGallery, Plans, CanvaDesigns, Costs, Builders],
  template: `
    <div class="page" id="top">
      <app-page-header />
      <div class="grid">
        <app-finishes class="span-8" />
        <app-dos-donts class="span-4" />
        <app-inspiration class="span-5" />
        <app-plans class="span-4 plans" />
        <app-canva-designs class="span-3" />
        <app-costs class="span-6" />
        <app-builders class="span-6" />
      </div>
    </div>
  `,
  styles: `
    .page { padding: 24px 40px 48px; display: flex; flex-direction: column; gap: 20px; max-width: 1680px; }
    /* 12-column dashboard grid. Each section gets a span class. */
    .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
    .grid > * { display: flex; flex-direction: column; min-width: 0; }
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-6 { grid-column: span 6; }
    .span-8 { grid-column: span 8; }
    @media (max-width: 1280px) {
      .span-8, .span-4, .span-3 { grid-column: span 12; }
      .span-5 { grid-column: span 7; }
      .span-4.plans { grid-column: span 5; }
    }
    @media (max-width: 1100px) {
      .span-5, .span-6, .span-4.plans { grid-column: span 12; }
    }
    @media (max-width: 860px) { .page { padding: 16px 14px 40px; } }
  `,
})
export class Dashboard {}

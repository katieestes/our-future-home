import { Routes } from '@angular/router';
import { Dashboard } from './dashboard';
import { PlanList } from './plans/plan-list';
import { PlanDetail } from './plans/plan-detail';

// URLs look like  .../our-future-home/#/plans/abc-123
// (the # keeps GitHub Pages happy, since it can't redirect unknown paths to index.html)
export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Our Future Home' },
  { path: 'plans', component: PlanList, title: 'House Plans · Our Future Home' },
  { path: 'plans/:id', component: PlanDetail, title: 'Plan · Our Future Home' },
  { path: '**', redirectTo: '' },
];

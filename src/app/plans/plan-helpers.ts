import { Plan, PlanTag } from '../models';
import { FieldDef } from '../services/editor.service';

export const PLAN_TAGS: Record<PlanTag, { label: string; css: string }> = {
  favorite: { label: '★ Favorite', css: 'pill-sage' },
  revisit: { label: 'Revisit', css: 'pill-clay' },
  idea: { label: 'Idea', css: 'pill-neutral' },
};

export const planTag = (t: PlanTag) => PLAN_TAGS[t] ?? PLAN_TAGS.idea;

/** Form fields for adding/editing a plan's basic info (images are managed on the plan page). */
export const PLAN_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Plan name', type: 'text', required: true },
  { key: 'details', label: 'Details', type: 'text', placeholder: 'e.g. 1 story · 4 bed · 3 bath' },
  {
    key: 'tag', label: 'Tag', type: 'select',
    options: [
      { value: 'favorite', label: 'Favorite' },
      { value: 'revisit', label: 'Revisit' },
      { value: 'idea', label: 'Idea' },
    ],
  },
  { key: 'source', label: 'Designer / source', type: 'text', placeholder: 'Where the plan is from' },
  { key: 'link_url', label: 'Link to plan', type: 'url', placeholder: 'https://' },
];

export const blankPlan = (): Plan => ({ name: '', tag: 'idea' });

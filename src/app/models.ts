// Shapes of the rows stored in Supabase. One interface per table.

export interface Finish {
  id?: string;
  category: string;
  name: string;
  note?: string | null;
  source_url?: string | null;
  swatch_color?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export type PlanTag = 'favorite' | 'revisit' | 'idea';

export interface Plan {
  id?: string;
  name: string;
  details?: string | null;
  tag: PlanTag;
  link_url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface DoDont {
  id?: string;
  kind: 'do' | 'dont';
  text: string;
  sort_order?: number;
}

export interface Inspiration {
  id?: string;
  title: string;
  room?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface CanvaDesign {
  id?: string;
  title: string;
  url?: string | null;
  thumbnail_url?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface Cost {
  id?: string;
  category: string;
  estimate?: number | null;
  source?: string | null;
  notes?: string | null;
  is_diy: boolean;
  sort_order?: number;
}

export interface Builder {
  id?: string;
  name: string;
  service_area?: string | null;
  strengths?: string | null;
  questions?: string | null;
  est_pricing?: string | null;
  website?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface Settings {
  id: 1;
  intro: string;
  target_build: string;
  status_label: string;
  current_stage: number;
}

/** Map of table name -> row type. Lets the store stay generic but typed. */
export interface Tables {
  finishes: Finish;
  plans: Plan;
  dos_donts: DoDont;
  inspiration: Inspiration;
  canva_designs: CanvaDesign;
  costs: Cost;
  builders: Builder;
}
export type TableName = keyof Tables;

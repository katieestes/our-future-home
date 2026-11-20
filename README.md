# Our Future Home 🏡

A shared planning hub for our future house: finishes we love, house plans, do's & don'ts,
inspiration photos, Canva links, a budget table and a builder comparison.

- **Live site:** https://katieestes.github.io/our-future-home/
- **Frontend:** Angular 20 (standalone components + signals), hosted on GitHub Pages
- **Backend:** Supabase (Postgres database, sign-in, and photo storage)

## How it fits together

```
Browser (Angular app on GitHub Pages)
   │  signs in + reads/writes rows with the publishable key
   ▼
Supabase project "Our Future Home"
   ├─ Auth           – email + password accounts
   ├─ Database       – one table per section, protected by Row Level Security
   └─ Storage        – "images" bucket for uploaded photos
```

Only emails listed in the `household_members` table can read or write anything.
The **first** person to sign up becomes a member automatically; after that, add
people from **Household** in the sidebar.

## Project layout

| Path | What it is |
| --- | --- |
| `src/app/app.html` / `app.ts` | Page shell: sign-in states, sidebar, dashboard grid |
| `src/app/app.routes.ts` | Pages: `#/` dashboard, `#/plans` list, `#/plans/:id` one plan |
| `src/app/dashboard.ts` | The overview page (grid of sections) |
| `src/app/sections/` | One component per dashboard section |
| `src/app/plans/plan-list.ts` | House Plans page (cards, filters, search) |
| `src/app/plans/plan-detail.*` | One plan: image strip, drawing area, notes |
| `src/app/plans/markup/markup-editor.*` | The drawing tool (pen, highlighter, arrow, box, text, eraser, zoom) |
| `src/app/plans/markup/draw.ts` | Pure drawing math: render strokes, eraser hit-testing, PNG export |
| `src/app/shared/edit-dialog.ts` | The single add/edit form every section reuses |
| `src/app/services/store.service.ts` | Loads and saves data (signals + Supabase) |
| `src/app/services/supabase.service.ts` | Supabase client + who's signed in |
| `src/app/models.ts` | TypeScript shapes of each table |
| `src/styles.css` | Colors, buttons, cards, tables (edit the `:root` variables to retheme) |
| `supabase/schema.sql` | Database tables and security rules (for reference) |
| `.github/workflows/deploy.yml` | Builds and deploys to GitHub Pages on every push to `main` |

## House Plans drawing tool

Each plan can have several images (main floor, upstairs, option B…). Drawings are saved as
*strokes* (JSON) in `plan_images.markup` — not baked into the picture — so the original plan is
never changed and you can hide, undo or erase marks any time.

- **Tools:** Pen (P), Highlighter (H), Arrow (A), Box (B), Text (T), Eraser (E), Move (M). Undo: Ctrl/Cmd+Z.
- **Apple Pencil:** pressure changes line width. Turn on **Pencil only** so fingers scroll and pinch-zoom instead of drawing.
- **Full screen** button gives the whole iPad screen to the plan.
- **Download** saves a PNG of the plan with your marks.
- Coordinates are stored as fractions of the image width, so marks stay lined up at any zoom or screen size.

## Staying within the free plan

- **Photos are shrunk before upload** (`src/app/services/shrink-image.ts`): longest side 2400 px, JPEG 85%.
  A typical phone photo goes from ~3–5 MB to ~300–600 KB. Change `MAX_SIDE` / `QUALITY` there if needed.
- **Storage meter:** open **Household** in the sidebar to see how much of the 1 GB photo storage is used.
- **Keep-alive:** `.github/workflows/keep-alive.yml` pings Supabase twice a week so the free project
  isn't paused for inactivity. You can also run it by hand: GitHub → Actions → "Keep Supabase awake" → Run workflow.

## Adding a new field to a section (example: "price" on Finishes)

1. In Supabase → SQL editor: `alter table finishes add column price text;`
2. Add `price?: string | null;` to the `Finish` interface in `src/app/models.ts`.
3. Add `{ key: 'price', label: 'Price', type: 'text' }` to the `fields` list in `src/app/sections/finishes.ts`.
4. Show it in that component's template, e.g. `{{ f.price }}`.

## Running locally

```bash
npm install
npm start          # http://localhost:4200
```

Deploys happen automatically when you push to `main`.

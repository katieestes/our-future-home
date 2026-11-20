import { Component, input, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

// Simple stroke icons. Add a new one by adding its SVG path(s) here.
const ICONS: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  plan: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h8M11 3v13M15 12h6M11 16v5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/>',
  budget: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  builder: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c1.8.6 3 2 3.5 5"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  highlighter: '<path d="M6 15l9-9 4 4-9 9H6z"/><path d="M4 21h8"/>',
  arrow: '<path d="M5 19L19 5"/><path d="M10 5h9v9"/>',
  box: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  eraser: '<path d="M8 20h12"/><path d="M4 15l9-9 6 6-7 7H8z"/>',
  move: '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  pencil: '<path d="M15 4l5 5L9 20H4v-5z"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5"/><path d="M5 20h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};

@Component({
  selector: 'app-icon',
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    [attr.stroke-width]="stroke()"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    [innerHTML]="paths()"
  ></svg>`,
  styles: `:host { display: inline-flex; flex-shrink: 0; } svg { display: block; }`,
})
export class Icon {
  name = input.required<string>();
  size = input(16);
  stroke = input(1.8);
  private sanitizer = inject(DomSanitizer);
  // Safe: the markup comes only from the constant ICONS map above, never from user data.
  paths = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''));
}

import {
  AfterViewInit, Component, ElementRef, OnDestroy, effect, input, output, signal, untracked, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Stroke, StrokeTool } from '../../models';
import { COLORS, SIZES, drawStroke, exportPng, hitTest } from './draw';
import { Icon } from '../../shared/icon';

type Tool = StrokeTool | 'eraser' | 'pan';

const TOOLS: { id: Tool; label: string; key: string; icon: string }[] = [
  { id: 'pen', label: 'Pen', key: 'P', icon: 'pen' },
  { id: 'highlighter', label: 'Highlighter', key: 'H', icon: 'highlighter' },
  { id: 'arrow', label: 'Arrow', key: 'A', icon: 'arrow' },
  { id: 'rect', label: 'Box', key: 'B', icon: 'box' },
  { id: 'text', label: 'Text note', key: 'T', icon: 'text' },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: 'eraser' },
  { id: 'pan', label: 'Move / scroll', key: 'M', icon: 'move' },
];

/**
 * Draw on top of a plan image with a mouse, finger, or Apple Pencil.
 *
 *   <app-markup-editor [imageUrl]="url" [strokes]="saved" (strokesChange)="save($event)" />
 *
 * The parent owns saving; this component just emits the new list after every change.
 */
@Component({
  selector: 'app-markup-editor',
  imports: [FormsModule, Icon],
  templateUrl: './markup-editor.html',
  styleUrl: './markup-editor.css',
  host: { '(document:keydown)': 'onKey($event)', '[class.full]': 'fullscreen()' },
})
export class MarkupEditor implements AfterViewInit, OnDestroy {
  imageUrl = input.required<string>();
  strokes = input<Stroke[]>([]);
  downloadName = input('plan-markup');
  strokesChange = output<Stroke[]>();

  readonly tools = TOOLS;
  readonly colors = COLORS;
  tool = signal<Tool>('pen');
  color = signal(COLORS[0].value);
  size = signal<0 | 1 | 2>(1);
  zoom = signal(1);
  showMarkup = signal(true);
  pencilOnly = signal(false);
  fullscreen = signal(false);
  canUndo = signal(false);
  canRedo = signal(false);
  count = signal(0);
  message = signal<string | null>(null);
  textDraft = signal<{ x: number; y: number } | null>(null);
  textValue = '';

  private viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private wrap = viewChild.required<ElementRef<HTMLDivElement>>('wrap');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private img = viewChild.required<ElementRef<HTMLImageElement>>('img');
  private textInput = viewChild<ElementRef<HTMLInputElement>>('textInput');

  // Working state (plain fields, not signals, because they change on every pointer move)
  private local: Stroke[] = [];
  private undoStack: Stroke[][] = [];
  private redoStack: Stroke[][] = [];
  private current: Stroke | null = null;
  private lastEmitted: Stroke[] | null = null;
  private lastImage = '';
  private W = 0; // drawn width in CSS px
  private H = 0;
  private dpr = 1;
  private frame = 0;
  private resizeObs?: ResizeObserver;
  private erasedThisGesture = false;
  private erasing = false;
  private panning: { id: number; x: number; y: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; zoom: number } | null = null;

  constructor() {
    // When the parent gives us a different image (or new saved strokes), load them.
    effect(() => {
      const url = this.imageUrl();
      const incoming = this.strokes() ?? [];
      untracked(() => {
        if (url !== this.lastImage) {
          this.lastImage = url;
          this.undoStack = [];
          this.redoStack = [];
          this.local = incoming;
          this.cancelText();
        } else if (incoming !== this.lastEmitted) {
          this.local = incoming;
        }
        this.syncFlags();
        this.requestDraw();
      });
    });
  }

  ngAfterViewInit() {
    this.resizeObs = new ResizeObserver(() => this.layout());
    this.resizeObs.observe(this.viewport().nativeElement);
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    this.resizeObs?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  // ---------- sizing ----------

  onImageLoad() {
    this.layout();
  }

  /** Fit the image inside the viewport, then apply zoom, then size the canvas to match. */
  layout() {
    const img = this.img().nativeElement;
    const vp = this.viewport().nativeElement;
    if (!img.naturalWidth) return;
    const ratio = img.naturalHeight / img.naturalWidth;
    const fitW = Math.min(vp.clientWidth - 24, (vp.clientHeight - 24) / ratio);
    this.W = Math.max(fitW, 100) * this.zoom();
    this.H = this.W * ratio;
    this.dpr = window.devicePixelRatio || 1;

    const wrap = this.wrap().nativeElement;
    wrap.style.width = `${this.W}px`;
    wrap.style.height = `${this.H}px`;
    const c = this.canvas().nativeElement;
    c.width = Math.round(this.W * this.dpr);
    c.height = Math.round(this.H * this.dpr);
    this.draw();
  }

  setZoom(z: number) {
    const vp = this.viewport().nativeElement;
    // keep the middle of the view in the middle while zooming
    const cx = (vp.scrollLeft + vp.clientWidth / 2) / (this.W || 1);
    const cy = (vp.scrollTop + vp.clientHeight / 2) / (this.W || 1);
    this.zoom.set(Math.min(4, Math.max(0.5, Math.round(z * 100) / 100)));
    this.layout();
    vp.scrollLeft = cx * this.W - vp.clientWidth / 2;
    vp.scrollTop = cy * this.W - vp.clientHeight / 2;
  }

  // ---------- drawing ----------

  private requestDraw() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.draw());
  }

  private draw() {
    const c = this.canvas()?.nativeElement;
    if (!c || !this.W) return;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (!this.showMarkup()) return;
    for (const s of this.local) drawStroke(ctx, s, this.W);
    if (this.current) drawStroke(ctx, this.current, this.W);
  }

  // ---------- pointer input ----------

  /** Pointer position as fractions of the image width. */
  private toNorm(e: PointerEvent): [number, number] {
    const r = this.canvas().nativeElement.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width];
  }

  private pressure(e: PointerEvent): number {
    return e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5;
  }

  onPointerDown(e: PointerEvent) {
    if (this.textDraft()) this.commitText();
    try {
      // keep receiving moves even if the pencil slides off the canvas
      this.canvas().nativeElement.setPointerCapture(e.pointerId);
    } catch {
      /* capture isn't available for this pointer — drawing still works */
    }

    if (e.pointerType === 'touch') {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.touches.size === 2) {
        // second finger down → pinch to zoom; throw away any half-drawn stroke
        this.current = null;
        this.panning = null;
        const [a, b] = [...this.touches.values()];
        this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom() };
        this.requestDraw();
        return;
      }
    }

    const panMode = this.tool() === 'pan' || (e.pointerType === 'touch' && this.pencilOnly());
    if (panMode) {
      this.panning = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }
    if (!this.showMarkup()) this.showMarkup.set(true);

    const [x, y] = this.toNorm(e);
    const tool = this.tool();
    if (tool === 'eraser') {
      this.erasing = true;
      this.erasedThisGesture = false;
      this.eraseAt(x, y);
      return;
    }
    if (tool === 'text') return; // placed on pointer up
    if (tool === 'pan') return;

    const size = SIZES[tool][this.size()];
    const pr = this.pressure(e);
    this.current = {
      id: crypto.randomUUID(),
      tool,
      color: this.color(),
      size,
      points: tool === 'arrow' || tool === 'rect' ? [x, y, pr, x, y, pr] : [x, y, pr],
    };
    this.requestDraw();
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.touches.size === 2) {
        const [a, b] = [...this.touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        this.setZoom(this.pinch.zoom * (dist / this.pinch.dist));
        return;
      }
    }

    if (this.panning && this.panning.id === e.pointerId) {
      const vp = this.viewport().nativeElement;
      vp.scrollLeft -= e.clientX - this.panning.x;
      vp.scrollTop -= e.clientY - this.panning.y;
      this.panning = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }

    // getCoalescedEvents gives every Apple Pencil sample, not just one per frame → smoother lines
    const events = e.getCoalescedEvents?.().length ? e.getCoalescedEvents() : [e];

    if (this.erasing) {
      for (const ev of events) this.eraseAt(...this.toNorm(ev));
      return;
    }
    if (!this.current) return;

    const p = this.current.points;
    if (this.current.tool === 'arrow' || this.current.tool === 'rect') {
      const [x, y] = this.toNorm(e);
      p[3] = x;
      p[4] = y;
    } else {
      for (const ev of events) {
        const [x, y] = this.toNorm(ev);
        const lx = p[p.length - 3];
        const ly = p[p.length - 2];
        // skip points that barely moved (keeps saved data small)
        if (Math.hypot(x - lx, y - ly) * this.W < 1.5) continue;
        p.push(x, y, this.pressure(ev));
      }
    }
    this.requestDraw();
  }

  onPointerUp(e: PointerEvent) {
    this.touches.delete(e.pointerId);
    if (this.touches.size < 2) this.pinch = null;
    if (this.panning?.id === e.pointerId) {
      this.panning = null;
      return;
    }

    if (this.erasing) {
      this.erasing = false;
      if (this.erasedThisGesture) this.emit();
      return;
    }

    if (this.tool() === 'text' && e.type === 'pointerup') {
      const [x, y] = this.toNorm(e);
      this.textValue = '';
      this.textDraft.set({ x, y });
      setTimeout(() => this.textInput()?.nativeElement.focus());
      return;
    }

    const s = this.current;
    this.current = null;
    if (!s) return;
    if ((s.tool === 'arrow' || s.tool === 'rect') && Math.hypot(s.points[3] - s.points[0], s.points[4] - s.points[1]) * this.W < 4) {
      this.requestDraw(); // too small to be intentional
      return;
    }
    this.commit([...this.local, s]);
  }

  private eraseAt(x: number, y: number) {
    const tol = 10 / this.W; // ~10 screen pixels
    const hits = this.local.filter((s) => hitTest(s, x, y, tol));
    if (!hits.length) return;
    if (!this.erasedThisGesture) {
      this.pushUndo();
      this.erasedThisGesture = true;
    }
    this.local = this.local.filter((s) => !hits.includes(s));
    this.syncFlags();
    this.requestDraw();
  }

  // ---------- text notes ----------

  textLeft() {
    return (this.textDraft()?.x ?? 0) * this.W;
  }
  textTop() {
    return (this.textDraft()?.y ?? 0) * this.W;
  }
  textFontPx() {
    return SIZES.text[this.size()] * this.W;
  }

  commitText() {
    const d = this.textDraft();
    const text = this.textValue.trim();
    this.textDraft.set(null);
    if (!d || !text) return;
    this.commit([
      ...this.local,
      { id: crypto.randomUUID(), tool: 'text', color: this.color(), size: SIZES.text[this.size()], points: [d.x, d.y, 1], text },
    ]);
  }

  cancelText() {
    this.textDraft.set(null);
    this.textValue = '';
  }

  // ---------- history ----------

  private pushUndo() {
    this.undoStack.push(this.local);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
  }

  private commit(next: Stroke[]) {
    this.pushUndo();
    this.local = next;
    this.emit();
  }

  private emit() {
    this.lastEmitted = this.local;
    this.strokesChange.emit(this.local);
    this.syncFlags();
    this.requestDraw();
  }

  private syncFlags() {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
    this.count.set(this.local.length);
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.local);
    this.local = prev;
    this.emit();
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.local);
    this.local = next;
    this.emit();
  }

  clearAll() {
    if (!this.local.length) return;
    if (!confirm('Erase all markup on this image? You can undo this.')) return;
    this.commit([]);
  }

  toggleMarkup() {
    this.showMarkup.update((v) => !v);
    this.requestDraw();
  }

  toggleFullscreen() {
    this.fullscreen.update((v) => !v);
    document.body.style.overflow = this.fullscreen() ? 'hidden' : '';
    // the ResizeObserver re-fits the image once the new size applies
  }

  async download() {
    try {
      await exportPng(this.imageUrl(), this.local, this.downloadName());
    } catch {
      this.message.set('Couldn’t export this image — the site it came from blocks it. Upload the image file instead.');
      setTimeout(() => this.message.set(null), 6000);
    }
  }

  // ---------- keyboard shortcuts (ignored while typing) ----------

  onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('app-edit-dialog .dialog')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (e.key === 'Escape' && this.fullscreen()) {
      this.toggleFullscreen();
      return;
    }
    if (mod || e.altKey) return;
    const tool = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (tool) this.tool.set(tool.id);
  }
}

import { Stroke, StrokeTool } from '../../models';

/**
 * Pure drawing helpers for plan markups (no Angular here).
 * Every function takes W = the width in pixels the image is drawn at,
 * because stroke coordinates are stored as fractions of the width.
 */

/** Line width / font size for Small, Medium, Large, as a fraction of image width. */
export const SIZES: Record<StrokeTool, [number, number, number]> = {
  pen: [0.0025, 0.005, 0.01],
  arrow: [0.0025, 0.005, 0.01],
  rect: [0.0025, 0.005, 0.01],
  highlighter: [0.012, 0.022, 0.035],
  text: [0.016, 0.024, 0.036],
};

export const COLORS = [
  { name: 'Red', value: '#D23F2F' },
  { name: 'Clay', value: '#B85F3F' },
  { name: 'Blue', value: '#2F6FD2' },
  { name: 'Green', value: '#3E8E4E' },
  { name: 'Yellow', value: '#E8B520' },
  { name: 'Charcoal', value: '#2E2A26' },
];

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, W: number): void {
  const p = s.points;
  if (p.length < 3) return;
  const base = Math.max(s.size * W, 1);
  const X = (i: number) => p[i] * W;
  const Y = (i: number) => p[i + 1] * W;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;

  switch (s.tool) {
    case 'pen': {
      if (p.length === 3) {
        // a single tap = a dot
        ctx.beginPath();
        ctx.arc(X(0), Y(0), (base * widthFor(p[2])) / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      // Draw segment by segment so Apple Pencil pressure can vary the width.
      for (let i = 3; i < p.length; i += 3) {
        ctx.lineWidth = base * widthFor((p[i - 1] + p[i + 2]) / 2);
        ctx.beginPath();
        ctx.moveTo(X(i - 3), Y(i - 3));
        ctx.lineTo(X(i), Y(i));
        ctx.stroke();
      }
      break;
    }
    case 'highlighter': {
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = base;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (let i = 3; i < p.length; i += 3) ctx.lineTo(X(i), Y(i));
      if (p.length === 3) ctx.lineTo(X(0) + 0.1, Y(0));
      ctx.stroke();
      break;
    }
    case 'arrow': {
      const [x1, y1, x2, y2] = [X(0), Y(0), X(3), Y(3)];
      ctx.lineWidth = base;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = Math.max(base * 4.5, 10);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
      ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rect': {
      ctx.lineWidth = base;
      const x = Math.min(X(0), X(3));
      const y = Math.min(Y(0), Y(3));
      ctx.strokeRect(x, y, Math.abs(X(3) - X(0)), Math.abs(Y(3) - Y(0)));
      break;
    }
    case 'text': {
      ctx.font = `600 ${base}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      // white outline so notes stay readable on top of busy floor plans
      ctx.lineWidth = Math.max(base * 0.28, 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeText(s.text ?? '', X(0), Y(0));
      ctx.fillText(s.text ?? '', X(0), Y(0));
      break;
    }
  }
  ctx.restore();
}

/** Pressure (0–1) → width multiplier. Mouse always reports 0.5. */
function widthFor(pressure: number): number {
  return 0.35 + pressure * 1.3;
}

/** Is point (px, py) within `tol` of this stroke? All values are width-fractions. */
export function hitTest(s: Stroke, px: number, py: number, tol: number): boolean {
  const p = s.points;
  const t = tol + s.size / 2;
  if (s.tool === 'text') {
    const w = (s.text?.length ?? 1) * s.size * 0.58;
    return px >= p[0] - tol && px <= p[0] + w + tol && py >= p[1] - tol && py <= p[1] + s.size * 1.2 + tol;
  }
  if (s.tool === 'rect') {
    const [x1, y1, x2, y2] = [p[0], p[1], p[3], p[4]];
    return (
      distToSeg(px, py, x1, y1, x2, y1) < t ||
      distToSeg(px, py, x2, y1, x2, y2) < t ||
      distToSeg(px, py, x2, y2, x1, y2) < t ||
      distToSeg(px, py, x1, y2, x1, y1) < t
    );
  }
  if (p.length === 3) return Math.hypot(px - p[0], py - p[1]) < t;
  for (let i = 3; i < p.length; i += 3) {
    if (distToSeg(px, py, p[i - 3], p[i - 2], p[i], p[i + 1]) < t) return true;
  }
  return false;
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Draws the image plus all strokes at full resolution and downloads it as a PNG. */
export async function exportPng(imageUrl: string, strokes: Stroke[], fileName: string): Promise<void> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const url = new URL(imageUrl, window.location.href);
  if (url.protocol.startsWith('http')) url.searchParams.set('export', '1'); // avoid a cached copy without CORS headers
  img.src = url.toString();
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  for (const s of strokes) drawStroke(ctx, s, canvas.width);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create image');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace(/[^\w\- ]+/g, '').trim() + '.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

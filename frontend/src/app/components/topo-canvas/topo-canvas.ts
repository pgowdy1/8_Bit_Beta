import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { RouteStore } from '../../state/route-store';
import { Route } from '../../models/route.model';
import { hitTest } from '../../rendering/hit-detection';
import { computeLogicalHeight, LOGICAL_WIDTH } from '../../rendering/layout';
import {
  FULLY_RENDERED,
  RenderProgress,
  renderScene,
} from '../../rendering/wall-renderer';

// Device pixels per logical pixel. Responsive: the largest integer scale
// that fits the viewport width (integer keeps the pixel art crisp and even).
const MIN_DISPLAY_SCALE = 2;
const MAX_DISPLAY_SCALE = 8;
const VIEWPORT_MARGIN_PX = 16;
const PITCH_ANIMATION_MS = 220;

@Component({
  selector: 'app-topo-canvas',
  templateUrl: './topo-canvas.html',
  styleUrl: './topo-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoCanvas implements OnDestroy {
  protected readonly store = inject(RouteStore);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  private rafId: number | null = null;
  private animStartMs = 0;
  private currentProgress: RenderProgress = { ...FULLY_RENDERED };
  private lastRouteRef: unknown = null;

  constructor() {
    effect(() => {
      const route = this.store.route();
      const canvas = this.canvasRef().nativeElement;
      this.resizeCanvasFor(canvas, route);
      if (route !== this.lastRouteRef) {
        this.lastRouteRef = route;
        this.startAnimation();
      } else {
        this.drawOnce();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  replay(): void {
    this.startAnimation();
  }

  exportPng(): void {
    const url = this.canvasRef().nativeElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = '8bit-beta-topo.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  @HostListener('window:resize')
  onResize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.resizeCanvasFor(canvas, this.store.route());
    this.drawOnce();
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const idx = hitTest(this.store.route(), rect.width, rect.height, x, y);
    if (idx !== null) this.store.selectPitch(idx);
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const idx = hitTest(this.store.route(), rect.width, rect.height, x, y);
    canvas.style.cursor = idx === null ? 'crosshair' : 'pointer';
  }

  private displayScale = MIN_DISPLAY_SCALE;

  private resizeCanvasFor(canvas: HTMLCanvasElement, route: Route): void {
    const available =
      (canvas.parentElement?.clientWidth ?? LOGICAL_WIDTH * MIN_DISPLAY_SCALE) -
      VIEWPORT_MARGIN_PX;
    this.displayScale = Math.min(
      MAX_DISPLAY_SCALE,
      Math.max(MIN_DISPLAY_SCALE, Math.floor(available / LOGICAL_WIDTH))
    );
    const logicalHeight = computeLogicalHeight(route);
    canvas.width = LOGICAL_WIDTH * this.displayScale;
    canvas.height = logicalHeight * this.displayScale;
    canvas.style.width = `${LOGICAL_WIDTH * this.displayScale}px`;
    canvas.style.height = `${logicalHeight * this.displayScale}px`;
  }

  private startAnimation(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.animStartMs = performance.now();
    this.currentProgress = { pitchIndex: 0, fraction: 0 };
    this.tick();
  }

  private tick = (): void => {
    const elapsed = performance.now() - this.animStartMs;
    const pitchCount = this.store.pitchCount();
    if (pitchCount === 0) {
      this.currentProgress = { ...FULLY_RENDERED };
      this.drawOnce();
      this.rafId = null;
      return;
    }

    const totalIndex = elapsed / PITCH_ANIMATION_MS;
    const idx = Math.floor(totalIndex);
    const frac = totalIndex - idx;

    if (idx >= pitchCount) {
      this.currentProgress = { ...FULLY_RENDERED };
      this.drawOnce();
      this.rafId = null;
      return;
    }

    this.currentProgress = { pitchIndex: idx, fraction: frac };
    this.drawOnce();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private drawOnce(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(this.displayScale, this.displayScale);
    renderScene(ctx, this.store.route(), this.currentProgress);
    ctx.restore();
  }
}

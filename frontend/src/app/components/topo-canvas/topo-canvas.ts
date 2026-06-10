import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
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

// Device pixels per logical pixel. Fit the WHOLE scene to the viewport
// (both dimensions) at the largest integer scale; integer keeps pixels even.
// Very tall routes fall back to the minimum scale and scroll.
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

  // The canvas renders a snapshot of the route, NOT the live form state.
  // Edits accumulate in the store; pressing Replay syncs the snapshot and
  // plays the draw animation. This stops the scene re-animating on every
  // keystroke while pitch fields are being edited.
  protected readonly displayedRoute = signal<Route>(this.store.route());
  protected readonly canvasStale = computed(() => this.displayedRoute() !== this.store.route());

  private rafId: number | null = null;
  private animStartMs = 0;
  private currentProgress: RenderProgress = { ...FULLY_RENDERED };
  private lastRouteRef: unknown = null;

  constructor() {
    effect(() => {
      const route = this.displayedRoute();
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
    if (this.canvasStale()) {
      // Sync the snapshot; the effect sees the new reference and animates.
      this.displayedRoute.set(this.store.route());
    } else {
      this.startAnimation();
    }
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
    this.resizeCanvasFor(canvas, this.displayedRoute());
    this.drawOnce();
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Hit-test against the displayed snapshot so clicks match the pixels;
    // guard the index in case pitches were removed since the last Replay.
    const idx = hitTest(this.displayedRoute(), rect.width, rect.height, x, y);
    if (idx !== null && idx < this.store.route().pitches.length) {
      this.store.selectPitch(idx);
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const idx = hitTest(this.displayedRoute(), rect.width, rect.height, x, y);
    canvas.style.cursor = idx === null ? 'crosshair' : 'pointer';
  }

  private displayScale = MIN_DISPLAY_SCALE;

  private resizeCanvasFor(canvas: HTMLCanvasElement, route: Route): void {
    const logicalHeight = computeLogicalHeight(route);
    const viewport = canvas.parentElement;
    const availW = (viewport?.clientWidth ?? LOGICAL_WIDTH * MIN_DISPLAY_SCALE) - VIEWPORT_MARGIN_PX;
    const availH = (viewport?.clientHeight ?? logicalHeight * MIN_DISPLAY_SCALE) - VIEWPORT_MARGIN_PX;
    const fit = Math.min(
      Math.floor(availW / LOGICAL_WIDTH),
      Math.floor(availH / logicalHeight)
    );
    this.displayScale = Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, fit));
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
    const pitchCount = this.displayedRoute().pitches.length;
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
    renderScene(ctx, this.displayedRoute(), this.currentProgress);
    ctx.restore();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouteStore } from '../../state/route-store';

const CHARS_PER_TICK = 2;
const TICK_MS = 30;

@Component({
  selector: 'app-nes-dialog',
  templateUrl: './nes-dialog.html',
  styleUrl: './nes-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NesDialog implements OnDestroy {
  protected readonly store = inject(RouteStore);

  private readonly fullText = computed(() => this.store.selectedPitch()?.description ?? '');
  private readonly revealed = signal(0);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly visible = computed(() => this.store.selectedPitchIndex() !== null);
  protected readonly pitchNumber = computed(() => {
    const i = this.store.selectedPitchIndex();
    return i === null ? '' : `P${i + 1}`;
  });
  protected readonly displayedText = computed(() =>
    this.fullText().slice(0, this.revealed())
  );
  protected readonly typingDone = computed(() => this.revealed() >= this.fullText().length);

  constructor() {
    effect(() => {
      this.store.selectedPitchIndex();
      this.revealed.set(0);
      this.startTyping();
    });
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearTimeout(this.timer);
  }

  protected close(): void {
    this.store.clearSelection();
  }

  protected skipTyping(): void {
    this.revealed.set(this.fullText().length);
    this.stopTimer();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected nextOrClose(): void {
    if (!this.typingDone()) {
      this.skipTyping();
      return;
    }
    this.close();
  }

  protected moves() {
    return this.store.selectedPitch()?.moves ?? [];
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.visible()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.nextOrClose();
    }
  }

  private startTyping(): void {
    this.stopTimer();
    if (!this.visible()) return;
    this.scheduleTick();
  }

  private scheduleTick(): void {
    this.timer = setTimeout(() => {
      const len = this.fullText().length;
      this.revealed.update((v) => Math.min(len, v + CHARS_PER_TICK));
      if (this.revealed() < len) {
        this.scheduleTick();
      } else {
        this.timer = null;
      }
    }, TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

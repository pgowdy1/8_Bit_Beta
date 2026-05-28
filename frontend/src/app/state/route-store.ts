import { Injectable, computed, signal } from '@angular/core';
import { Move, Pitch, Route, emptyPitch, seedRoute } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteStore {
  readonly route = signal<Route>(seedRoute());
  readonly selectedPitchIndex = signal<number | null>(null);

  readonly pitchCount = computed(() => this.route().pitches.length);
  readonly totalLengthFt = computed(() =>
    this.route().pitches.reduce((sum, p) => sum + (p.lengthFt || 0), 0)
  );
  readonly selectedPitch = computed(() => {
    const i = this.selectedPitchIndex();
    return i === null ? null : this.route().pitches[i] ?? null;
  });

  setRouteName(name: string): void {
    this.route.update((r) => ({ ...r, name }));
  }

  setFeatureName(featureName: string): void {
    this.route.update((r) => ({ ...r, featureName }));
  }

  addPitch(): void {
    this.route.update((r) => ({ ...r, pitches: [...r.pitches, emptyPitch()] }));
  }

  removePitch(index: number): void {
    this.route.update((r) => ({
      ...r,
      pitches: r.pitches.filter((_, i) => i !== index),
    }));
    const sel = this.selectedPitchIndex();
    if (sel !== null && sel >= this.route().pitches.length) {
      this.selectedPitchIndex.set(null);
    }
  }

  updatePitch(index: number, patch: Partial<Pitch>): void {
    this.route.update((r) => ({
      ...r,
      pitches: r.pitches.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  addMove(pitchIndex: number, move: Move): void {
    this.route.update((r) => ({
      ...r,
      pitches: r.pitches.map((p, i) =>
        i === pitchIndex ? { ...p, moves: [...(p.moves ?? []), move] } : p
      ),
    }));
  }

  removeMove(pitchIndex: number, moveIndex: number): void {
    this.route.update((r) => ({
      ...r,
      pitches: r.pitches.map((p, i) =>
        i === pitchIndex
          ? { ...p, moves: (p.moves ?? []).filter((_, mi) => mi !== moveIndex) }
          : p
      ),
    }));
  }

  updateMove(pitchIndex: number, moveIndex: number, patch: Partial<Move>): void {
    this.route.update((r) => ({
      ...r,
      pitches: r.pitches.map((p, i) =>
        i === pitchIndex
          ? {
              ...p,
              moves: (p.moves ?? []).map((m, mi) => (mi === moveIndex ? { ...m, ...patch } : m)),
            }
          : p
      ),
    }));
  }

  selectPitch(index: number | null): void {
    if (index === null) {
      this.selectedPitchIndex.set(null);
      return;
    }
    if (index < 0 || index >= this.route().pitches.length) return;
    this.selectedPitchIndex.set(index);
  }

  clearSelection(): void {
    this.selectedPitchIndex.set(null);
  }
}

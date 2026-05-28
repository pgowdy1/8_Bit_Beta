import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouteStore } from '../../state/route-store';
import { Move } from '../../models/route.model';

@Component({
  selector: 'app-route-form',
  templateUrl: './route-form.html',
  styleUrl: './route-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteForm {
  protected readonly store = inject(RouteStore);
  protected readonly expandedPitch = signal<number | null>(0);

  onRouteNameInput(value: string): void {
    this.store.setRouteName(value);
  }

  onFeatureNameInput(value: string): void {
    this.store.setFeatureName(value);
  }

  onPitchFieldInput(index: number, field: 'grade' | 'description', value: string): void {
    this.store.updatePitch(index, { [field]: value });
  }

  onPitchLengthInput(index: number, value: string): void {
    const n = Number(value);
    this.store.updatePitch(index, { lengthFt: Number.isFinite(n) && n >= 0 ? n : 0 });
  }

  onMoveFieldInput(
    pitchIndex: number,
    moveIndex: number,
    field: 'label' | 'detail',
    value: string
  ): void {
    this.store.updateMove(pitchIndex, moveIndex, { [field]: value });
  }

  addPitch(): void {
    this.store.addPitch();
    this.expandedPitch.set(this.store.pitchCount() - 1);
  }

  removePitch(index: number): void {
    this.store.removePitch(index);
    if (this.expandedPitch() === index) {
      this.expandedPitch.set(null);
    }
  }

  toggleExpanded(index: number): void {
    this.expandedPitch.set(this.expandedPitch() === index ? null : index);
  }

  addMove(pitchIndex: number): void {
    this.store.addMove(pitchIndex, { label: '', detail: '' });
  }

  removeMove(pitchIndex: number, moveIndex: number): void {
    this.store.removeMove(pitchIndex, moveIndex);
  }

  protected movesOf(pitchIndex: number): Move[] {
    return this.store.route().pitches[pitchIndex].moves ?? [];
  }
}

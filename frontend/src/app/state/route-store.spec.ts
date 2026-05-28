import { TestBed } from '@angular/core/testing';
import { RouteStore } from './route-store';

describe('RouteStore', () => {
  let store: RouteStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(RouteStore);
  });

  it('seeds with a non-empty route', () => {
    expect(store.route().name).toBeTruthy();
    expect(store.pitchCount()).toBeGreaterThan(0);
  });

  it('updates the route name', () => {
    store.setRouteName('New Name');
    expect(store.route().name).toBe('New Name');
  });

  it('adds and removes pitches', () => {
    const initial = store.pitchCount();
    store.addPitch();
    expect(store.pitchCount()).toBe(initial + 1);
    store.removePitch(store.pitchCount() - 1);
    expect(store.pitchCount()).toBe(initial);
  });

  it('updates a pitch in place', () => {
    store.updatePitch(0, { grade: '5.12d' });
    expect(store.route().pitches[0].grade).toBe('5.12d');
  });

  it('clears selection when the selected pitch is removed', () => {
    const last = store.pitchCount() - 1;
    store.selectPitch(last);
    expect(store.selectedPitchIndex()).toBe(last);
    store.removePitch(last);
    expect(store.selectedPitchIndex()).toBeNull();
  });

  it('rejects out-of-range pitch selection', () => {
    store.selectPitch(9999);
    expect(store.selectedPitchIndex()).toBeNull();
  });

  it('sums pitch lengths', () => {
    expect(store.totalLengthFt()).toBe(
      store.route().pitches.reduce((s, p) => s + p.lengthFt, 0)
    );
  });

  it('seeds with the default granite rock type', () => {
    expect(store.route().rockType).toBe('granite');
  });

  it('setRockType updates the route', () => {
    store.setRockType('basalt');
    expect(store.route().rockType).toBe('basalt');
    store.setRockType('sandstone');
    expect(store.route().rockType).toBe('sandstone');
  });

  it('manages moves on a pitch', () => {
    store.addMove(0, { label: 'Test move' });
    expect(store.route().pitches[0].moves?.length).toBeGreaterThan(0);
    store.updateMove(0, 0, { detail: 'detail text' });
    expect(store.route().pitches[0].moves?.[0].detail).toBe('detail text');
    store.removeMove(0, 0);
  });
});

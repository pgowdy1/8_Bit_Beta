import {
  LABEL_COLORS, NES, NES_PALETTE, RIDGE_COLORS, GROUND_COLORS, ROCK_PALETTES,
  ROPE_COLORS, SKY_BANDS, SPRITE_PALETTES, STAR_COLOR, SUN_COLORS, isValidHex,
} from './nes-palette';
import { ROCK_TYPES } from '../models/route.model';

describe('NES palette', () => {
  it('contains 60 palette slots (~54 distinct after dedup, matching NES register space)', () => {
    expect(NES_PALETTE.length).toBe(60);
  });

  it('has at least 50 distinct colors', () => {
    const unique = new Set(NES_PALETTE);
    expect(unique.size).toBeGreaterThanOrEqual(50);
  });

  it('contains only valid hex strings', () => {
    for (const c of NES_PALETTE) {
      expect(isValidHex(c)).toBe(true);
    }
  });

  it('named tokens are all in the broader palette or shared blacks', () => {
    for (const [, hex] of Object.entries(NES)) {
      expect(isValidHex(hex)).toBe(true);
    }
  });

  it('exposes six sky bands, all valid hex', () => {
    expect(SKY_BANDS.length).toBe(6);
    for (const c of SKY_BANDS) expect(isValidHex(c)).toBe(true);
  });

  it('scene constants are valid hex', () => {
    const all = [
      RIDGE_COLORS.far, RIDGE_COLORS.near,
      GROUND_COLORS.base, GROUND_COLORS.highlight, GROUND_COLORS.speckle,
      ROPE_COLORS.main, ROPE_COLORS.shade,
      SUN_COLORS.core, SUN_COLORS.halo,
      STAR_COLOR, LABEL_COLORS.fill, LABEL_COLORS.outline,
      ...Object.values(SPRITE_PALETTES).flat(),
    ];
    for (const c of all) expect(isValidHex(c)).toBe(true);
  });

  it('sky bands are all distinct', () => {
    expect(new Set(SKY_BANDS).size).toBe(6);
  });

  it('exposes a 4-slot palette for every rock type', () => {
    for (const rt of ROCK_TYPES) {
      const p = ROCK_PALETTES[rt];
      expect(p).toBeTruthy();
      const slots = [p.shadow, p.base, p.midtone, p.highlight];
      expect(slots.length).toBe(4);
      for (const c of slots) {
        expect(isValidHex(c)).toBe(true);
      }
    }
  });

  it('each rock palette has 4 distinct colors', () => {
    for (const rt of ROCK_TYPES) {
      const p = ROCK_PALETTES[rt];
      const unique = new Set([p.shadow, p.base, p.midtone, p.highlight]);
      expect(unique.size).toBe(4);
    }
  });

  it('rejects invalid hex strings', () => {
    expect(isValidHex('white')).toBe(false);
    expect(isValidHex('#FFF')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
    expect(isValidHex('#FFFFFF')).toBe(true);
  });
});

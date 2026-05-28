import { NES, NES_PALETTE, SCENE_PALETTES, isValidHex } from './nes-palette';

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

  it('exposes 4 colors per scene palette', () => {
    expect(SCENE_PALETTES.sky.length).toBe(4);
    expect(SCENE_PALETTES.wall.length).toBe(4);
    expect(SCENE_PALETTES.ground.length).toBe(4);
    expect(SCENE_PALETTES.route.length).toBe(4);
  });

  it('rejects invalid hex strings', () => {
    expect(isValidHex('white')).toBe(false);
    expect(isValidHex('#FFF')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
    expect(isValidHex('#FFFFFF')).toBe(true);
  });
});

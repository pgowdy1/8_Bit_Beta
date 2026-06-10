// NES PPU heritage palette - colors produced by the original 6502-driven
// NES picture processor (the full $00-$3F register space contains 64 entries
// but several are duplicate/forbidden blacks). We expose 60 slots here
// (~54 distinct). Kept for reference; the scene now uses the golden-hour
// constants below.

export const NES_PALETTE: readonly string[] = Object.freeze([
  '#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400',
  '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
  '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10',
  '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888', '#000000', '#000000', '#000000',
  '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044',
  '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8', '#787878', '#000000', '#000000',
  '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8',
  '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8',
]);

// Named tokens we use for UI chrome and scene composition.
export const NES = {
  black:        '#000000',
  white:        '#FCFCFC',
  lightGray:    '#BCBCBC',
  midGray:      '#7C7C7C',
  darkGray:     '#3C3C3C',
  blue:         '#0078F8',
  darkBlue:     '#0000BC',
  lightBlue:    '#3CBCFC',
  paleBlue:     '#A4E4FC',
  red:          '#F83800',
  darkRed:      '#A81000',
  yellow:       '#FCBC3C',
  brown:        '#503000',
  paleBrown:    '#AC7C00',
  green:        '#00B800',
  sky:          '#BCDCFC',
} as const;

// Per-rock-type 4-color sub-palette. Slot semantics: [shadow, base, midtone, highlight].
// Renderer fills the wall with `base`, then layers texture using shadow/midtone/highlight.
export interface RockPalette {
  shadow: string;
  base: string;
  midtone: string;
  highlight: string;
}

export const ROCK_PALETTES: Record<'granite' | 'limestone' | 'basalt' | 'sandstone', RockPalette> = {
  granite:   { shadow: '#5A4A5A', base: '#8E7E80', midtone: '#B89A8A', highlight: '#E8C8A8' },
  limestone: { shadow: '#7A5A4A', base: '#C8A878', midtone: '#E0C090', highlight: '#F8E8B8' },
  basalt:    { shadow: '#241A28', base: '#4A3A44', midtone: '#6A5258', highlight: '#A87858' },
  sandstone: { shadow: '#6A3A2A', base: '#B86A40', midtone: '#D88A50', highlight: '#F8B878' },
};

// ============================================================
// Golden-hour scene constants. Hand-tunable named colors;
// top of sky -> horizon.
// ============================================================
export const SKY_BANDS: readonly string[] = Object.freeze([
  '#2A2A6A', // deep indigo (top)
  '#4A3A8A', // violet
  '#8A4A8A', // magenta
  '#C85A70', // rose
  '#E8804A', // orange
  '#F8A85A', // amber (horizon)
]);

export const RIDGE_COLORS = { far: '#5A3A7A', near: '#3A2A5A' } as const;
export const GROUND_COLORS = { base: '#2A2030', highlight: '#3A2A40', speckle: '#201828' } as const;
export const ROPE_COLORS = { main: '#FFF0A0', shade: '#D8B860' } as const;
export const SUN_COLORS = { core: '#FFE0A0', halo: '#F8A85A' } as const;
export const STAR_COLOR = '#FCFCFC';
export const LABEL_COLORS = { fill: '#FCFCFC', outline: '#2A1A20' } as const;

// Color lists for pixel-matrix sprites (index 1 in a matrix = first entry).
export const SPRITE_PALETTES = {
  climber:   ['#E04028', '#F8D878', '#3CBCFC', '#2A2A4A'], // helmet, skin, shirt, pants
  quickdraw: ['#BCBCBC', '#4A4A4A', '#3CBCFC', '#E8E8E8'], // hanger, bolt, sling, carabiner
  anchor:    ['#BCBCBC', '#2A1A20', '#FFD080'],            // bolts, chain, master point
  cloud:     ['#F8B888', '#C85A70', '#FFE0C0'],            // body, underside, highlight
  pine:      ['#201828'],
  bird:      ['#2A1A20'],
} as const;

export function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

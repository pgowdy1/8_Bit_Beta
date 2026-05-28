// Strict NES PPU palette - the 54 distinct colors produced by the original
// 6502-driven NES picture processor (the full $00-$3F register space contains
// 64 entries but several are duplicate/forbidden blacks). We expose 54 here.

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

// Sub-palettes per scene region (NES hardware uses up to 4 colors per tile,
// the first being transparent/shared backdrop). We model that constraint.
export const SCENE_PALETTES = {
  sky:   [NES.sky, NES.paleBlue, NES.white, NES.lightBlue],
  wall:  [NES.darkGray, NES.midGray, NES.lightGray, NES.white],
  ground:[NES.brown, NES.darkGray, NES.paleBrown, NES.midGray],
  route: [NES.black, NES.darkRed, NES.red, NES.yellow],
} as const;

export function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

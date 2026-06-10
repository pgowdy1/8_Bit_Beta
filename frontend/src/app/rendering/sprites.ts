// Pixel-matrix sprites. 0 = transparent; 1..n index into a color list
// (see SPRITE_PALETTES in nes-palette.ts). Edit pixels by editing rows.

export type SpriteMatrix = readonly (readonly number[])[];

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  matrix: SpriteMatrix,
  colors: readonly string[],
  x: number,
  y: number
): void {
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      const idx = matrix[row][col];
      if (idx === 0) continue;
      ctx.fillStyle = colors[idx - 1];
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

// 8x8 climber facing the wall, right arm reaching up.
// 1=helmet 2=skin 3=shirt 4=pants
export const CLIMBER: SpriteMatrix = [
  [0, 0, 0, 1, 1, 0, 0, 2],
  [0, 0, 1, 1, 1, 1, 0, 2],
  [0, 0, 2, 2, 2, 2, 0, 3],
  [0, 3, 3, 3, 3, 3, 3, 3],
  [0, 3, 3, 3, 3, 3, 0, 0],
  [0, 0, 4, 4, 4, 4, 0, 0],
  [0, 4, 4, 0, 0, 4, 4, 0],
  [0, 4, 0, 0, 0, 0, 4, 0],
];

// 5x9 quickdraw: hanger bolted to rock, sling, carabiner (rope passes
// through the hollow center of rows 7-8).
// 1=hanger 2=bolt 3=sling 4=carabiner
export const QUICKDRAW: SpriteMatrix = [
  [0, 1, 1, 1, 0],
  [0, 1, 2, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 4, 4, 4, 0],
  [0, 4, 0, 4, 0],
  [0, 4, 4, 4, 0],
];

// 7x5 belay station: two bolts, chain V, master-point knot.
// 1=bolt 2=chain 3=knot
export const ANCHOR_STATION: SpriteMatrix = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [0, 2, 0, 0, 0, 2, 0],
  [0, 0, 2, 0, 2, 0, 0],
  [0, 0, 0, 3, 0, 0, 0],
];

// 20x7 underlit cloud. 1=body 2=underside 3=top highlight
export const CLOUD: SpriteMatrix = [
  [0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 3, 1, 1, 1, 3, 0, 3, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 0, 0, 3, 3, 0, 0],
  [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 3, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
];

// 7x10 pine silhouette. 1=foliage/trunk
export const PINE: SpriteMatrix = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
];

// 5x2 gliding bird silhouette.
export const BIRD: SpriteMatrix = [
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

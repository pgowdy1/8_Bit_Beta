import { Route } from '../models/route.model';
import { SPRITE_PALETTES } from './nes-palette';
import {
  GROUND_HEIGHT, RenderProgress, SUMMIT_HEIGHT,
  climberPoint, computeLogicalHeight, wallHeight,
} from './layout';
import { drawBirds, drawClouds, drawSky, drawSun } from './sky';
import { drawGround, drawRidges, drawWall } from './terrain';
import { drawRouteLayer } from './rope';
import { CLIMBER, drawSprite } from './sprites';

export { FULLY_RENDERED } from './layout';
export type { RenderProgress } from './layout';

// Render the entire golden-hour scene to a logical-pixel canvas, back to
// front. Caller sizes the backing store to LOGICAL_WIDTH x
// computeLogicalHeight(route) and disables image smoothing when upscaling.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const height = computeLogicalHeight(route);
  const horizonY = height - GROUND_HEIGHT;
  const summitY = horizonY - wallHeight(route) - SUMMIT_HEIGHT;

  drawSky(ctx, horizonY);
  drawSun(ctx, horizonY);
  drawClouds(ctx, horizonY);
  drawRidges(ctx, horizonY);
  drawWall(ctx, route);
  drawGround(ctx, height);
  drawBirds(ctx, summitY);
  drawRouteLayer(ctx, route, progress);
  drawClimber(ctx, route, progress);
}

function drawClimber(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const pt = climberPoint(route, progress);
  if (!pt) return;
  const atSummit = progress.pitchIndex >= route.pitches.length;
  // Hanging on the rope mid-climb; standing on the summit at rest.
  const y = atSummit ? pt.y - 8 : pt.y - 7;
  drawSprite(ctx, CLIMBER, SPRITE_PALETTES.climber, pt.x - 4, y);
}

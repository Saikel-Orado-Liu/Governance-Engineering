export const TILE_W = 64;
export const TILE_H = 32;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface GridCoord {
  row: number;
  col: number;
}

export function worldToScreen(
  row: number,
  col: number,
  originX: number,
  originY: number,
): ScreenPoint {
  return {
    x: originX + (col - row) * (TILE_W / 2),
    y: originY + (row + col) * (TILE_H / 2),
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  originX: number,
  originY: number,
): GridCoord {
  const halfW = TILE_W / 2;
  const halfH = TILE_H / 2;
  const dx = (sx - originX) / halfW;
  const dy = (sy - originY) / halfH;
  const col = (dx + dy) / 2;
  const row = (dy - dx) / 2;
  return { row: Math.round(row), col: Math.round(col) };
}

export function drawDiamondTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tw: number,
  th: number,
  fillColor: string,
  strokeColor?: string,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - th / 2);
  ctx.lineTo(cx + tw / 2, cy);
  ctx.lineTo(cx, cy + th / 2);
  ctx.lineTo(cx - tw / 2, cy);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

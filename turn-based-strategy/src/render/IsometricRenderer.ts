export const TILE_W = 64;
export const TILE_H = 48;

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
  scale: number = 1,
): ScreenPoint {
  return {
    x: originX + (col - row) * ((TILE_W * scale) / 2),
    y: originY + (row + col) * ((TILE_H * scale) / 2),
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  originX: number,
  originY: number,
  scale: number = 1,
): GridCoord {
  const halfW = (TILE_W * scale) / 2;
  const halfH = (TILE_H * scale) / 2;
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

export function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export function drawCubeTile(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tw: number,
  th: number,
  cubeHeight: number,
  fillColor: string,
  sideRightColor?: string,
  sideLeftColor?: string,
): void {
  const rightColor = sideRightColor ?? darkenColor(fillColor, 0.75);
  const leftColor = sideLeftColor ?? darkenColor(fillColor, 0.85);
  const strokeColor = 'rgba(0,0,0,0.2)';

  if (cubeHeight <= 0) {
    drawDiamondTile(ctx, cx, cy, tw, th, fillColor, strokeColor);
    return;
  }

  const cyTop = cy - cubeHeight;

  // Right face: connects right->bottom edge of base to right->bottom edge of top
  ctx.beginPath();
  ctx.moveTo(cx + tw / 2, cy);                 // base right vertex
  ctx.lineTo(cx, cy + th / 2);                 // base bottom vertex
  ctx.lineTo(cx, cyTop + th / 2);              // top bottom vertex
  ctx.lineTo(cx + tw / 2, cyTop);              // top right vertex
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Left face: connects left->bottom edge of base to left->bottom edge of top
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2, cy);                 // base left vertex
  ctx.lineTo(cx, cy + th / 2);                 // base bottom vertex
  ctx.lineTo(cx, cyTop + th / 2);              // top bottom vertex
  ctx.lineTo(cx - tw / 2, cyTop);              // top left vertex
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top face (diamond at elevated position)
  drawDiamondTile(ctx, cx, cyTop, tw, th, fillColor, strokeColor);
}

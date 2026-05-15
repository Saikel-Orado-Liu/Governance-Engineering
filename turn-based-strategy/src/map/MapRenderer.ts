import { TileType } from './TileType';
import { MapGrid, GRID_SIZE } from './MapGrid';
import type { Unit } from '../unit/Unit';
import {
  worldToScreen,
  screenToWorld,
  drawDiamondTile,
  drawCubeTile,
  darkenColor,
  TILE_W,
  TILE_H,
} from '../render/IsometricRenderer';
import type { AnimationManager } from '../render/AnimationManager';

export function calcScale(canvasW: number, canvasH: number): number {
  const maxScaleW = (canvasW * 0.88) / (GRID_SIZE * TILE_W);
  const maxScaleH = (canvasH * 0.88) / (GRID_SIZE * TILE_H);
  return Math.min(maxScaleW, maxScaleH);
}

export function calcOrigin(
  canvasW: number,
  canvasH: number,
  scale: number,
): { originX: number; originY: number } {
  return {
    originX: canvasW / 2,
    originY: canvasH / 2 - ((GRID_SIZE - 1) * TILE_H * scale) / 2,
  };
}

const TILE_COLORS: Record<TileType, string> = {
  [TileType.Plain]: '#5a8f3c',
  [TileType.Forest]: '#2d5a1e',
  [TileType.Mountain]: '#8b7355',
  [TileType.Water]: '#4a90d9',
};

const PLAIN_LIGHT = '#5a8f3c';
const PLAIN_DARK = '#4e7e34';

const HEIGHT_UNIT = 12;

const TILE_HEIGHTS: Record<TileType, number> = {
  [TileType.Plain]: 1,
  [TileType.Forest]: 1.5,
  [TileType.Mountain]: 2,
  [TileType.Water]: 0,
};

interface UnitRenderInfo {
  unit: Unit;
  drawRow: number;
  drawCol: number;
  drawX: number;
  drawY: number;
  tileType: TileType;
}

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private currentGrid: MapGrid | null = null;
  private flashingUnits: Set<Unit> = new Set();
  private selectedUnit: Unit | null = null;
  private animationManager: AnimationManager | null = null;
  originX: number;
  originY: number;
  scale: number;
  onClick: ((row: number, col: number, type: TileType) => void) | null = null;

  constructor(options: {
    canvas: HTMLCanvasElement;
    onClick?: (row: number, col: number, type: TileType) => void;
  }) {
    const { canvas, onClick } = options;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onClick = onClick ?? null;

    this.scale = calcScale(canvas.width, canvas.height);
    const { originX, originY } = calcOrigin(canvas.width, canvas.height, this.scale);
    this.originX = originX;
    this.originY = originY;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.currentGrid) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { row, col } = screenToWorld(x, y, this.originX, this.originY, this.scale);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const type = this.currentGrid.tiles[row][col];
        this.onClick?.(row, col, type);
      }
    });
  }

  resize(w: number, h: number): void {
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = calcScale(w, h);
    const { originX, originY } = calcOrigin(w, h, this.scale);
    this.originX = originX;
    this.originY = originY;
  }

  setAnimationManager(am: AnimationManager): void {
    this.animationManager = am;
  }

  setSelectedUnit(unit: Unit | null): void {
    this.selectedUnit = unit;
  }

  private getTileHeightPx(tileType: TileType): number {
    return TILE_HEIGHTS[tileType] * HEIGHT_UNIT * this.scale;
  }

  private drawHpBar(cx: number, cy: number, ratio: number, team: number): void {
    const barWidth = 20 * this.scale;
    const barHeight = 4 * this.scale;
    // Background
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(cx - barWidth / 2, cy, barWidth, barHeight);
    // Foreground — team color
    this.ctx.fillStyle = team === 0 ? '#2ecc71' : '#e74c3c';
    this.ctx.fillRect(cx - barWidth / 2, cy, barWidth * Math.min(1, Math.max(0, ratio)), barHeight);
  }

  private drawUnitIcon(
    cx: number,
    cy: number,
    type: number,
    fillColor: string,
    strokeColor: string,
    scale: number,
  ): void {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;

    switch (type) {
      case 0: // Warrior — Shield
        this.drawShield(0, 0);
        break;
      case 1: // Archer — Bow
        this.drawBow(0, 0);
        break;
      case 2: // Knight — Chevron
        this.drawChevron(0, 0);
        break;
      case 3: // Mage — Star
        this.drawStarShape(0, 0);
        break;
    }

    this.ctx.restore();
  }

  private drawShield(cx: number, cy: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 8, cy + 6);
    this.ctx.lineTo(cx - 8, cy - 4);
    this.ctx.arc(cx, cy - 4, 8, Math.PI, 0, false);
    this.ctx.lineTo(cx + 8, cy + 6);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawBow(cx: number, cy: number): void {
    const r = 9;
    const startAngle = -Math.PI * 0.4;
    const endAngle = Math.PI * 0.4;
    // Bow arc
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, startAngle, endAngle);
    this.ctx.stroke();
    // Bow string
    const ax = cx + r * Math.cos(startAngle);
    const ay = cy + r * Math.sin(startAngle);
    const bx = cx + r * Math.cos(endAngle);
    const by = cy + r * Math.sin(endAngle);
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
    this.ctx.stroke();
  }

  private drawChevron(cx: number, cy: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 9, cy + 6);
    this.ctx.lineTo(cx, cy - 6);
    this.ctx.lineTo(cx + 9, cy + 6);
    this.ctx.stroke();
  }

  private drawStarShape(cx: number, cy: number): void {
    const outerR = 9;
    const innerR = 4;
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = cx + outerR * Math.cos(outerAngle);
      const oy = cy + outerR * Math.sin(outerAngle);
      const ix = cx + innerR * Math.cos(innerAngle);
      const iy = cy + innerR * Math.sin(innerAngle);
      if (i === 0) {
        this.ctx.moveTo(ox, oy);
      } else {
        this.ctx.lineTo(ox, oy);
      }
      this.ctx.lineTo(ix, iy);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawUnitAt(info: UnitRenderInfo): void {
    const heightPx = this.getTileHeightPx(info.tileType);
    const unitY = info.drawY - heightPx;
    const isFlashing = this.flashingUnits.has(info.unit);
    if (isFlashing) {
      this.drawUnitIcon(info.drawX, unitY, info.unit.type, '#ff0000', '#cc0000', this.scale);
    } else {
      const fillColor = info.unit.team === 0 ? '#2980b9' : '#e74c3c';
      const strokeColor = info.unit.team === 0 ? '#1a5276' : '#a93226';
      this.drawUnitIcon(info.drawX, unitY, info.unit.type, fillColor, strokeColor, this.scale);
    }
    const hpBarY = unitY - 18 * this.scale;
    this.drawHpBar(info.drawX, hpBarY, info.unit.hp / info.unit.maxHp, info.unit.team);
  }

  renderHighlights(cells: { row: number; col: number }[]): void {
    this.renderDiamondCells(cells, 'rgba(255, 255, 0, 0.3)');
  }

  renderAttackHighlights(cells: { row: number; col: number }[]): void {
    this.renderDiamondCells(cells, 'rgba(255, 0, 0, 0.4)');
  }

  private renderDiamondCells(cells: { row: number; col: number }[], fillStyle: string): void {
    if (cells.length === 0) return;
    for (const { row, col } of cells) {
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;
      const { x, y } = worldToScreen(row, col, this.originX, this.originY, this.scale);
      let heightPx = 0;
      if (this.currentGrid) {
        const tileType = this.currentGrid.tiles[row][col];
        heightPx = this.getTileHeightPx(tileType);
      }
      drawDiamondTile(this.ctx, x, y - heightPx, TILE_W * this.scale, TILE_H * this.scale, fillStyle);
    }
  }

  renderAbilityRange(cells: { row: number; col: number }[], fillStyle: string): void {
    this.renderDiamondCells(cells, fillStyle);
  }

  renderAbilityTargets(cells: { row: number; col: number }[]): void {
    this.renderDiamondCells(cells, 'rgba(41, 128, 185, 0.5)');
  }

  setFlashingUnits(units: Unit[]): void {
    this.flashingUnits = new Set(units);
  }

  clearFlashingUnits(): void {
    this.flashingUnits.clear();
  }

  render(grid: MapGrid, units?: Unit[]): void {
    this.currentGrid = grid;

    // Clear canvas with dark background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Precompute unit render info grouped by sum (painter's order)
    const unitMap = new Map<number, UnitRenderInfo[]>();
    if (units) {
      for (const unit of units) {
        if (!unit.isAlive()) continue;
        const pos = this.animationManager?.getVisualPosition(unit);
        let drawRow: number;
        let drawCol: number;
        if (pos && 'vx' in pos) {
          drawRow = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(pos.vy)));
          drawCol = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(pos.vx)));
        } else if (pos) {
          drawRow = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(pos.row)));
          drawCol = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(pos.col)));
        } else {
          drawRow = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(unit.row)));
          drawCol = Math.min(GRID_SIZE - 1, Math.max(0, Math.round(unit.col)));
        }
        const { x, y } = worldToScreen(drawRow, drawCol, this.originX, this.originY, this.scale);
        const tileType = grid.tiles[drawRow]?.[drawCol] ?? TileType.Plain;
        const sum = drawRow + drawCol;
        const info: UnitRenderInfo = { unit, drawRow, drawCol, drawX: x, drawY: y, tileType };
        if (!unitMap.has(sum)) unitMap.set(sum, []);
        unitMap.get(sum)!.push(info);
      }
    }

    // Draw tiles in painter's order (back to front), with units on top of their tile
    for (let sum = 0; sum < GRID_SIZE * 2 - 1; sum++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const c = sum - r;
        if (c < 0 || c >= GRID_SIZE) continue;

        const type = grid.tiles[r][c];
        const { x, y } = worldToScreen(r, c, this.originX, this.originY, this.scale);

        let baseColor: string;
        if (type === TileType.Plain) {
          // Checkerboard for Plain tiles
          baseColor = (r + c) % 2 === 0 ? PLAIN_LIGHT : PLAIN_DARK;
        } else {
          baseColor = TILE_COLORS[type];
        }

        const heightPx = this.getTileHeightPx(type);
        const sideRColor = darkenColor(baseColor, 0.75);
        const sideLColor = darkenColor(baseColor, 0.85);

        drawCubeTile(this.ctx, x, y, TILE_W * this.scale, TILE_H * this.scale, heightPx, baseColor, sideRColor, sideLColor);

        // Draw unit standing on this tile (after the tile, so unit is on top)
        const unitInfos = unitMap.get(sum);
        if (unitInfos) {
          for (const info of unitInfos) {
            if (info.drawRow === r && info.drawCol === c) {
              this.drawUnitAt(info);
            }
          }
        }
      }
    }

    // Selection highlight (gold diamond) — drawn after all tiles and units
    if (this.selectedUnit && this.selectedUnit.isAlive()) {
      const su = this.selectedUnit;
      const { x: sx, y: sy } = worldToScreen(su.row, su.col, this.originX, this.originY, this.scale);
      const selTileType = this.currentGrid?.tiles[su.row][su.col] ?? TileType.Plain;
      const selHeightPx = this.getTileHeightPx(selTileType);
      drawDiamondTile(this.ctx, sx, sy - selHeightPx, TILE_W * this.scale, TILE_H * this.scale, 'rgba(255,215,0,0.15)', '#ffd700');
    }
  }
}

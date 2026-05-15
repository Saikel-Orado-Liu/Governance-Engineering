import { TileType } from './TileType';
import { MapGrid, GRID_SIZE } from './MapGrid';
import type { Unit } from '../unit/Unit';
import {
  worldToScreen,
  screenToWorld,
  drawDiamondTile,
  TILE_W,
  TILE_H,
} from '../render/IsometricRenderer';
import type { AnimationManager } from '../render/AnimationManager';

export function calcOrigin(
  canvasW: number,
  canvasH: number,
  _tileW: number,
  _tileH: number,
): { originX: number; originY: number } {
  return {
    originX: canvasW / 2,
    originY: canvasH * 0.08,
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

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private currentGrid: MapGrid | null = null;
  private flashingUnits: Set<Unit> = new Set();
  private selectedUnit: Unit | null = null;
  private animationManager: AnimationManager | null = null;
  originX: number;
  originY: number;
  onClick: ((row: number, col: number, type: TileType) => void) | null = null;

  constructor(options: {
    canvas: HTMLCanvasElement;
    onClick?: (row: number, col: number, type: TileType) => void;
  }) {
    const { canvas, onClick } = options;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onClick = onClick ?? null;

    const { originX, originY } = calcOrigin(canvas.width, canvas.height, TILE_W, TILE_H);
    this.originX = originX;
    this.originY = originY;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.currentGrid) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { row, col } = screenToWorld(x, y, this.originX, this.originY);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const type = this.currentGrid.tiles[row][col];
        this.onClick?.(row, col, type);
      }
    });
  }

  resize(w: number, h: number): void {
    this.canvas.width = w;
    this.canvas.height = h;
    const { originX, originY } = calcOrigin(w, h, TILE_W, TILE_H);
    this.originX = originX;
    this.originY = originY;
  }

  setAnimationManager(am: AnimationManager): void {
    this.animationManager = am;
  }

  setSelectedUnit(unit: Unit | null): void {
    this.selectedUnit = unit;
  }

  renderUnits(units: Unit[]): void {
    const alive = units.filter(u => u.isAlive());

    // Sort by depth (row+col) ascending so front units draw on top
    const sorted = [...alive].sort((a, b) => (a.row + a.col) - (b.row + b.col));

    for (const unit of sorted) {
      const pos = this.animationManager?.getVisualPosition(unit);
      let drawRow: number;
      let drawCol: number;
      if (pos && 'vx' in pos) {
        drawRow = pos.vy;
        drawCol = pos.vx;
      } else if (pos) {
        drawRow = pos.row;
        drawCol = pos.col;
      } else {
        drawRow = unit.row;
        drawCol = unit.col;
      }

      const { x: cx, y: cy } = worldToScreen(drawRow, drawCol, this.originX, this.originY);
      const isFlashing = this.flashingUnits.has(unit);

      // Draw unit icon
      if (isFlashing) {
        this.drawUnitIcon(cx, cy, unit.type, '#ff0000', '#cc0000');
      } else {
        const fillColor = unit.team === 0 ? '#2980b9' : '#e74c3c';
        const strokeColor = unit.team === 0 ? '#1a5276' : '#a93226';
        this.drawUnitIcon(cx, cy, unit.type, fillColor, strokeColor);
      }

      // HP bar at cy - 18 (above unit)
      this.drawHpBar(cx, cy - 18, unit.hp / unit.maxHp, unit.team);
    }

    // Selection highlight (gold diamond)
    if (this.selectedUnit && this.selectedUnit.isAlive()) {
      const su = this.selectedUnit;
      const { x: cx, y: cy } = worldToScreen(su.row, su.col, this.originX, this.originY);
      drawDiamondTile(this.ctx, cx, cy, TILE_W, TILE_H, 'rgba(255,215,0,0.15)', '#ffd700');
    }
  }

  private drawHpBar(cx: number, cy: number, ratio: number, team: number): void {
    const barWidth = 20;
    const barHeight = 4;
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
  ): void {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;

    switch (type) {
      case 0: // Warrior — Shield
        this.drawShield(cx, cy);
        break;
      case 1: // Archer — Bow
        this.drawBow(cx, cy);
        break;
      case 2: // Knight — Chevron
        this.drawChevron(cx, cy);
        break;
      case 3: // Mage — Star
        this.drawStarShape(cx, cy);
        break;
    }
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
      const { x, y } = worldToScreen(row, col, this.originX, this.originY);
      drawDiamondTile(this.ctx, x, y, TILE_W, TILE_H, fillStyle);
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

  render(grid: MapGrid): void {
    this.currentGrid = grid;

    // Clear canvas with dark background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles in painter's order (back to front)
    for (let sum = 0; sum < GRID_SIZE * 2 - 1; sum++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const c = sum - r;
        if (c < 0 || c >= GRID_SIZE) continue;

        const type = grid.tiles[r][c];
        const { x, y } = worldToScreen(r, c, this.originX, this.originY);

        let baseColor: string;
        if (type === TileType.Plain) {
          // Checkerboard for Plain tiles
          baseColor = (r + c) % 2 === 0 ? PLAIN_LIGHT : PLAIN_DARK;
        } else {
          baseColor = TILE_COLORS[type];
        }

        drawDiamondTile(this.ctx, x, y, TILE_W, TILE_H, baseColor, 'rgba(0,0,0,0.2)');
      }
    }
  }
}

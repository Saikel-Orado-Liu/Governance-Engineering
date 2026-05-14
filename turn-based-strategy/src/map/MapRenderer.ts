import { TileType } from './TileType';
import { MapGrid, GRID_SIZE } from './MapGrid';
import type { Unit } from '../unit/Unit';

const TILE_SIZE = 80;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE; // 640

const TILE_COLORS: Record<TileType, string> = {
  [TileType.Plain]: '#7ec850',
  [TileType.Forest]: '#2d8b2d',
  [TileType.Mountain]: '#8b7355',
  [TileType.Water]: '#4a90d9',
};

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private currentGrid: MapGrid | null = null;
  private flashingUnits: Set<Unit> = new Set();
  private selectedUnit: Unit | null = null;
  onClick: ((row: number, col: number, type: TileType) => void) | null = null;

  constructor(options: { canvas: HTMLCanvasElement; onClick?: (row: number, col: number, type: TileType) => void }) {
    const { canvas, onClick } = options;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    this.ctx = canvas.getContext('2d')!;
    this.onClick = onClick ?? null;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.currentGrid) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const type = this.currentGrid.tiles[row][col];
        this.onClick?.(row, col, type);
      }
    });
  }

  setSelectedUnit(unit: Unit | null): void {
    this.selectedUnit = unit;
  }

  renderUnits(units: Unit[]): void {
    const alive = units.filter(u => u.isAlive());
    const radius = 16;

    for (const unit of alive) {
      const cx = unit.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = unit.row * TILE_SIZE + TILE_SIZE / 2;

      const isFlashing = this.flashingUnits.has(unit);

      if (!isFlashing) {
        // Glow effect (skip for flashing units to avoid visual conflict)
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = unit.team === 0 ? 'rgba(41,128,185,0.5)' : 'rgba(231,76,60,0.5)';
      }

      // Team-color filled circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = isFlashing ? '#ff0000' : (unit.team === 0 ? '#2980b9' : '#e74c3c');
      this.ctx.fill();

      // Dark border (always drawn, including flashing units)
      this.ctx.strokeStyle = unit.team === 0 ? '#1a5276' : '#a93226';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Reset shadow before HP bar (prevent glow pollution on HP bar)
      this.ctx.shadowBlur = 0;

      // HP bar (always drawn, including flashing units)
      const barY = cy + 18;
      const barWidth = 20;
      const barHeight = 3;
      // Background
      this.ctx.fillStyle = '#555';
      this.ctx.fillRect(cx - barWidth / 2, barY, barWidth, barHeight);
      // Foreground — gradient green to red based on hpRatio
      const hpRatio = unit.hp / unit.maxHp;
      const hpColor = hpRatio > 0.5
        ? `rgb(${Math.round(255 * (1 - hpRatio) * 2)},255,0)`
        : `rgb(255,${Math.round(255 * hpRatio * 2)},0)`;
      this.ctx.fillStyle = hpColor;
      this.ctx.fillRect(cx - barWidth / 2, barY, barWidth * hpRatio, barHeight);

      // Reset shadow after each unit (critical: prevents shadow pollution on grid/highlights)
      this.ctx.shadowBlur = 0;
    }

    // Selection highlight (gold ring) drawn on top of all units
    if (this.selectedUnit && this.selectedUnit.isAlive()) {
      const su = this.selectedUnit;
      const cx = su.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = su.row * TILE_SIZE + TILE_SIZE / 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  renderHighlights(cells: { row: number; col: number }[]): void {
    if (cells.length === 0) {
      return;
    }

    for (const { row, col } of cells) {
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
        continue; // Skip out-of-bounds cells silently
      }

      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      this.ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  setFlashingUnits(units: Unit[]): void {
    this.flashingUnits = new Set(units);
  }

  clearFlashingUnits(): void {
    this.flashingUnits.clear();
  }

  render(grid: MapGrid): void {
    this.currentGrid = grid;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const type = grid.tiles[r][c];
        this.ctx.fillStyle = TILE_COLORS[type];
        this.ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw grid lines
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * TILE_SIZE;
      // Vertical line
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, CANVAS_SIZE);
      this.ctx.stroke();
      // Horizontal line
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(CANVAS_SIZE, pos);
      this.ctx.stroke();
    }
  }
}

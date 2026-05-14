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

  renderUnits(units: Unit[]): void {
    const alive = units.filter(u => u.isAlive());
    const radius = 12;

    for (const unit of alive) {
      const cx = unit.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = unit.row * TILE_SIZE + TILE_SIZE / 2;

      // Flashing units render in red
      if (this.flashingUnits.has(unit)) {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();
        continue;
      }

      // Team-color filled circle
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = unit.team === 0 ? '#2980b9' : '#e74c3c';
      this.ctx.fill();
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

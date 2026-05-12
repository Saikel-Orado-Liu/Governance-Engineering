import { TileType, getTileLabel } from './TileType';
import { MapGrid, GRID_SIZE } from './MapGrid';

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

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    this.ctx = canvas.getContext('2d')!;

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (!this.currentGrid) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        const type = this.currentGrid.tiles[row][col];
        console.log(`Clicked tile: row=${row}, col=${col}, type=${getTileLabel(type)}`);
      }
    });
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

import { describe, it, expect } from 'vitest';
import { TileType } from '../TileType';
import { MapGrid, GRID_SIZE } from '../MapGrid';
import { MapGenerator } from '../MapGenerator';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

describe('MapGrid', () => {
  it('constructs an 8x8 grid from a given tiles array', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    expect(grid.tiles.length).toBe(8);
    for (const row of grid.tiles) {
      expect(row.length).toBe(8);
    }
  });

  describe('isPassable', () => {
    it('returns true for Plain', () => {
      const tiles = makeTiles(TileType.Plain);
      const grid = new MapGrid(tiles);
      expect(grid.isPassable(0, 0)).toBe(true);
      expect(grid.isPassable(4, 3)).toBe(true);
    });

    it('returns true for Forest', () => {
      const tiles = makeTiles(TileType.Forest);
      const grid = new MapGrid(tiles);
      expect(grid.isPassable(1, 2)).toBe(true);
    });

    it('returns false for Mountain', () => {
      const tiles = makeTiles(TileType.Mountain);
      const grid = new MapGrid(tiles);
      expect(grid.isPassable(2, 5)).toBe(false);
    });

    it('returns false for Water', () => {
      const tiles = makeTiles(TileType.Water);
      const grid = new MapGrid(tiles);
      expect(grid.isPassable(6, 7)).toBe(false);
    });

    it('returns false for out-of-bounds coordinates', () => {
      const tiles = makeTiles(TileType.Plain);
      const grid = new MapGrid(tiles);
      expect(grid.isPassable(-1, 0)).toBe(false);
      expect(grid.isPassable(0, -1)).toBe(false);
      expect(grid.isPassable(8, 0)).toBe(false);
      expect(grid.isPassable(0, 8)).toBe(false);
    });
  });

  describe('getMoveCost', () => {
    it('returns 1 for Plain', () => {
      const tiles = makeTiles(TileType.Plain);
      const grid = new MapGrid(tiles);
      expect(grid.getMoveCost(0, 0)).toBe(1);
    });

    it('returns 2 for Forest', () => {
      const tiles = makeTiles(TileType.Forest);
      const grid = new MapGrid(tiles);
      expect(grid.getMoveCost(3, 4)).toBe(2);
    });

    it('returns -1 for Mountain', () => {
      const tiles = makeTiles(TileType.Mountain);
      const grid = new MapGrid(tiles);
      expect(grid.getMoveCost(5, 2)).toBe(-1);
    });

    it('returns -1 for Water', () => {
      const tiles = makeTiles(TileType.Water);
      const grid = new MapGrid(tiles);
      expect(grid.getMoveCost(1, 1)).toBe(-1);
    });

    it('returns -1 for out-of-bounds coordinates', () => {
      const tiles = makeTiles(TileType.Plain);
      const grid = new MapGrid(tiles);
      expect(grid.getMoveCost(-1, 0)).toBe(-1);
      expect(grid.getMoveCost(0, 8)).toBe(-1);
    });
  });
});

describe('MapGenerator', () => {
  it('generates an 8x8 grid', () => {
    const generator = new MapGenerator();
    const grid = generator.generate();
    expect(grid.tiles.length).toBe(8);
    for (const row of grid.tiles) {
      expect(row.length).toBe(8);
    }
  });

  it('guarantees at least one passable path from (0,0) to (7,7)', () => {
    // Run multiple times to verify the path guarantee holds
    for (let i = 0; i < 20; i++) {
      const generator = new MapGenerator();
      const grid = generator.generate();
      expect(grid.isPassable(0, 0)).toBe(true);
      expect(grid.isPassable(7, 7)).toBe(true);

      // BFS check
      const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
      const queue: [number, number][] = [[0, 0]];
      visited[0][0] = true;
      let found = false;

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        if (r === 7 && c === 7) {
          found = true;
          break;
        }
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc] && grid.isPassable(nr, nc)) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      expect(found).toBe(true);
    }
  });
});

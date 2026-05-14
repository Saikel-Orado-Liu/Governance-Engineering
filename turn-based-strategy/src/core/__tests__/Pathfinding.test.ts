import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { Pathfinding } from '../Pathfinding';

/** 全 Plain 8x8 网格 */
function allPlainGrid(): MapGrid {
  const tiles = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(TileType.Plain),
  );
  return new MapGrid(tiles);
}

/** 从二维数字数组构建网格 */
function makeGridFromNumbers(data: number[][]): MapGrid {
  const tiles = data.map(row => row.map(c => c as TileType));
  return new MapGrid(tiles);
}

/** 检查两个坐标是否相邻（4 方向） */
function isAdjacent(
  a: { row: number; col: number },
  b: { row: number; col: number },
): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

describe('Pathfinding', () => {
  describe('findPath', () => {
    it('should return path of length 14 from (0,0) to (7,7) on all-Plain', () => {
      const grid = allPlainGrid();
      const pf = new Pathfinding(grid);

      const path = pf.findPath(0, 0, 7, 7);

      expect(path).not.toBeNull();
      expect(path).toHaveLength(14);

      // 每一步都是合法的相邻移动
      let prevRow = 0;
      let prevCol = 0;
      for (const step of path!) {
        expect(isAdjacent({ row: prevRow, col: prevCol }, step)).toBe(true);
        expect(grid.isPassable(step.row, step.col)).toBe(true);
        prevRow = step.row;
        prevCol = step.col;
      }

      // 终点必须是 (7,7)
      expect(prevRow).toBe(7);
      expect(prevCol).toBe(7);
    });

    it('should navigate around Mountain obstacles correctly', () => {
      // Grid layout (8x8, showing relevant portion):
      //   0 1 2 3
      // 0 P P M P
      // 1 P F M P
      // 2 P P P P
      // Mountain at (0,2) and (1,2) creates a wall
      // Forest at (1,1) adds terrain cost
      const data = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(TileType.Plain),
      );
      data[0][2] = TileType.Mountain;
      data[1][1] = TileType.Forest;
      data[1][2] = TileType.Mountain;
      const grid = makeGridFromNumbers(data);
      const pf = new Pathfinding(grid);

      // Start (0,0), end (2,3) — direct blocked by mountains at (0,2) and (1,2)
      const path = pf.findPath(0, 0, 2, 3);

      expect(path).not.toBeNull();

      // Verify destination reached
      const last = path![path!.length - 1];
      expect(last.row).toBe(2);
      expect(last.col).toBe(3);

      // No step should land on Mountain
      for (const step of path!) {
        expect(data[step.row][step.col]).not.toBe(TileType.Mountain);
      }

      // First step must be adjacent to start (0,0)
      expect(path![0].row).toBeLessThanOrEqual(1);
      expect(path![0].col).toBeLessThanOrEqual(1);
    });

    it('should exclude the start position from the returned path', () => {
      const grid = allPlainGrid();
      const pf = new Pathfinding(grid);

      const path = pf.findPath(0, 0, 3, 3);

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);

      // First element should NOT be the start position
      expect(path![0].row === 0 && path![0].col === 0).toBe(false);

      // First element must be a neighbor of start
      expect(isAdjacent({ row: 0, col: 0 }, path![0])).toBe(true);
    });

    it('should return null when start is completely blocked', () => {
      // Start at (1,1) surrounded by Mountains
      const data = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(TileType.Plain),
      );
      data[0][1] = TileType.Mountain; // up
      data[1][0] = TileType.Mountain; // left
      data[1][2] = TileType.Mountain; // right
      data[2][1] = TileType.Mountain; // down
      const grid = makeGridFromNumbers(data);
      const pf = new Pathfinding(grid);

      const path = pf.findPath(1, 1, 5, 5);

      expect(path).toBeNull();
    });

    it('should return null when start is Mountain itself', () => {
      const data = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(TileType.Plain),
      );
      data[0][0] = TileType.Mountain;
      const grid = makeGridFromNumbers(data);
      const pf = new Pathfinding(grid);

      const path = pf.findPath(0, 0, 3, 3);

      expect(path).toBeNull();
    });
  });

  describe('findPathInRange', () => {
    it('should return all cells with Manhattan distance <= range, excluding start', () => {
      const grid = allPlainGrid();
      const pf = new Pathfinding(grid);

      // From (4,4) with range 3 on all-Plain:
      // Cells with Manhattan distance <= 3 from (4,4) = 25 total
      // Excluding start = 24 cells
      const cells = pf.findPathInRange(4, 4, 3);

      expect(cells.length).toBe(24);

      // Every cell should have Manhattan distance <= 3
      for (const cell of cells) {
        const dist = Math.abs(cell.row - 4) + Math.abs(cell.col - 4);
        expect(dist).toBeLessThanOrEqual(3);
      }

      // Spot-check some known cells
      expect(cells.some(c => c.row === 1 && c.col === 4)).toBe(true); // d=3 up
      expect(cells.some(c => c.row === 7 && c.col === 4)).toBe(true); // d=3 down
      expect(cells.some(c => c.row === 4 && c.col === 7)).toBe(true); // d=3 right
      expect(cells.some(c => c.row === 4 && c.col === 1)).toBe(true); // d=3 left
    });

    it('should exclude cells where isOccupied returns true', () => {
      const grid = allPlainGrid();
      const occupied = new Set<string>();
      occupied.add('4,5'); // occupy cell (4,5)
      const pf = new Pathfinding(grid, (r, c) => occupied.has(`${r},${c}`));

      const cells = pf.findPathInRange(4, 4, 3);

      // (4,5) should be excluded
      expect(cells.some(c => c.row === 4 && c.col === 5)).toBe(false);

      // Other cells at similar distance are still present
      expect(cells.some(c => c.row === 4 && c.col === 3)).toBe(true);
      expect(cells.some(c => c.row === 3 && c.col === 4)).toBe(true);
    });

    it('should exclude the start position itself', () => {
      const grid = allPlainGrid();
      const pf = new Pathfinding(grid);

      const cells = pf.findPathInRange(4, 4, 3);

      expect(cells.some(c => c.row === 4 && c.col === 4)).toBe(false);
    });

    it('should account for Forest tiles costing 2 movement points', () => {
      const data = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(TileType.Plain),
      );
      data[4][5] = TileType.Forest;
      const grid = makeGridFromNumbers(data);
      const pf = new Pathfinding(grid);

      const cells = pf.findPathInRange(4, 4, 2);

      // (4,5) is Forest — cost 2 from (4,4), within range 2
      expect(cells.some(c => c.row === 4 && c.col === 5)).toBe(true);

      // (4,6) would cost 2 (Forest) + 1 (Plain) = 3 > 2, not reachable
      expect(cells.some(c => c.row === 4 && c.col === 6)).toBe(false);
    });

    it('should return empty array for range 0', () => {
      const grid = allPlainGrid();
      const pf = new Pathfinding(grid);

      const cells = pf.findPathInRange(4, 4, 0);

      expect(cells).toHaveLength(0);
    });
  });

});

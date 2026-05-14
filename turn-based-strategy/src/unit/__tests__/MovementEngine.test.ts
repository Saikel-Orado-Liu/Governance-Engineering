import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { MovementEngine } from '../MovementEngine';
import { UnitType } from '../UnitType';

function allPlainGrid(): MapGrid {
  const tiles = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(TileType.Plain)
  );
  return new MapGrid(tiles);
}

function makeGridFromNumbers(data: number[][]): MapGrid {
  const tiles = data.map(row => row.map(c => c as TileType));
  return new MapGrid(tiles);
}

function createManager(grid: MapGrid): { manager: UnitManager; engine: MovementEngine } {
  const manager = new UnitManager(grid);
  const engine = new MovementEngine(manager);
  return { manager, engine };
}

describe('MovementEngine', () => {
  it('should reach 24 cells from center with moveRange 3 on all-Plain grid', () => {
    const grid = allPlainGrid();
    const { manager, engine } = createManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 4, 4)!;

    const cells = engine.getReachableCells(grid, unit);

    // Manhattan distance <= 3 from (4,4) inside 8x8 = 24 cells
    expect(cells.length).toBe(24);

    // Verify (4,4) itself is not included
    expect(cells.some(c => c.row === 4 && c.col === 4)).toBe(false);

    // Spot-check some known reachable cells
    expect(cells.some(c => c.row === 1 && c.col === 4)).toBe(true); // d=3 up
    expect(cells.some(c => c.row === 7 && c.col === 4)).toBe(true); // d=3 down
    expect(cells.some(c => c.row === 4 && c.col === 7)).toBe(true); // d=3 right
  });

  it('should account for Forest tiles costing 2 movement points', () => {
    // Grid where (4,5) is Forest, rest Plain
    const data = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    data[4][5] = TileType.Forest; // Forest costs 2
    const grid = makeGridFromNumbers(data);
    const { manager, engine } = createManager(grid);

    // Mage has moveRange 2
    const unit = manager.spawnUnit(UnitType.Mage, 0, 4, 4)!;

    const cells = engine.getReachableCells(grid, unit);

    // (4,5) is Forest — cost from (4,4) = 2, still within moveRange 2
    expect(cells.some(c => c.row === 4 && c.col === 5)).toBe(true);

    // (4,6) would cost 2 (Forest) + 1 (Plain) = 3 > 2, NOT reachable
    expect(cells.some(c => c.row === 4 && c.col === 6)).toBe(false);

    // On all-Plain, (4,6) would be reachable via (4,4)->(4,5)->(4,6) cost=1+1=2
    // Verify we get exactly 11 cells (12 on all-Plain minus the blocked (4,6))
    expect(cells.length).toBe(11);
  });

  it('should block movement through Mountain and Water tiles', () => {
    // Grid with Mountain at (4,5) and Water at (4,6)
    const data = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    data[4][5] = TileType.Mountain;
    data[4][6] = TileType.Water;
    const grid = makeGridFromNumbers(data);
    const { manager, engine } = createManager(grid);

    // Knight has moveRange 5 — plenty to test with
    const unit = manager.spawnUnit(UnitType.Knight, 0, 4, 4)!;

    const cells = engine.getReachableCells(grid, unit);

    // Mountain cell should not be reachable
    expect(cells.some(c => c.row === 4 && c.col === 5)).toBe(false);

    // Water cell should not be reachable
    expect(cells.some(c => c.row === 4 && c.col === 6)).toBe(false);

    // Cells beyond the obstacles are still reachable via other routes
    // (3,5) is reachable via (4,4)->(3,4)->(3,5) cost=1+1=2
    expect(cells.some(c => c.row === 3 && c.col === 5)).toBe(true);
  });

  it('should exclude cells occupied by other units', () => {
    const grid = allPlainGrid();
    const { manager, engine } = createManager(grid);

    // Spawn the moving unit at (4,4)
    const unit = manager.spawnUnit(UnitType.Warrior, 0, 4, 4)!;

    // Spawn an enemy unit at (4,5) blocking that cell
    manager.spawnUnit(UnitType.Archer, 1, 4, 5);

    const cells = engine.getReachableCells(grid, unit);

    // (4,5) is occupied — should not be in reachable cells
    expect(cells.some(c => c.row === 4 && c.col === 5)).toBe(false);

    // Other cells at the same distance should still be reachable
    expect(cells.some(c => c.row === 3 && c.col === 4)).toBe(true); // (3,4) is free
    expect(cells.some(c => c.row === 5 && c.col === 4)).toBe(true); // (5,4) is free
    expect(cells.some(c => c.row === 4 && c.col === 3)).toBe(true); // (4,3) is free
  });

  it('should return empty when moveRange is 0', () => {
    const grid = allPlainGrid();
    const { manager, engine } = createManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 4, 4)!;

    // Override moveRange to 0 for this edge-case test
    Object.defineProperty(unit, 'moveRange', { value: 0 });

    const cells = engine.getReachableCells(grid, unit);

    expect(cells.length).toBe(0);
  });

  it('should return empty when unit is fully surrounded by other units', () => {
    const grid = allPlainGrid();
    const { manager, engine } = createManager(grid);

    // Spawn the moving unit at (4,4)
    const unit = manager.spawnUnit(UnitType.Knight, 0, 4, 4)!;

    // Surround the unit on all 4 sides
    manager.spawnUnit(UnitType.Warrior, 1, 3, 4); // up
    manager.spawnUnit(UnitType.Warrior, 1, 5, 4); // down
    manager.spawnUnit(UnitType.Warrior, 1, 4, 3); // left
    manager.spawnUnit(UnitType.Warrior, 1, 4, 5); // right

    const cells = engine.getReachableCells(grid, unit);

    // All adjacent cells are occupied — no move possible
    expect(cells.length).toBe(0);
  });
});

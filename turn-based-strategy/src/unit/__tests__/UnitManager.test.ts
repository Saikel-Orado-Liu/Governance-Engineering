import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { UnitType } from '../UnitType';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

describe('UnitManager', () => {
  it('spawnUnit on passable empty cell succeeds', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    expect(unit).not.toBeNull();
    expect(unit!.type).toBe(UnitType.Warrior);
    expect(unit!.team).toBe(0);
    expect(unit!.row).toBe(0);
    expect(unit!.col).toBe(0);
  });

  it('spawnUnit on impassable cell returns null', () => {
    const tiles = makeTiles(TileType.Mountain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    expect(unit).toBeNull();
  });

  it('spawnUnit on occupied cell returns null', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    const unit = manager.spawnUnit(UnitType.Archer, 1, 0, 0);
    expect(unit).toBeNull();
  });

  it('getUnitAt returns the unit at given position', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    manager.spawnUnit(UnitType.Knight, 1, 3, 4);
    const unit = manager.getUnitAt(3, 4);
    expect(unit).not.toBeNull();
    expect(unit!.type).toBe(UnitType.Knight);
    expect(unit!.team).toBe(1);
  });

  it('getUnitAt returns null for empty cell', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    expect(manager.getUnitAt(0, 0)).toBeNull();
  });

  it('getUnitsByTeam filters units by team', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    manager.spawnUnit(UnitType.Archer, 1, 0, 1);
    manager.spawnUnit(UnitType.Mage, 0, 0, 2);

    const team0 = manager.getUnitsByTeam(0);
    expect(team0.length).toBe(2);

    const team1 = manager.getUnitsByTeam(1);
    expect(team1.length).toBe(1);
  });

  it('moveUnit moves unit to valid target cell', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const moved = manager.moveUnit(unit, 1, 1);
    expect(moved).toBe(true);
    expect(unit.row).toBe(1);
    expect(unit.col).toBe(1);
    expect(manager.getUnitAt(1, 1)).toBe(unit);
    expect(manager.getUnitAt(0, 0)).toBeNull();
  });

  it('moveUnit returns false for impassable cell', () => {
    const tiles = makeTiles(TileType.Plain);
    tiles[1][1] = TileType.Mountain;
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const moved = manager.moveUnit(unit, 1, 1);
    expect(moved).toBe(false);
    expect(unit.row).toBe(0);
    expect(unit.col).toBe(0);
  });

  it('moveUnit returns false for occupied cell', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    manager.spawnUnit(UnitType.Archer, 1, 1, 1);
    const moved = manager.moveUnit(unit, 1, 1);
    expect(moved).toBe(false);
  });

  it('getAllUnits returns all spawned units', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const manager = new UnitManager(grid);

    manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    manager.spawnUnit(UnitType.Archer, 1, 1, 1);

    const all = manager.getAllUnits();
    expect(all.length).toBe(2);
  });
});

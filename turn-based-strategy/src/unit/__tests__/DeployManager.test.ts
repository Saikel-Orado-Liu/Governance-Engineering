import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { DeployManager } from '../DeployManager';
import { UnitType } from '../UnitType';
import { DEFAULT_GAME_CONFIG } from '../../config/GameConfig';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

describe('DeployManager', () => {
  it('deploys the correct number of units for both teams', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);
    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);

    const result = deployManager.executeDeploy();

    expect(result.deployed.length).toBe(DEFAULT_GAME_CONFIG.teamSize * 2);
    expect(result.failed.length).toBe(0);
  });

  it('deploys units with types matching the formation config', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);
    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);

    const result = deployManager.executeDeploy();

    const team0Units = result.deployed.filter(u => u.team === 0);
    for (let i = 0; i < DEFAULT_GAME_CONFIG.formations[0].length; i++) {
      expect(team0Units[i].type).toBe(DEFAULT_GAME_CONFIG.formations[0][i]);
    }

    const team1Units = result.deployed.filter(u => u.team === 1);
    for (let i = 0; i < DEFAULT_GAME_CONFIG.formations[1].length; i++) {
      expect(team1Units[i].type).toBe(DEFAULT_GAME_CONFIG.formations[1][i]);
    }
  });

  it('deploys units at the specified coordinates', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);
    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);

    const result = deployManager.executeDeploy();

    const team0Units = result.deployed.filter(u => u.team === 0);
    for (let i = 0; i < team0Units.length; i++) {
      expect(team0Units[i].row).toBe(DEFAULT_GAME_CONFIG.deployCoordinates[0][i].row);
      expect(team0Units[i].col).toBe(DEFAULT_GAME_CONFIG.deployCoordinates[0][i].col);
    }

    const team1Units = result.deployed.filter(u => u.team === 1);
    for (let i = 0; i < team1Units.length; i++) {
      expect(team1Units[i].row).toBe(DEFAULT_GAME_CONFIG.deployCoordinates[1][i].row);
      expect(team1Units[i].col).toBe(DEFAULT_GAME_CONFIG.deployCoordinates[1][i].col);
    }
  });

  it('falls back to adjacent cell when primary position is occupied', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);

    // Occupy team 0's first deploy position (0,0)
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);

    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);
    const result = deployManager.executeDeploy();

    // All 6 units should still be deployed (fallback handles blocking)
    expect(result.deployed.length).toBe(DEFAULT_GAME_CONFIG.teamSize * 2);
    expect(result.failed.length).toBe(0);

    // The pre-occupied cell (0,0) is still held by the original unit, not a deployed one
    const team0Units = result.deployed.filter(u => u.team === 0);
    const atPrimary = team0Units.some(u => u.row === 0 && u.col === 0);
    expect(atPrimary).toBe(false);
  });

  it('falls back to adjacent cell when primary position is impassable', () => {
    const tiles = makeTiles(TileType.Plain);
    // Make (0,0) impassable
    tiles[0][0] = TileType.Water;
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);

    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);
    const result = deployManager.executeDeploy();

    // All 6 units deployed via fallback
    expect(result.deployed.length).toBe(DEFAULT_GAME_CONFIG.teamSize * 2);
    expect(result.failed.length).toBe(0);

    // No unit should be at the impassable cell
    const team0Units = result.deployed.filter(u => u.team === 0);
    const atImpassable = team0Units.some(u => u.row === 0 && u.col === 0);
    expect(atImpassable).toBe(false);
  });

  it('adds to failed when both primary and all fallback positions are blocked', () => {
    const tiles = makeTiles(TileType.Plain);
    const grid = new MapGrid(tiles);
    const unitManager = new UnitManager(grid);

    // Block (0,0) and all its reachable adjacent cells
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 0, 1);
    unitManager.spawnUnit(UnitType.Warrior, 1, 1, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 1, 1);

    const deployManager = new DeployManager(unitManager, DEFAULT_GAME_CONFIG);
    const result = deployManager.executeDeploy();

    // Team 0 first unit: (0,0) blocked, all 3 valid fallbacks blocked → failed
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].team).toBe(0);
    expect(result.failed[0].intendedRow).toBe(0);
    expect(result.failed[0].intendedCol).toBe(0);

    // Remaining 5 units deployed successfully
    expect(result.deployed.length).toBe(DEFAULT_GAME_CONFIG.teamSize * 2 - 1);
  });
});

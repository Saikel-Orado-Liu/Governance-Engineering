import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { TurnManager } from '../TurnManager';
import { Phase } from '../PhaseTypes';
import { UnitType } from '../UnitType';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

function makeTurnManager() {
  const tiles = makeTiles(TileType.Plain);
  const grid = new MapGrid(tiles);
  const unitManager = new UnitManager(grid);
  const turnManager = new TurnManager(grid, unitManager);
  return { grid, unitManager, turnManager };
}

describe('TurnManager', () => {
  it('initial state is deploy', () => {
    const { turnManager } = makeTurnManager();
    expect(turnManager.getState()).toBe(Phase.Deploy);
    expect(turnManager.getCurrentTeam()).toBe(0);
  });

  it('changes state to enemy after endPlayerTurn', () => {
    const { unitManager, turnManager } = makeTurnManager();
    // Spawn both teams so game doesn't end from empty roster
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    expect(turnManager.getState()).toBe(Phase.EnemyAI);
  });

  it('enemy moves toward nearest player unit when not adjacent', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const player = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const enemy = unitManager.spawnUnit(UnitType.Mage, 1, 3, 3)!;

    const initialDist = Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
    expect(initialDist).toBe(6);

    turnManager.completeDeploy();
    const actions = turnManager.endPlayerTurn();

    // Enemy should have moved closer
    const moveAction = actions.find(a => a.action === 'move');
    expect(moveAction).toBeDefined();
    expect(moveAction!.from).toEqual({ row: 3, col: 3 });
    expect(moveAction!.to).toBeDefined();

    const distAfter = Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
    expect(distAfter).toBeLessThan(initialDist);
  });

  it('enemy attacks adjacent low-HP player unit', () => {
    const { unitManager, turnManager } = makeTurnManager();
    // Spawn two player units: one adjacent low-HP, one far away
    const lowHpUnit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 5);
    lowHpUnit.takeDamage(95); // actual=80, HP=20 after defense
    // Enemy adjacent to the low-HP unit
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 0, 1)!;

    turnManager.completeDeploy();
    const actions = turnManager.endPlayerTurn();

    const attackAction = actions.find(a => a.action === 'attack');
    expect(attackAction).toBeDefined();
    expect(attackAction!.target).toBe(lowHpUnit);
    expect(attackAction!.combatResult).toBeDefined();
    // low-HP unit should have taken damage
    expect(lowHpUnit.hp).toBeLessThan(20);
    // Enemy survives counter-attack
    expect(enemy.isAlive()).toBe(true);
  });

  it('sets gameOver when all player units are eliminated', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const player = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    // Manually eliminate the only player unit
    unitManager.removeUnit(player);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();
    expect(turnManager.getState()).toBe(Phase.End);
  });

  it('sets gameOver when all enemy units are eliminated', () => {
    const { unitManager, turnManager } = makeTurnManager();
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7)!;

    // Manually eliminate the only enemy unit
    unitManager.removeUnit(enemy);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();
    expect(turnManager.getState()).toBe(Phase.End);
  });
});

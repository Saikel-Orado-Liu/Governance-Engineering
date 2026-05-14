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

  it('changes state to enemy after full turn cycle (PlayerMove → PlayerCombat → EnemyAI)', () => {
    const { unitManager, turnManager } = makeTurnManager();
    // Spawn both teams so game doesn't end from empty roster
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    expect(turnManager.getState()).toBe(Phase.PlayerCombat);

    turnManager.endPlayerCombat();

    expect(turnManager.getState()).toBe(Phase.EnemyAI);
  });

  it('enemy moves toward nearest player unit when not adjacent', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const player = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const enemy = unitManager.spawnUnit(UnitType.Mage, 1, 3, 3)!;

    const initialDist = Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
    expect(initialDist).toBe(6);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();
    const actions = turnManager.endPlayerCombat();

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
    turnManager.endPlayerTurn();
    const actions = turnManager.endPlayerCombat();

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
    turnManager.endPlayerCombat();
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
    turnManager.endPlayerCombat();
    expect(turnManager.getState()).toBe(Phase.End);
  });

  it('endPlayerTurn transitions to PlayerCombat state', () => {
    const { unitManager, turnManager } = makeTurnManager();
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    expect(turnManager.getState()).toBe(Phase.PlayerCombat);
  });

  it('endPlayerCombat completes full cycle and transitions to EnemyAI', () => {
    const { unitManager, turnManager } = makeTurnManager();
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();
    turnManager.endPlayerCombat();

    expect(turnManager.getState()).toBe(Phase.EnemyAI);
  });

  it('markUnitActed and hasUnitActed track units correctly', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const unit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    expect(turnManager.hasUnitActed(unit)).toBe(false);

    turnManager.markUnitActed(unit);
    expect(turnManager.hasUnitActed(unit)).toBe(true);
  });

  it('isAllUnitsActed returns true only when all friendly units have acted', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const unit1 = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const unit2 = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 1)!;
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    expect(turnManager.isAllUnitsActed()).toBe(false);

    turnManager.markUnitActed(unit1);
    expect(turnManager.isAllUnitsActed()).toBe(false);

    turnManager.markUnitActed(unit2);
    expect(turnManager.isAllUnitsActed()).toBe(true);
  });

  it('getRemainingCombatUnits excludes dead and acted units', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const aliveUnit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const actedUnit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 1)!;
    const deadUnit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 2)!;
    unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    // All 3 alive units remain initially
    expect(turnManager.getRemainingCombatUnits()).toHaveLength(3);

    // Mark one as acted
    turnManager.markUnitActed(actedUnit);
    expect(turnManager.getRemainingCombatUnits()).toHaveLength(2);

    // Kill one unit
    deadUnit.takeDamage(9999);
    expect(turnManager.getRemainingCombatUnits()).toHaveLength(1);

    // Only aliveUnit should be in remaining
    const remaining = turnManager.getRemainingCombatUnits();
    expect(remaining).toContain(aliveUnit);
    expect(remaining).not.toContain(actedUnit);
    expect(remaining).not.toContain(deadUnit);
  });

  it('endPlayerCombat goes to Phase.End when all enemies are eliminated before enemy turn', () => {
    const { unitManager, turnManager } = makeTurnManager();
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0);
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 7, 7)!;

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();

    // Remove the only enemy unit before endPlayerCombat
    unitManager.removeUnit(enemy);

    turnManager.endPlayerCombat();
    expect(turnManager.getState()).toBe(Phase.End);
  });

  it('endPlayerCombat goes to Phase.End when all player units die during enemy turn', () => {
    const { unitManager, turnManager } = makeTurnManager();
    const player = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Warrior, 1, 0, 1);

    // Damage player so enemy attack will kill it (HP reduced to 10)
    player.takeDamage(105);

    turnManager.completeDeploy();
    turnManager.endPlayerTurn();
    turnManager.endPlayerCombat();

    expect(turnManager.getState()).toBe(Phase.End);
  });
});

import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { UnitType } from '../UnitType';
import { EnemyAI } from '../EnemyAI';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

function makeEnemyAI() {
  const tiles = makeTiles(TileType.Plain);
  const grid = new MapGrid(tiles);
  const unitManager = new UnitManager(grid);
  const enemyAI = new EnemyAI(grid, unitManager);
  return { grid, unitManager, enemyAI };
}

describe('EnemyAI', () => {
  it('findNearest returns closest unit by Manhattan distance', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 4, 4)!;
    const far = unitManager.spawnUnit(UnitType.Archer, 0, 0, 0)!;
    const close = unitManager.spawnUnit(UnitType.Mage, 0, 3, 3)!;

    const result = enemyAI.findNearest(enemy, [far, close]);
    expect(result).toBe(close);
  });

  it('findBestAdjacentMove produces a valid move toward target', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    const player = unitManager.spawnUnit(UnitType.Archer, 0, 3, 3)!;

    const move = enemyAI.findBestAdjacentMove(enemy, player);
    expect(move).not.toBeNull();
    if (move) {
      const distAfter = Math.abs(move.row - player.row) + Math.abs(move.col - player.col);
      const distBefore = Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
      expect(distAfter).toBeLessThan(distBefore);
      expect(move.row).toBeGreaterThanOrEqual(0);
      expect(move.row).toBeLessThan(GRID_SIZE);
      expect(move.col).toBeGreaterThanOrEqual(0);
      expect(move.col).toBeLessThan(GRID_SIZE);
    }
  });

  it('getAdjacentEnemies returns adjacent opponent units only', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    const adjacent = unitManager.spawnUnit(UnitType.Archer, 0, 5, 4)!;
    unitManager.spawnUnit(UnitType.Mage, 0, 0, 0);

    const result = enemyAI.getAdjacentEnemies(enemy);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(adjacent);
  });

  it('executeTurn produces move action when not adjacent to player', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Mage, 1, 3, 3)!;

    const actions = enemyAI.executeTurn();
    const moveAction = actions.find(a => a.action === 'move');
    expect(moveAction).toBeDefined();
    expect(moveAction!.from).toEqual({ row: 3, col: 3 });
  });

  it('executeTurn attacks adjacent low-HP target', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    const lowHpUnit = unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 5);
    lowHpUnit.takeDamage(95);
    unitManager.spawnUnit(UnitType.Warrior, 1, 0, 1)!;

    const actions = enemyAI.executeTurn();
    const attackAction = actions.find(a => a.action === 'attack');
    expect(attackAction).toBeDefined();
    expect(attackAction!.target).toBe(lowHpUnit);
  });

  it('executeTurn returns empty array when no player units exist', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    unitManager.spawnUnit(UnitType.Warrior, 1, 0, 0)!;

    const actions = enemyAI.executeTurn();
    expect(actions).toHaveLength(0);
  });
});

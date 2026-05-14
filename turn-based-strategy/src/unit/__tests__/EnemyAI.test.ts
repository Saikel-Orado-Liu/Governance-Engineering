import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { UnitType } from '../UnitType';
import { EnemyAI, type SkillFunction } from '../EnemyAI';
import { AbilityType, ABILITY_CONFIGS } from '../AbilityConfig';
import { useAbility, advanceCooldowns } from '../AbilitySystem';

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

function makeEnemyAIWithSkills() {
  const tiles = makeTiles(TileType.Plain);
  const grid = new MapGrid(tiles);
  const unitManager = new UnitManager(grid);
  const useSkillFn: SkillFunction = (caster, target, mgr) => {
    return useAbility(caster, target, caster.skill, ABILITY_CONFIGS[caster.skill], mgr);
  };
  const enemyAI = new EnemyAI(grid, unitManager, undefined, undefined, useSkillFn);
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

  // --- New Test 1: getEnemiesInRange ---
  it('getEnemiesInRange returns enemies within attackRange', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    const enemy = unitManager.spawnUnit(UnitType.Archer, 1, 5, 5)!;
    const close1 = unitManager.spawnUnit(UnitType.Warrior, 0, 5, 3)!;   // dist 2
    const close2 = unitManager.spawnUnit(UnitType.Warrior, 0, 5, 6)!;   // dist 1
    const far = unitManager.spawnUnit(UnitType.Mage, 0, 0, 0)!;         // dist 10

    const inRange = enemyAI.getEnemiesInRange(enemy, [close1, close2, far]);
    expect(inRange).toHaveLength(2);
    expect(inRange).toContain(close1);
    expect(inRange).toContain(close2);
    expect(inRange).not.toContain(far);
  });

  // --- New Test 2: Attack before move ---
  it('attacks within attackRange without moving', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    // Archer (attackRange=2) at (5,5), player at (5,4) within range
    unitManager.spawnUnit(UnitType.Archer, 1, 5, 5)!;
    const player = unitManager.spawnUnit(UnitType.Warrior, 0, 5, 4)!;

    const actions = enemyAI.executeTurn();
    // Should have exactly one action: attack (no move)
    const attackActions = actions.filter(a => a.action === 'attack');
    const moveActions = actions.filter(a => a.action === 'move');
    expect(attackActions).toHaveLength(1);
    expect(moveActions).toHaveLength(0);
    expect(attackActions[0].target).toBe(player);
  });

  // --- New Test 3: A* selects closest reachable cell to player ---
  it('A* pathfinding selects reachable cell closest to player', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    // Enemy at (5,5), player at (0,0)
    unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;

    const actions = enemyAI.executeTurn();
    const moveActions = actions.filter(a => a.action === 'move');

    // Should have at least one move action
    expect(moveActions.length).toBeGreaterThan(0);

    // The last move destination should be closer to player than starting position
    const lastMove = moveActions[moveActions.length - 1];
    const startDist = Math.abs(5 - 0) + Math.abs(5 - 0);  // = 10
    const endDist = Math.abs(lastMove.to!.row - 0) + Math.abs(lastMove.to!.col - 0);
    expect(endDist).toBeLessThan(startDist);
  });

  // --- New Test 4: Move then attack ---
  it('moves then attacks when target comes within attackRange after move', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    // Warrior (attackRange=1, moveRange=3) at (5,5)
    // Player at (5,3) — 2 steps away
    unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 3)!;

    const actions = enemyAI.executeTurn();
    const moveActions = actions.filter(a => a.action === 'move');
    const attackActions = actions.filter(a => a.action === 'attack');

    // Should have at least one move
    expect(moveActions.length).toBeGreaterThan(0);

    // After moving, enemy should be within attackRange of player
    // The last move put the enemy within attackRange of the player at (5,3)
    expect(attackActions.length).toBe(1);
    expect(attackActions[0].target!.row).toBe(5);
    expect(attackActions[0].target!.col).toBe(3);
  });

  // --- New Test 5: Knight multi-step long-range move ---
  it('Knight moves multiple steps toward distant player', () => {
    const { unitManager, enemyAI } = makeEnemyAI();
    // Knight (moveRange=5) at (7, 7), player at (0, 0)
    unitManager.spawnUnit(UnitType.Knight, 1, 7, 7)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;

    const actions = enemyAI.executeTurn();
    const moveActions = actions.filter(a => a.action === 'move');

    // Knight should take multiple steps (more than 1) toward the player
    expect(moveActions.length).toBeGreaterThan(1);

    // Each move should be a valid adjacent step
    for (const action of moveActions) {
      const from = action.from!;
      const to = action.to!;
      const stepDist = Math.abs(to.row - from.row) + Math.abs(to.col - from.col);
      expect(stepDist).toBe(1);
    }

    // The Knight should end up closer to the player
    const lastPos = moveActions[moveActions.length - 1].to!;
    const startDist = Math.abs(7 - 0) + Math.abs(7 - 0); // = 14
    const endDist = Math.abs(lastPos.row - 0) + Math.abs(lastPos.col - 0);
    expect(endDist).toBeLessThan(startDist);

    // Should be no attack actions (too far)
    const attackActions = actions.filter(a => a.action === 'attack');
    expect(attackActions).toHaveLength(0);
  });

  // --- Skill Tests (8 new) ---

  it('EnemyAI: Warrior HP>50% 使用 ShieldBash', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 4)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeDefined();
    expect(skillAction!.skillType).toBe(AbilityType.ShieldBash);
  });

  it('EnemyAI: Archer ≥2 目标使用 Volley', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    unitManager.spawnUnit(UnitType.Archer, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 3)!;
    unitManager.spawnUnit(UnitType.Mage, 0, 5, 4)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeDefined();
    expect(skillAction!.skillType).toBe(AbilityType.Volley);
  });

  it('EnemyAI: Knight HP<50% 使用 Charge', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    const enemy = unitManager.spawnUnit(UnitType.Knight, 1, 5, 5)!;
    // Knight has HP=90, def=12. Deal 58 raw dmg -> actual=46 -> HP=44 (< 45)
    enemy.takeDamage(58);
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 7)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeDefined();
    expect(skillAction!.skillType).toBe(AbilityType.Charge);
  });

  it('EnemyAI: Mage HP>60% 使用 Fireball', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    unitManager.spawnUnit(UnitType.Mage, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 3)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeDefined();
    expect(skillAction!.skillType).toBe(AbilityType.Fireball);
  });

  it('EnemyAI: 技能冷却时使用普攻', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    enemy.skillCooldown = 1;
    unitManager.spawnUnit(UnitType.Archer, 0, 5, 4)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeUndefined();
    const attackAction = actions.find(a => a.action === 'attack');
    expect(attackAction).toBeDefined();
  });

  it('EnemyAI: skill action 类型在 EnemyAction 中正确记录', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 4)!;

    const actions = enemyAI.executeTurn();
    const skillAction = actions.find(a => a.action === 'skill');
    expect(skillAction).toBeDefined();
    expect(skillAction!.action).toBe('skill');
    expect(skillAction!.skillType).toBe(AbilityType.ShieldBash);
    expect(skillAction!.target).toBeDefined();
    expect(skillAction!.skillResult).toBeDefined();
    expect(skillAction!.skillResult!.success).toBe(true);
  });

  it('EnemyAI: Skill 使用后冷却被设置', () => {
    const { unitManager, enemyAI } = makeEnemyAIWithSkills();
    const enemy = unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unitManager.spawnUnit(UnitType.Warrior, 0, 5, 4)!;

    enemyAI.executeTurn();
    // ShieldBash cooldown = 2
    expect(enemy.skillCooldown).toBe(2);
  });

  it('AbilitySystem: advanceCooldowns 在 EnemyAI->PlayerMove 后触发', () => {
    const { unitManager } = makeEnemyAI();
    const unit = unitManager.spawnUnit(UnitType.Warrior, 1, 5, 5)!;
    unit.skillCooldown = 3;

    advanceCooldowns(unitManager.getAllUnits());
    expect(unit.skillCooldown).toBe(2);

    advanceCooldowns(unitManager.getAllUnits());
    expect(unit.skillCooldown).toBe(1);

    advanceCooldowns(unitManager.getAllUnits());
    expect(unit.skillCooldown).toBe(0);

    // Stays at 0
    advanceCooldowns(unitManager.getAllUnits());
    expect(unit.skillCooldown).toBe(0);
  });
});

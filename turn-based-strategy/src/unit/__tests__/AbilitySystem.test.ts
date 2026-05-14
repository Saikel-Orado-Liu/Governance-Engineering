import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { UnitType } from '../UnitType';
import { AbilityType, ABILITY_CONFIGS } from '../AbilityConfig';
import { canUseAbility, useAbility, advanceCooldowns, getCooldown } from '../AbilitySystem';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

function makeManager(): UnitManager {
  const tiles = makeTiles(TileType.Plain);
  const grid = new MapGrid(tiles);
  return new UnitManager(grid);
}

describe('AbilitySystem', () => {
  describe('canUseAbility', () => {
    it('returns usable:true with valid parameters', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      const result = canUseAbility(caster, target, AbilityType.ShieldBash, config);
      expect(result.usable).toBe(true);
    });

    it('returns usable:false when caster is dead', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      caster.takeDamage(9999);
      expect(caster.isAlive()).toBe(false);

      const result = canUseAbility(caster, target, AbilityType.ShieldBash, config);
      expect(result.usable).toBe(false);
      expect(result.reason).toBe('Caster is dead');
    });

    it('returns usable:false when ability is None', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.None];

      const result = canUseAbility(caster, target, AbilityType.None, config);
      expect(result.usable).toBe(false);
      expect(result.reason).toBe('No ability selected');
    });

    it('returns usable:false when cooldown is active', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      caster.skillCooldown = 1;

      const result = canUseAbility(caster, target, AbilityType.ShieldBash, config);
      expect(result.usable).toBe(false);
      expect(result.reason).toContain('cooldown');
    });

    it('returns usable:false when target is out of range', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      // ShieldBash range=1, place target at distance 3
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 3)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      const result = canUseAbility(caster, target, AbilityType.ShieldBash, config);
      expect(result.usable).toBe(false);
      expect(result.reason).toContain('out of range');
    });
  });

  describe('useAbility', () => {
    it('deals correct damage and returns success', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      const result = useAbility(caster, target, AbilityType.ShieldBash, config, manager);

      expect(result.success).toBe(true);
      // ShieldBash damage=5, Knight def=12 => Math.max(1, 5-12) = 1
      expect(result.damageDealt).toBe(1);
      expect(result.targetDied).toBe(false);
    });

    it('sets cooldown on the caster after use', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      expect(caster.skillCooldown).toBe(0);

      useAbility(caster, target, AbilityType.ShieldBash, config, manager);

      // ShieldBash cooldown=2
      expect(caster.skillCooldown).toBe(2);
    });

    it('kills target and sets targetDied with removeUnit', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Mage, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Mage, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.Fireball];

      // Mage HP=60, def=3. Fireball: takeDamage(6) => Math.max(1, 6-3) = 3 damage.
      // Pre-damage so fireball kills: need target at 3 HP before ability.
      // takeDamage(raw): Math.max(1, raw-3) = 57 => raw = 60
      target.takeDamage(60);
      expect(target.hp).toBe(3);

      const result = useAbility(caster, target, AbilityType.Fireball, config, manager);

      expect(result.success).toBe(true);
      expect(result.targetDied).toBe(true);
      // Target should be removed from manager
      expect(manager.getUnitAt(0, 1)).toBeNull();
    });

    it('returns success:false when preconditions fail', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
      const target = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;
      const config = ABILITY_CONFIGS[AbilityType.ShieldBash];

      // Kill the caster
      caster.takeDamage(9999);

      const result = useAbility(caster, target, AbilityType.ShieldBash, config, manager);

      expect(result.success).toBe(false);
      expect(result.damageDealt).toBe(0);
    });
  });

  describe('useAbility — Volley AoE', () => {
    it('hits all enemies in diamond area (Manhattan distance <= 1) around target, 5 cells', () => {
      const manager = makeManager();
      // Volley range=3. Caster at (1,1), target at (2,3): dist = |1-2|+|1-3| = 3 <= 3 OK.
      const caster = manager.spawnUnit(UnitType.Archer, 0, 1, 1)!;
      const target = manager.spawnUnit(UnitType.Warrior, 1, 2, 3)!;
      // Diamond around (2,3) with |dr|+|dc| <= 1: (1,3), (2,2), (2,3), (2,4), (3,3)
      const enemyN = manager.spawnUnit(UnitType.Knight, 1, 1, 3)!;
      const enemyW = manager.spawnUnit(UnitType.Knight, 1, 2, 2)!;
      const enemyE = manager.spawnUnit(UnitType.Knight, 1, 2, 4)!;
      const enemyS = manager.spawnUnit(UnitType.Knight, 1, 3, 3)!;

      const config = ABILITY_CONFIGS[AbilityType.Volley];
      useAbility(caster, target, AbilityType.Volley, config, manager);

      // All 5 enemies in diamond area take damage (HP reduced)
      expect(target.hp).toBeLessThan(target.maxHp);
      expect(enemyN.hp).toBeLessThan(enemyN.maxHp);
      expect(enemyW.hp).toBeLessThan(enemyW.maxHp);
      expect(enemyE.hp).toBeLessThan(enemyE.maxHp);
      expect(enemyS.hp).toBeLessThan(enemyS.maxHp);
    });

    it('does NOT hit enemies at diagonal corners of 3x3 area (Manhattan distance = 2)', () => {
      const manager = makeManager();
      const caster = manager.spawnUnit(UnitType.Archer, 0, 1, 1)!;
      const target = manager.spawnUnit(UnitType.Warrior, 1, 2, 3)!;
      // Corners of 3x3 around (2,3): (1,2), (1,4), (3,2), (3,4) — ManhDist=2 > aoeRadius=1
      const c1 = manager.spawnUnit(UnitType.Knight, 1, 1, 2)!;
      const c2 = manager.spawnUnit(UnitType.Knight, 1, 1, 4)!;
      const c3 = manager.spawnUnit(UnitType.Knight, 1, 3, 2)!;
      const c4 = manager.spawnUnit(UnitType.Knight, 1, 3, 4)!;
      const saved = [c1.hp, c2.hp, c3.hp, c4.hp];

      const config = ABILITY_CONFIGS[AbilityType.Volley];
      useAbility(caster, target, AbilityType.Volley, config, manager);

      expect(c1.hp).toBe(saved[0]);
      expect(c2.hp).toBe(saved[1]);
      expect(c3.hp).toBe(saved[2]);
      expect(c4.hp).toBe(saved[3]);
    });
  });

  describe('advanceCooldowns', () => {
    it('decrements cooldown by 1 (minimum 0)', () => {
      const manager = makeManager();
      const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;

      unit.skillCooldown = 2;

      advanceCooldowns([unit]);
      expect(unit.skillCooldown).toBe(1);

      advanceCooldowns([unit]);
      expect(unit.skillCooldown).toBe(0);

      // Should not go below 0
      advanceCooldowns([unit]);
      expect(unit.skillCooldown).toBe(0);
    });
  });

  describe('getCooldown', () => {
    it('returns the current cooldown value', () => {
      const manager = makeManager();
      const unit = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;

      unit.skillCooldown = 3;
      expect(getCooldown(unit)).toBe(3);

      unit.skillCooldown = 0;
      expect(getCooldown(unit)).toBe(0);
    });
  });
});

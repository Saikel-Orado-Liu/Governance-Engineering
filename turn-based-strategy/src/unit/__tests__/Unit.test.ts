import { describe, it, expect } from 'vitest';
import { Unit } from '../Unit';
import { UnitType, UNIT_CONFIGS } from '../UnitType';

describe('Unit', () => {
  it('constructs each unit type with correct properties from config', () => {
    const types: UnitType[] = [UnitType.Warrior, UnitType.Archer, UnitType.Knight, UnitType.Mage];
    for (const type of types) {
      const unit = new Unit(type, 0, 0, 0);
      const config = UNIT_CONFIGS[type];
      expect(unit.type).toBe(type);
      expect(unit.team).toBe(0);
      expect(unit.hp).toBe(config.hp);
      expect(unit.maxHp).toBe(config.hp);
      expect(unit.atk).toBe(config.atk);
      expect(unit.def).toBe(config.def);
      expect(unit.attackRange).toBe(config.attackRange);
      expect(unit.moveRange).toBe(config.moveRange);
    }
  });

  it('takeDamage reduces hp by (rawDamage - def)', () => {
    const unit = new Unit(UnitType.Warrior, 0, 0, 0);
    const damage = unit.takeDamage(30);
    expect(damage).toBe(15); // 30 - 15 def
    expect(unit.hp).toBe(85); // 100 - 15
  });

  it('defense ensures minimum 1 damage', () => {
    const unit = new Unit(UnitType.Warrior, 0, 0, 0);
    const damage = unit.takeDamage(5);
    expect(damage).toBe(1); // min(1, 5-15) => 1
    expect(unit.hp).toBe(99);
  });

  it('damage does not reduce hp below 0', () => {
    const unit = new Unit(UnitType.Warrior, 0, 0, 0);
    unit.takeDamage(1000);
    expect(unit.hp).toBe(0);
  });

  it('getDamageMultiplierAgainst returns 1.5 for counter advantage', () => {
    const warrior = new Unit(UnitType.Warrior, 0, 0, 0);
    const archer = new Unit(UnitType.Archer, 1, 0, 1);
    expect(warrior.getDamageMultiplierAgainst(archer)).toBe(1.5);
  });

  it('getDamageMultiplierAgainst returns 0.67 for counter disadvantage', () => {
    const archer = new Unit(UnitType.Archer, 0, 0, 0);
    const warrior = new Unit(UnitType.Warrior, 1, 0, 1);
    expect(archer.getDamageMultiplierAgainst(warrior)).toBe(0.67);
  });

  it('getDamageMultiplierAgainst returns 1.0 for neutral matchup', () => {
    const warrior = new Unit(UnitType.Warrior, 0, 0, 0);
    const mage = new Unit(UnitType.Mage, 1, 0, 1);
    expect(warrior.getDamageMultiplierAgainst(mage)).toBe(1.0);
  });

  it('isAlive returns true when hp > 0', () => {
    const unit = new Unit(UnitType.Archer, 0, 0, 0);
    expect(unit.isAlive()).toBe(true);
  });

  it('isAlive returns false when hp is 0', () => {
    const unit = new Unit(UnitType.Archer, 0, 0, 0);
    unit.takeDamage(1000);
    expect(unit.isAlive()).toBe(false);
  });

  it('constructor creates a new Unit instance', () => {
    const unit = new Unit(UnitType.Mage, 1, 3, 4);
    expect(unit).toBeInstanceOf(Unit);
    expect(unit.type).toBe(UnitType.Mage);
    expect(unit.team).toBe(1);
    expect(unit.row).toBe(3);
    expect(unit.col).toBe(4);
  });
});

import { describe, it, expect } from 'vitest';
import { MapGrid, GRID_SIZE } from '../../map/MapGrid';
import { TileType } from '../../map/TileType';
import { UnitManager } from '../UnitManager';
import { executeCombat } from '../CombatSystem';
import { UnitType } from '../UnitType';

function makeTiles(fill: TileType): TileType[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));
}

function makeManager(): UnitManager {
  const tiles = makeTiles(TileType.Plain);
  const grid = new MapGrid(tiles);
  return new UnitManager(grid);
}

describe('CombatSystem', () => {
  it('deals correct base damage', () => {
    const manager = makeManager();
    const warrior = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const knight = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;

    // Warrior atk=25, Knight def=12, mult 0.67 (Knight counters Warrior)
    // atkDamage = Math.round(Math.max(1, 25-12) * 0.67) = Math.round(13 * 0.67) = 9
    const result = executeCombat(warrior, knight, manager);

    expect(result.damageDealt).toBe(9);
    expect(knight.hp).toBe(81);

    // Knight counter: atk=22, Warrior def=15, mult 1.5 (Knight counters Warrior)
    // defDamage = Math.round(Math.max(1, 22-15) * 1.5) = Math.round(7 * 1.5) = 11
    expect(result.damageReceived).toBe(11);
    expect(warrior.hp).toBe(89);

    expect(result.defenderDied).toBe(false);
    expect(result.attackerDied).toBe(false);
    expect(knight.isAlive()).toBe(true);
    expect(warrior.isAlive()).toBe(true);
  });

  it('defender counter-attacks when surviving initial hit', () => {
    const manager = makeManager();
    const knight = manager.spawnUnit(UnitType.Knight, 0, 0, 0)!;
    const mage = manager.spawnUnit(UnitType.Mage, 1, 0, 1)!;

    // Knight atk=22, Mage def=3, mult 0.67 (Mage counters Knight)
    // atkDamage = Math.round(Math.max(1, 22-3) * 0.67) = Math.round(19 * 0.67) = 13
    const result = executeCombat(knight, mage, manager);

    expect(result.damageDealt).toBe(13);
    expect(mage.hp).toBe(47);
    expect(mage.isAlive()).toBe(true);

    // Mage counter: atk=35, Knight def=12, mult 1.5 (Mage counters Knight)
    // defDamage = Math.round(Math.max(1, 35-12) * 1.5) = Math.round(23 * 1.5) = 35
    expect(result.damageReceived).toBe(35);
    expect(knight.hp).toBe(55);
  });

  it('sets defenderDied when attacker kills defender', () => {
    const manager = makeManager();
    const archer = manager.spawnUnit(UnitType.Archer, 0, 0, 0)!;
    const mage = manager.spawnUnit(UnitType.Mage, 1, 0, 1)!;

    // Pre-damage the mage so the hit kills it
    mage.takeDamage(25); // reduces to 60-25=35

    // Archer atk=30, Mage def=3, mult 1.5 (Archer counters Mage)
    // damage = Math.round(Math.max(1, 30-3) * 1.5) = Math.round(27 * 1.5) = 41
    // Mage HP: 35 - 41 = 0 (dead)
    const result = executeCombat(archer, mage, manager);

    expect(result.damageDealt).toBe(41);
    expect(result.defenderDied).toBe(true);
    expect(mage.isAlive()).toBe(false);

    // Defender is removed from manager
    expect(manager.getUnitAt(0, 1)).toBeNull();

    // No counter-attack since defender died
    expect(result.damageReceived).toBe(0);
    expect(result.attackerDied).toBe(false);
  });

  it('sets attackerDied when defender counter-kills attacker', () => {
    const manager = makeManager();
    const warrior = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const knight = manager.spawnUnit(UnitType.Knight, 1, 0, 1)!;

    // Pre-damage the warrior so the counter-attack kills it
    // takeDamage(105): actual = Math.max(1, 105-15) = 90, HP = 100-90 = 10
    warrior.takeDamage(105);

    // Warrior atk=25, Knight def=12, mult 0.67 (Knight counters Warrior)
    // atkDamage = Math.round(Math.max(1, 25-12) * 0.67) = 9
    // Knight HP: 90 - 9 = 81 (survives)
    // Knight counter: atk=22, Warrior def=15, mult 1.5 (Knight counters Warrior)
    // defDamage = Math.round(Math.max(1, 22-15) * 1.5) = 11
    // Warrior HP: 10 - 11 = 0 (dead)
    const result = executeCombat(warrior, knight, manager);

    expect(result.defenderDied).toBe(false);
    expect(knight.isAlive()).toBe(true);

    expect(result.attackerDied).toBe(true);
    expect(warrior.isAlive()).toBe(false);
    expect(manager.getUnitAt(0, 0)).toBeNull();
  });

  it('applies counter multiplier 1.5x when attacker has advantage', () => {
    const manager = makeManager();
    const warrior = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const archer = manager.spawnUnit(UnitType.Archer, 1, 0, 1)!;

    // Warrior counters Archer => 1.5x
    // damage = Math.round(Math.max(1, 25-5) * 1.5) = Math.round(20 * 1.5) = 30
    // Archer HP: 70 - 30 = 40
    const result = executeCombat(warrior, archer, manager);

    expect(result.damageDealt).toBe(30);
    expect(archer.hp).toBe(40);

    // Archer counter: atk=30, Warrior def=15, mult 0.67 (disadvantage for Archer)
    // Math.round(Math.max(1, 30-15) * 0.67) = Math.round(15 * 0.67) = Math.round(10.05) = 10
    expect(result.damageReceived).toBe(10);
    expect(warrior.hp).toBe(90);
  });

  it('applies disadvantage multiplier 0.67x when attacker is countered', () => {
    const manager = makeManager();
    const archer = manager.spawnUnit(UnitType.Archer, 0, 0, 0)!;
    const warrior = manager.spawnUnit(UnitType.Warrior, 1, 0, 1)!;

    // Archer vs Warrior: disadvantage 0.67x
    // damage = Math.round(Math.max(1, 30-15) * 0.67) = Math.round(15 * 0.67) = 10
    // Warrior HP: 100 - 10 = 90
    const result = executeCombat(archer, warrior, manager);

    expect(result.damageDealt).toBe(10);
    expect(warrior.hp).toBe(90);

    // Warrior counter: atk=25, Archer def=5, mult 1.5 (Warrior counters Archer)
    // Math.round(Math.max(1, 25-5) * 1.5) = 30
    expect(result.damageReceived).toBe(30);
    expect(archer.hp).toBe(40);
  });

  it('guarantees minimum 1 damage even when atk is lower than def', () => {
    const manager = makeManager();
    const knight = manager.spawnUnit(UnitType.Knight, 0, 0, 0)!;
    const warrior = manager.spawnUnit(UnitType.Warrior, 1, 0, 1)!;

    // Knight atk=22, Warrior def=15 => base = Math.round(Math.max(1, 22-15) * 1.5(Knight vs Warrior)) = Math.round(7 * 1.5) = 11
    // Not minimal. Let's override.
    Object.defineProperty(knight, 'atk', { value: 5 });

    // Knight (atk=5) attacks Warrior (def=15) => base = Math.round(Math.max(1, 5-15) * 1.5) = Math.round(1 * 1.5) = 2
    const result = executeCombat(knight, warrior, manager);

    expect(result.damageDealt).toBe(2);
    expect(warrior.hp).toBe(98);

    // Warrior counter: atk=25, Knight def=12, mult 0.67 (Warrior vs Knight: disadvantage)
    // Math.round(Math.max(1, 25-12) * 0.67) = Math.round(13 * 0.67) = Math.round(8.71) = 9
    expect(result.damageReceived).toBe(9);
  });

  it('removes dead unit from manager', () => {
    const manager = makeManager();
    const mage = manager.spawnUnit(UnitType.Mage, 0, 0, 0)!;
    const archer = manager.spawnUnit(UnitType.Archer, 1, 0, 1)!;

    // Pre-damage archer so it dies
    archer.takeDamage(65); // HP: 5 remaining

    // Mage atk=35, Archer def=5, mult 0.67 (Mage vs Archer: disadvantage)
    // damage = Math.round(Math.max(1, 35-5) * 0.67) = Math.round(30 * 0.67) = 20
    // Archer HP: 5 - 20 = 0 (dead)
    const result = executeCombat(mage, archer, manager);

    expect(result.defenderDied).toBe(true);
    expect(archer.isAlive()).toBe(false);
    expect(manager.getUnitAt(0, 1)).toBeNull();
    expect(manager.getAllUnits().length).toBe(1); // only mage remains
  });

  it('prevents both attacker and defender from dying in one combat round', () => {
    const manager = makeManager();
    const warrior = manager.spawnUnit(UnitType.Warrior, 0, 0, 0)!;
    const archer = manager.spawnUnit(UnitType.Archer, 1, 0, 1)!;

    // Pre-damage both to very low HP
    warrior.takeDamage(95); // warrior HP: 5
    archer.takeDamage(65);  // archer HP: 5

    // Warrior atk=25, Archer def=5, mult 1.5 (Warrior counters Archer)
    // atkDamage = Math.round(Math.max(1, 25-5) * 1.5) = Math.round(20 * 1.5) = 30
    // Archer HP: 5 - 30 = 0 (dead)
    const result = executeCombat(warrior, archer, manager);

    expect(result.defenderDied).toBe(true);
    expect(archer.isAlive()).toBe(false);
    expect(manager.getUnitAt(0, 1)).toBeNull();

    // No counter-attack occurs because defender died
    expect(result.damageReceived).toBe(0);
    expect(result.attackerDied).toBe(false);
    expect(warrior.isAlive()).toBe(true); // Low-HP attacker survives
    expect(manager.getUnitAt(0, 0)).not.toBeNull();
  });
});

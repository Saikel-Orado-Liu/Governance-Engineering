export const enum UnitType {
  Warrior = 0,
  Archer = 1,
  Knight = 2,
  Mage = 3,
}

export interface UnitConfig {
  name: string;
  hp: number;
  atk: number;
  def: number;
  attackRange: number;
  moveRange: number;
  color: string;
  symbol: string;
}

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  [UnitType.Warrior]: { name: 'Warrior', hp: 100, atk: 25, def: 15, attackRange: 1, moveRange: 3, color: '#c0392b', symbol: 'W' },
  [UnitType.Archer]: { name: 'Archer', hp: 70, atk: 30, def: 5, attackRange: 2, moveRange: 3, color: '#27ae60', symbol: 'A' },
  [UnitType.Knight]: { name: 'Knight', hp: 90, atk: 22, def: 12, attackRange: 1, moveRange: 5, color: '#8e44ad', symbol: 'K' },
  [UnitType.Mage]: { name: 'Mage', hp: 60, atk: 35, def: 3, attackRange: 3, moveRange: 2, color: '#2980b9', symbol: 'M' },
};

// Warrior -> Archer, Archer -> Mage, Mage -> Knight, Knight -> Warrior
export const COUNTER_TABLE: Record<UnitType, UnitType> = {
  [UnitType.Warrior]: UnitType.Archer,
  [UnitType.Archer]: UnitType.Mage,
  [UnitType.Knight]: UnitType.Warrior,
  [UnitType.Mage]: UnitType.Knight,
};

export function getCounterMultiplier(attacker: UnitType, defender: UnitType): number {
  if (COUNTER_TABLE[attacker] === defender) {
    return 1.5;
  }
  if (COUNTER_TABLE[defender] === attacker) {
    return 0.67;
  }
  return 1.0;
}

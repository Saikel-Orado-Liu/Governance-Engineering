import { Unit } from './Unit';
import { UNIT_CONFIGS } from './UnitType';
import type { UnitManager } from './UnitManager';
import { DIRECTION_OFFSETS } from '../core/Coordinate';

export interface CombatResult {
  attacker: Unit;
  defender: Unit;
  damageDealt: number;
  damageReceived: number;
  attackerDied: boolean;
  defenderDied: boolean;
  log: string[];
}

export function executeCombat(attacker: Unit, defender: Unit, unitManager: UnitManager): CombatResult {
  const log: string[] = [];

  // Attacker strikes first
  const atkDamage = Math.round(Math.max(1, attacker.atk - defender.def) * attacker.getDamageMultiplierAgainst(defender));
  defender.takeDamage(atkDamage + defender.def);
  log.push(`${UNIT_CONFIGS[attacker.type].name} attacks ${UNIT_CONFIGS[defender.type].name}, dealing ${atkDamage} damage`);

  const defenderDied = !defender.isAlive();
  let attackerDied = false;
  let damageReceived = 0;

  if (defenderDied) {
    unitManager.removeUnit(defender);
  }

  // Counter-attack if defender survived
  let defDamage = 0;
  if (defender.isAlive()) {
    // Check adjacency for melee counter
    const isAdjacent = DIRECTION_OFFSETS.some(
      ([dr, dc]) => attacker.row === defender.row + dr && attacker.col === defender.col + dc
    );
    if (isAdjacent) {
      defDamage = Math.round(Math.max(1, defender.atk - attacker.def) * defender.getDamageMultiplierAgainst(attacker));
      attacker.takeDamage(defDamage + attacker.def);
      damageReceived = defDamage;
      log.push(`${UNIT_CONFIGS[defender.type].name} counter-attacks ${UNIT_CONFIGS[attacker.type].name}, dealing ${defDamage} damage`);

      attackerDied = !attacker.isAlive();
      if (attackerDied) {
        unitManager.removeUnit(attacker);
      }
    }
  }

  return {
    attacker,
    defender,
    damageDealt: atkDamage,
    damageReceived,
    attackerDied,
    defenderDied,
    log,
  };
}

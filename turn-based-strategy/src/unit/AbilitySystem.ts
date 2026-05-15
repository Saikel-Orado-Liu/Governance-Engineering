import { AbilityType, type AbilityConfig } from './AbilityConfig';
import { Unit } from './Unit';
import { UNIT_CONFIGS } from './UnitType';
import type { UnitManager } from './UnitManager';

interface CanUseAbilityResult {
  usable: boolean;
  reason?: string;
}

export interface AbilityResult {
  success: boolean;
  caster: Unit;
  target: Unit;
  abilityType: AbilityType;
  damageDealt: number;
  targetDied: boolean;
  log: string[];
}

export function canUseAbility(
  caster: Unit,
  target: Unit,
  abilityType: AbilityType,
  config: AbilityConfig,
): CanUseAbilityResult {
  if (!caster.isAlive()) {
    return { usable: false, reason: 'Caster is dead' };
  }
  if (abilityType === AbilityType.None) {
    return { usable: false, reason: 'No ability selected' };
  }
  if (caster.skillCooldown > 0) {
    return { usable: false, reason: `Ability on cooldown: ${caster.skillCooldown} turns remaining` };
  }
  const dist = Math.abs(caster.row - target.row) + Math.abs(caster.col - target.col);
  if (dist > config.range) {
    return { usable: false, reason: `Target out of range (${dist} > ${config.range})` };
  }
  // Charge requires straight line (same row or same column)
  if (abilityType === AbilityType.Charge) {
    if (caster.row !== target.row && caster.col !== target.col) {
      return { usable: false, reason: 'Charge requires a straight line (same row or column)' };
    }
  }
  return { usable: true };
}

function executeVolley(
  caster: Unit, target: Unit, config: AbilityConfig, unitManager: UnitManager
): { totalDamage: number; targetDied: boolean; log: string[] } {
  const log: string[] = [];
  let totalDamage = 0;
  let targetDied = false;
  const aoeRadius = config.aoeRadius ?? 1;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (Math.abs(dr) + Math.abs(dc) > aoeRadius) continue;
      const unit = unitManager.getUnitAt(target.row + dr, target.col + dc);
      if (unit && unit.team !== caster.team && unit.isAlive()) {
        const rawDmg = Math.round(config.damage * 0.7);
        const actual = unit.takeDamage(rawDmg);
        totalDamage += actual;
        log.push(`Volley hits ${UNIT_CONFIGS[unit.type].name} for ${actual} damage`);
        if (!unit.isAlive()) {
          unitManager.removeUnit(unit);
          if (unit === target) targetDied = true;
          log.push(`${UNIT_CONFIGS[unit.type].name} is defeated`);
        }
      }
    }
  }
  return { totalDamage, targetDied, log };
}

function executeCharge(
  caster: Unit, target: Unit, config: AbilityConfig, unitManager: UnitManager
): { totalDamage: number; targetDied: boolean; log: string[] } {
  const log: string[] = [];
  let totalDamage = 0;
  let targetDied = false;
  const dr = target.row === caster.row ? 0 : (target.row > caster.row ? 1 : -1);
  const dc = target.col === caster.col ? 0 : (target.col > caster.col ? 1 : -1);
  let hitUnit: Unit | null = null;
  for (let i = 1; i <= config.range; i++) {
    const r = caster.row + dr * i;
    const c = caster.col + dc * i;
    const unit = unitManager.getUnitAt(r, c);
    if (unit && unit.team !== caster.team) {
      hitUnit = unit;
      break;
    }
  }
  if (hitUnit) {
    const rawDmg = Math.round(config.damage * 1.2);
    const actual = hitUnit.takeDamage(rawDmg);
    totalDamage = actual;
    log.push(`Charge hits ${UNIT_CONFIGS[hitUnit.type].name} for ${actual} damage`);
    if (!hitUnit.isAlive()) {
      unitManager.removeUnit(hitUnit);
      targetDied = hitUnit === target;
      log.push(`${UNIT_CONFIGS[hitUnit.type].name} is defeated`);
    }
  } else {
    log.push('Charge finds no enemy on path');
  }
  return { totalDamage, targetDied, log };
}

function executeShieldBash(
  _caster: Unit, target: Unit, config: AbilityConfig, unitManager: UnitManager
): { totalDamage: number; targetDied: boolean; log: string[] } {
  const log: string[] = [];
  const actual = target.takeDamage(config.damage);
  log.push(`${config.name} hits ${UNIT_CONFIGS[target.type].name} for ${actual} damage`);
  target.effects.push({ type: 'skipTurn', duration: 1 });
  let targetDied = false;
  if (!target.isAlive()) {
    unitManager.removeUnit(target);
    targetDied = true;
    log.push(`${UNIT_CONFIGS[target.type].name} is defeated`);
  }
  return { totalDamage: actual, targetDied, log };
}

function executeFireball(
  _caster: Unit, target: Unit, config: AbilityConfig, unitManager: UnitManager
): { totalDamage: number; targetDied: boolean; log: string[] } {
  const log: string[] = [];
  const actual = target.takeDamage(config.damage);
  log.push(`${config.name} hits ${UNIT_CONFIGS[target.type].name} for ${actual} damage`);
  let targetDied = false;
  if (!target.isAlive()) {
    unitManager.removeUnit(target);
    targetDied = true;
    log.push(`${UNIT_CONFIGS[target.type].name} is defeated`);
  }
  return { totalDamage: actual, targetDied, log };
}

export function useAbility(
  caster: Unit,
  target: Unit,
  abilityType: AbilityType,
  config: AbilityConfig,
  unitManager: UnitManager,
): AbilityResult {
  const log: string[] = [];

  const check = canUseAbility(caster, target, abilityType, config);
  if (!check.usable) {
    return { success: false, caster, target, abilityType, damageDealt: 0, targetDied: false, log: [check.reason ?? ''] };
  }

  // Set cooldown
  caster.skillCooldown = config.cooldown;

  let totalDamage = 0;
  let targetDied = false;

  if (abilityType === AbilityType.Volley) {
    const result = executeVolley(caster, target, config, unitManager);
    totalDamage = result.totalDamage;
    targetDied = result.targetDied;
    log.push(...result.log);
  } else if (abilityType === AbilityType.Charge) {
    const result = executeCharge(caster, target, config, unitManager);
    totalDamage = result.totalDamage;
    targetDied = result.targetDied;
    log.push(...result.log);
  } else if (abilityType === AbilityType.ShieldBash) {
    const result = executeShieldBash(caster, target, config, unitManager);
    totalDamage = result.totalDamage;
    targetDied = result.targetDied;
    log.push(...result.log);
  } else if (abilityType === AbilityType.Fireball) {
    const result = executeFireball(caster, target, config, unitManager);
    totalDamage = result.totalDamage;
    targetDied = result.targetDied;
    log.push(...result.log);
  }

  return {
    success: true,
    caster,
    target,
    abilityType,
    damageDealt: totalDamage,
    targetDied,
    log,
  };
}

export function advanceCooldowns(units: Unit[]): void {
  for (const unit of units) {
    if (unit.skillCooldown > 0) {
      unit.skillCooldown--;
    }
  }
}

export function getCooldown(unit: Unit): number {
  return unit.skillCooldown;
}

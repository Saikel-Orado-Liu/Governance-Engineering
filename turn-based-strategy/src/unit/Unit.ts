import { UnitType, UNIT_CONFIGS, getCounterMultiplier } from './UnitType';

export class Unit {
  readonly type: UnitType;
  readonly team: number;
  private _row: number;
  private _col: number;
  private _hp: number;

  get row(): number { return this._row; }
  get col(): number { return this._col; }
  get hp(): number { return this._hp; }
  readonly maxHp: number;
  readonly atk: number;
  readonly def: number;
  readonly attackRange: number;
  readonly moveRange: number;

  constructor(type: UnitType, team: number, row: number, col: number) {
    const config = UNIT_CONFIGS[type];
    this.type = type;
    this.team = team;
    this._row = row;
    this._col = col;
    this._hp = config.hp;
    this.maxHp = config.hp;
    this.atk = config.atk;
    this.def = config.def;
    this.attackRange = config.attackRange;
    this.moveRange = config.moveRange;
  }

  isAlive(): boolean {
    return this._hp > 0;
  }

  takeDamage(rawDamage: number): number {
    const actualDamage = Math.max(1, rawDamage - this.def);
    this._hp = Math.max(0, this._hp - actualDamage);
    return actualDamage;
  }

  getDamageMultiplierAgainst(target: Unit): number {
    return getCounterMultiplier(this.type, target.type);
  }

  setPosition(row: number, col: number): void {
    this._row = row;
    this._col = col;
  }
}

import type { Unit } from '../unit/Unit';
import { AbilityType, ABILITY_CONFIGS } from '../unit/AbilityConfig';

const UNIT_TYPE_NAMES: Record<number, string> = {
  0: '战士',
  1: '弓手',
  2: '骑士',
  3: '法师',
};

export class UnitPanel {
  readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.className = 'unit-panel';
    this.container.innerHTML = this.buildHTML();
    this.container.style.display = 'none';
  }

  private buildHTML(): string {
    return [
      '<div class="unit-panel-header">',
      '  <span class="unit-panel-name"></span>',
      '</div>',
      '<div class="unit-panel-hp-row">',
      '  <span class="unit-panel-label">HP</span>',
      '  <div class="unit-panel-hp-bar-bg">',
      '    <div class="unit-panel-hp-bar-fill"></div>',
      '  </div>',
      '  <span class="unit-panel-hp-text"></span>',
      '</div>',
      '<div class="unit-panel-stats">',
      '  <div class="unit-panel-stat">ATK: <span class="unit-panel-atk"></span></div>',
      '  <div class="unit-panel-stat">DEF: <span class="unit-panel-def"></span></div>',
      '</div>',
      '<div class="unit-panel-skill">',
      '  <span class="unit-panel-skill-label">技能: </span>',
      '  <span class="unit-panel-skill-name"></span>',
      '</div>',
    ].join('');
  }

  update(unit: Unit | null, isEnemy: boolean): void {
    if (!unit) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = '';

    const nameEl = this.container.querySelector('.unit-panel-name') as HTMLElement;
    nameEl.textContent = UNIT_TYPE_NAMES[unit.type] ?? String(unit.type);

    const fillEl = this.container.querySelector('.unit-panel-hp-bar-fill') as HTMLElement;
    const hpTextEl = this.container.querySelector('.unit-panel-hp-text') as HTMLElement;
    const ratio = unit.hp / unit.maxHp;
    fillEl.style.width = `${Math.max(0, ratio * 100)}%`;
    fillEl.style.background = isEnemy ? '#e74c3c' : '#2ecc71';
    hpTextEl.textContent = `${unit.hp}/${unit.maxHp}`;

    const atkEl = this.container.querySelector('.unit-panel-atk') as HTMLElement;
    const defEl = this.container.querySelector('.unit-panel-def') as HTMLElement;
    atkEl.textContent = String(unit.atk);
    defEl.textContent = String(unit.def);

    const skillNameEl = this.container.querySelector('.unit-panel-skill-name') as HTMLElement;
    const config = ABILITY_CONFIGS[unit.skill];
    if (config && config.id !== AbilityType.None) {
      const cdText = unit.skillCooldown > 0 ? ` (CD:${unit.skillCooldown})` : '';
      skillNameEl.textContent = `${config.name}${cdText}`;
    } else {
      skillNameEl.textContent = '';
    }
  }
}

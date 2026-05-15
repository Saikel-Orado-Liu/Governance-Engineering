import type { Unit } from '../unit/Unit';
import { AbilityType, ABILITY_CONFIGS } from '../unit/AbilityConfig';
import { worldToScreen } from '../render/IsometricRenderer';
import type { MapRenderer } from '../map/MapRenderer';

const UNIT_TYPE_NAMES: Record<number, string> = {
  0: '战士',
  1: '弓手',
  2: '骑士',
  3: '法师',
};

export class ActionPanel {
  private container: HTMLElement;
  private onSkillSelect: (type: AbilityType) => void;

  constructor(options: { onSkillSelect: (type: AbilityType) => void }) {
    this.onSkillSelect = options.onSkillSelect;

    this.container = document.createElement('div');
    this.container.className = 'action-panel';
    this.container.style.display = 'none';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);
  }

  private buildHTML(): string {
    return [
      '<div class="ap-header">',
      '  <span class="ap-name"></span>',
      '</div>',
      '<div class="ap-hp-row">',
      '  <span class="ap-label">HP</span>',
      '  <div class="ap-hp-bar-bg">',
      '    <div class="ap-hp-bar-fill"></div>',
      '  </div>',
      '  <span class="ap-hp-text"></span>',
      '</div>',
      '<div class="ap-stats">',
      '  <span class="ap-stat">ATK: <span class="ap-atk"></span></span>',
      '  <span class="ap-stat">DEF: <span class="ap-def"></span></span>',
      '</div>',
      '<div class="ap-skill-row">',
      '  <span class="ap-skill-label">技能: </span>',
      '  <span class="ap-skill-name"></span>',
      '</div>',
      '<div class="ap-skills-bar"></div>',
    ].join('');
  }

  update(
    unit: Unit | null,
    isEnemy: boolean,
    unactedUnits: Unit[],
    _actedUnits: Set<Unit>,
    selectedSkill: AbilityType | null,
  ): void {

    if (!unit) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';

    // Unit name
    const nameEl = this.container.querySelector('.ap-name') as HTMLElement;
    nameEl.textContent = UNIT_TYPE_NAMES[unit.type] ?? String(unit.type);

    // HP bar
    const fillEl = this.container.querySelector('.ap-hp-bar-fill') as HTMLElement;
    const hpTextEl = this.container.querySelector('.ap-hp-text') as HTMLElement;
    const ratio = unit.hp / unit.maxHp;
    fillEl.style.width = `${Math.max(0, ratio * 100)}%`;
    fillEl.style.background = isEnemy ? '#e74c3c' : '#2ecc71';
    hpTextEl.textContent = `${unit.hp}/${unit.maxHp}`;

    // ATK/DEF
    const atkEl = this.container.querySelector('.ap-atk') as HTMLElement;
    const defEl = this.container.querySelector('.ap-def') as HTMLElement;
    atkEl.textContent = String(unit.atk);
    defEl.textContent = String(unit.def);

    // Skill name + cooldown
    const skillNameEl = this.container.querySelector('.ap-skill-name') as HTMLElement;
    const config = ABILITY_CONFIGS[unit.skill];
    if (config && config.id !== AbilityType.None) {
      const cdText = unit.skillCooldown > 0 ? ` (CD:${unit.skillCooldown})` : '';
      skillNameEl.textContent = `${config.name}${cdText}`;
    } else {
      skillNameEl.textContent = '';
    }

    // Skill buttons for unacted units
    const skillsBar = this.container.querySelector('.ap-skills-bar') as HTMLElement;
    skillsBar.innerHTML = '';

    for (const u of unactedUnits) {
      const cfg = ABILITY_CONFIGS[u.skill];
      const cdText = u.skillCooldown > 0 ? ` (CD:${u.skillCooldown})` : '';
      const btn = document.createElement('button');
      btn.className = 'ap-skill-btn';
      btn.textContent = `${cfg.name}${cdText}`;

      if (u.skillCooldown > 0) {
        btn.classList.add('on-cooldown');
        btn.disabled = true;
      } else {
        if (unit === u && selectedSkill === u.skill) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
          this.onSkillSelect(u.skill);
        });
      }
      skillsBar.appendChild(btn);
    }
  }

  showAt(
    worldRow: number,
    worldCol: number,
    canvas: HTMLCanvasElement,
    mapRenderer: MapRenderer,
  ): void {
    const { x, y } = worldToScreen(worldRow, worldCol, mapRenderer.originX, mapRenderer.originY);

    // Convert canvas-relative coordinates to viewport coordinates
    const rect = canvas.getBoundingClientRect();
    const viewX = rect.left + x;
    const viewY = rect.top + y;

    // Default: appear to the right of the unit
    let panelLeft = viewX + 40;
    let panelTop = viewY - 20;

    // Estimate panel dimensions for boundary detection
    const panelWidth = 260;
    const panelHeight = 220;

    // Check right edge overflow — move to left of unit
    if (panelLeft + panelWidth > window.innerWidth) {
      panelLeft = viewX - panelWidth - 40;
    }

    // Check left edge (if we moved to the left and now overflow)
    if (panelLeft < 4) {
      panelLeft = 4; // don't go off screen left edge
    }

    // Check bottom edge overflow — move up
    if (panelTop + panelHeight > window.innerHeight) {
      panelTop = window.innerHeight - panelHeight - 10;
    }

    // Check top edge
    if (panelTop < 4) {
      panelTop = 4;
    }

    this.container.style.left = `${panelLeft}px`;
    this.container.style.top = `${panelTop}px`;
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}

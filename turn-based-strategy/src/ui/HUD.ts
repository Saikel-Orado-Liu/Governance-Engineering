import type { Unit } from '../unit/Unit';
import type { MapGrid } from '../map/MapGrid';
import { GRID_SIZE } from '../map/MapGrid';
import { TileType } from '../map/TileType';
import { Phase } from '../unit/PhaseTypes';
import { type AbilityType, ABILITY_CONFIGS } from '../unit/AbilityConfig';
import { UnitPanel } from './UnitPanel';

const TILE_MINIMAP_COLORS: Record<TileType, string> = {
  [TileType.Plain]: '#4a7c2e',
  [TileType.Forest]: '#2d5a1e',
  [TileType.Mountain]: '#6b5b45',
  [TileType.Water]: '#3a7bd5',
};

export interface HUDOptions {
  container: HTMLElement;
  unitPanel: UnitPanel;
  onEndTurn: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSkillSelect: (type: AbilityType) => void;
}

export class HUD {
  private container: HTMLElement;
  private unitPanel: UnitPanel;
  private onEndTurn: () => void;
  private onPause: () => void;
  private onRestart: () => void;
  private onSkillSelect: (type: AbilityType) => void;

  private topBar: HTMLElement;
  private rightPanel: HTMLElement;
  private bottomBar: HTMLElement;
  private phaseText: HTMLElement;
  private teamText: HTMLElement;
  private guideText: HTMLElement;
  private skillBarEl: HTMLElement;
  private pauseOverlay: HTMLElement | null = null;
  private minimapCanvas: HTMLCanvasElement;
  private endTurnBtn: HTMLButtonElement;

  static readonly PHASE_NAMES: Record<string, string> = {
    [Phase.Deploy]: '部署阶段',
    [Phase.PlayerMove]: '玩家移动阶段',
    [Phase.PlayerCombat]: '战斗阶段',
    [Phase.EnemyAI]: '敌方回合',
    [Phase.End]: '游戏结束',
  };

  constructor(options: HUDOptions) {
    this.container = options.container;
    this.unitPanel = options.unitPanel;
    this.onEndTurn = options.onEndTurn;
    this.onPause = options.onPause;
    this.onRestart = options.onRestart;
    this.onSkillSelect = options.onSkillSelect;

    this.container.className = 'huds-container';
    this.container.innerHTML = '';

    // -- Top bar: phase + team indicator --
    this.topBar = document.createElement('div');
    this.topBar.className = 'hud-top-bar';
    this.phaseText = document.createElement('span');
    this.phaseText.className = 'hud-phase-text';
    this.teamText = document.createElement('span');
    this.teamText.className = 'hud-team-text';
    this.topBar.appendChild(this.phaseText);
    this.topBar.appendChild(this.teamText);

    // -- Right panel: minimap + unit panel + skill bar --
    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'hud-right-panel';

    // Minimap canvas (100x100)
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.className = 'hud-minimap';
    this.minimapCanvas.width = 100;
    this.minimapCanvas.height = 100;
    this.rightPanel.appendChild(this.minimapCanvas);

    // Unit panel
    this.rightPanel.appendChild(this.unitPanel.container);

    // Skill bar
    this.skillBarEl = document.createElement('div');
    this.skillBarEl.className = 'skill-bar';
    this.skillBarEl.style.display = 'none';
    this.rightPanel.appendChild(this.skillBarEl);

    // -- Bottom bar: guide text + end turn button --
    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'hud-bottom-bar';
    this.guideText = document.createElement('div');
    this.guideText.className = 'hud-guide-text';
    this.bottomBar.appendChild(this.guideText);

    this.endTurnBtn = this.createEndTurnButton();
    this.bottomBar.appendChild(this.endTurnBtn);

    // Assemble into container
    this.container.appendChild(this.topBar);
    this.container.appendChild(this.rightPanel);
    this.container.appendChild(this.bottomBar);

    // Listen for Escape key to trigger pause
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onPause();
      }
    });
  }

  setPhase(phase: Phase, team: number): void {
    const name = HUD.PHASE_NAMES[phase] ?? phase;
    this.phaseText.textContent = name;
    this.teamText.textContent = team === 0 ? '己方回合' : '敌方回合';
  }

  setGuideText(text: string): void {
    this.guideText.textContent = text;
  }

  updateSkillBar(
    units: Unit[],
    actedUnits: Set<Unit>,
    selectedUnit: Unit | null,
    selectedSkill: AbilityType | null,
  ): void {
    this.skillBarEl.innerHTML = '';
    const unactedUnits = units.filter(u =>
      u.isAlive() && !actedUnits.has(u) && !u.effects.some(e => e.type === 'skipTurn'),
    );
    if (unactedUnits.length === 0) {
      this.skillBarEl.style.display = 'none';
      return;
    }
    this.skillBarEl.style.display = 'flex';

    for (const unit of unactedUnits) {
      const config = ABILITY_CONFIGS[unit.skill];
      const cooldownText = unit.skillCooldown > 0 ? ` (CD:${unit.skillCooldown})` : '';
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.textContent = `${config.name}${cooldownText}`;

      if (unit.skillCooldown > 0) {
        btn.classList.add('on-cooldown');
        btn.disabled = true;
      } else {
        if (selectedUnit === unit && selectedSkill === unit.skill) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
          this.onSkillSelect(unit.skill);
        });
      }
      this.skillBarEl.appendChild(btn);
    }
  }

  showPauseMenu(): void {
    if (this.pauseOverlay) return;
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'hud-pause-overlay';

    const menu = document.createElement('div');
    menu.className = 'hud-pause-menu';

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'hud-pause-resume';
    resumeBtn.textContent = '继续游戏';
    resumeBtn.addEventListener('click', () => { this.hidePauseMenu(); });

    const restartBtn = document.createElement('button');
    restartBtn.className = 'hud-pause-restart';
    restartBtn.textContent = '重新开始';
    restartBtn.addEventListener('click', () => {
      this.hidePauseMenu();
      this.onRestart();
    });

    menu.appendChild(resumeBtn);
    menu.appendChild(restartBtn);
    this.pauseOverlay.appendChild(menu);
    document.body.appendChild(this.pauseOverlay);
  }

  hidePauseMenu(): void {
    if (!this.pauseOverlay) return;
    if (this.pauseOverlay.parentNode) {
      this.pauseOverlay.parentNode.removeChild(this.pauseOverlay);
    }
    this.pauseOverlay = null;
  }

  renderMinimap(grid: MapGrid, units: Unit[]): void {
    const ctx = this.minimapCanvas.getContext('2d');
    if (!ctx) return;

    const cellSize = 100 / GRID_SIZE;
    ctx.clearRect(0, 0, 100, 100);

    // Draw tile grid using actual tile types
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const type = grid.tiles[r][c];
        const base = TILE_MINIMAP_COLORS[type] ?? '#333';
        // Add checkerboard variation for Plain tiles
        ctx.fillStyle = type === TileType.Plain
          ? ((r + c) % 2 === 0 ? base : '#3d6b25')
          : base;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    // Draw units as dots
    for (const unit of units) {
      if (!unit.isAlive()) continue;
      ctx.fillStyle = unit.team === 0 ? '#2980b9' : '#e74c3c';
      ctx.beginPath();
      ctx.arc(
        unit.col * cellSize + cellSize / 2,
        unit.row * cellSize + cellSize / 2,
        cellSize / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private createEndTurnButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'end-turn-btn';
    btn.textContent = '结束回合';
    btn.addEventListener('click', () => { this.onEndTurn(); });
    return btn;
  }

  setEndTurnDisabled(disabled: boolean): void {
    this.endTurnBtn.disabled = disabled;
  }

  setEndTurnText(text: string): void {
    this.endTurnBtn.textContent = text;
  }
}

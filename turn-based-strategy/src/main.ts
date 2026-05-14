import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { executeCombat } from './unit/CombatSystem';
import { useAbility } from './unit/AbilitySystem';
import { AbilityType, ABILITY_CONFIGS } from './unit/AbilityConfig';
import type { AbilityConfig } from './unit/AbilityConfig';
import { TurnManager, type EnemyAction } from './unit/TurnManager';
import type { SkillFunction } from './unit/EnemyAI';
import { Phase } from './unit/PhaseTypes';
import { GRID_SIZE } from './map/MapGrid';
import { DeployManager } from './unit/DeployManager';
import { DEFAULT_GAME_CONFIG } from './config/GameConfig';
import { DIRECTION_OFFSETS } from './core/Coordinate';
import type { Unit } from './unit/Unit';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();

const manager = new UnitManager(grid);
const movementEngine = new MovementEngine(manager);
const useSkillFn: SkillFunction = (caster, target, mgr) => {
  return useAbility(caster, target, caster.skill, ABILITY_CONFIGS[caster.skill], mgr);
};
const turnManager = new TurnManager(grid, manager, executeCombat, useSkillFn);
const deployManager = new DeployManager(manager, DEFAULT_GAME_CONFIG);

let selectedUnit: Unit | null = null;
let reachableCells: { row: number; col: number }[] = [];
let attackTargets: { row: number; col: number }[] = [];
let combatInProgress = false;
let selectedSkill: AbilityType | null = null;
let skillRangeCells: { row: number; col: number }[] = [];
let skillTargetCells: { row: number; col: number }[] = [];

function getAdjacentEnemies(unit: Unit): Unit[] {
  const enemies: Unit[] = [];
  for (const [dr, dc] of DIRECTION_OFFSETS) {
    const nr = unit.row + dr;
    const nc = unit.col + dc;
    const u = manager.getUnitAt(nr, nc);
    if (u && u.team !== unit.team && u.isAlive()) {
      enemies.push(u);
    }
  }
  return enemies;
}

function getAbilityRangeCells(caster: Unit, config: AbilityConfig): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let dr = -config.range; dr <= config.range; dr++) {
    for (let dc = -config.range; dc <= config.range; dc++) {
      if (Math.abs(dr) + Math.abs(dc) > config.range) continue;
      const nr = caster.row + dr;
      const nc = caster.col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        cells.push({ row: nr, col: nc });
      }
    }
  }
  return cells;
}

function getAbilityTargetsForSkill(
  caster: Unit,
  skill: AbilityType,
  config: AbilityConfig,
  unitManager: UnitManager,
): { row: number; col: number }[] {
  const enemies = unitManager.getUnitsByTeam(1).filter(u => u.isAlive());
  return enemies.filter(enemy => {
    const dist = Math.abs(caster.row - enemy.row) + Math.abs(caster.col - enemy.col);
    if (dist > config.range) return false;
    // Charge requires straight line (same row or same column)
    if (skill === AbilityType.Charge) {
      if (caster.row !== enemy.row && caster.col !== enemy.col) return false;
    }
    return true;
  }).map(u => ({ row: u.row, col: u.col }));
}

function processEnemyActions(actions: EnemyAction[], index: number): void {
  if (index >= actions.length) {
    // All actions processed — restore player turn
    turnManager.startPlayerTurn();
    updateView();
    return;
  }

  const action = actions[index];

  if (action.action === 'attack' && action.combatResult) {
    // Flash damaged units that are still alive
    const flashing: Unit[] = [];
    if (action.combatResult.defender.isAlive() && action.combatResult.damageDealt > 0) {
      flashing.push(action.combatResult.defender);
    }
    if (action.combatResult.attacker.isAlive() && action.combatResult.damageReceived > 0) {
      flashing.push(action.combatResult.attacker);
    }
    renderer.setFlashingUnits(flashing);
    updateView();
    setTimeout(() => {
      renderer.clearFlashingUnits();
      updateView();
      setTimeout(() => processEnemyActions(actions, index + 1), 200);
    }, 400);
  } else if (action.action === 'move') {
    updateView();
    setTimeout(() => processEnemyActions(actions, index + 1), 300);
  } else if (action.action === 'skill') {
    if (action.target) {
      renderer.setFlashingUnits([action.target]);
    }
    updateView();
    setTimeout(() => {
      renderer.clearFlashingUnits();
      updateView();
      setTimeout(() => processEnemyActions(actions, index + 1), 200);
    }, 400);
  } else {
    // idle
    setTimeout(() => processEnemyActions(actions, index + 1), 200);
  }
}

function updateView(): void {
  renderer.render(grid);
  renderer.renderAttackHighlights(attackTargets);
  renderer.renderHighlights(reachableCells);
  if (selectedSkill !== null) {
    renderer.renderAbilityRange(skillRangeCells, 'rgba(41, 128, 185, 0.2)');
    renderer.renderAbilityTargets(skillTargetCells);
  }
  renderer.renderUnits(manager.getAllUnits());
}

const renderer = new MapRenderer({
  canvas,
  onClick: (row: number, col: number) => {
    const state = turnManager.getState();

    // --- PlayerCombat phase ---
    if (state === Phase.PlayerCombat) {
      const clickedUnit = manager.getUnitAt(row, col);

      // --- Skill mode ---
      if (selectedSkill !== null) {
        // Click on skill target enemy -> execute ability
        if (clickedUnit && clickedUnit.team !== 0 && clickedUnit.isAlive() &&
            skillTargetCells.some(t => t.row === row && t.col === col)) {
          if (!selectedUnit || !selectedUnit.isAlive() || turnManager.hasUnitActed(selectedUnit)) {
            // Invalid state — reset
            selectedSkill = null;
            skillRangeCells = [];
            skillTargetCells = [];
            selectedUnit = null;
            renderer.setSelectedUnit(null);
            attackTargets = [];
            updateView();
            renderSkillBar();
            return;
          }
          const config = ABILITY_CONFIGS[selectedSkill];
          useAbility(selectedUnit, clickedUnit, selectedSkill, config, manager);
          turnManager.markUnitActed(selectedUnit);
          selectedSkill = null;
          skillRangeCells = [];
          skillTargetCells = [];
          attackTargets = [];
          renderer.setFlashingUnits([clickedUnit]);
          updateView();

          const gameOver = turnManager.isGameOver();
          combatInProgress = true;

          setTimeout(() => {
            try {
              renderer.clearFlashingUnits();
              updateView();
              renderSkillBar();
              if (gameOver) {
                turnManager.endPlayerCombat();
                const playerAlive = manager.getUnitsByTeam(0).length > 0;
                alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!');
              } else if (turnManager.getState() === Phase.PlayerCombat && turnManager.isAllUnitsActed()) {
                const actions = turnManager.endPlayerCombat();
                if (turnManager.getState() === Phase.End) {
                  const playerAlive = manager.getUnitsByTeam(0).length > 0;
                  setTimeout(() => alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!'), 200);
                } else {
                  processEnemyActions(actions, 0);
                }
              }
            } finally {
              combatInProgress = false;
            }
          }, 400);
          return;
        }

        // Click on own unacted unit -> switch selection, recalculate skill
        if (clickedUnit && clickedUnit.team === 0 && clickedUnit.isAlive() && !turnManager.hasUnitActed(clickedUnit)) {
          selectedUnit = clickedUnit;
          renderer.setSelectedUnit(clickedUnit);
          const config = ABILITY_CONFIGS[selectedSkill];
          skillRangeCells = getAbilityRangeCells(clickedUnit, config);
          skillTargetCells = getAbilityTargetsForSkill(clickedUnit, selectedSkill, config, manager);
          attackTargets = [];
          updateView();
          renderSkillBar();
          return;
        }

        // Click on empty space or acted unit -> cancel skill mode, return to basic attack mode
        selectedSkill = null;
        skillRangeCells = [];
        skillTargetCells = [];
        if (selectedUnit && selectedUnit.isAlive() && !turnManager.hasUnitActed(selectedUnit)) {
          // Keep unit selected, show attack targets (return to basic attack)
          attackTargets = getAdjacentEnemies(selectedUnit).map(u => ({ row: u.row, col: u.col }));
        } else {
          selectedUnit = null;
          renderer.setSelectedUnit(null);
          attackTargets = [];
        }
        updateView();
        renderSkillBar();
        return;
      }

      // --- Basic attack mode (selectedSkill === null) ---
      if (clickedUnit && clickedUnit.team === 0 && clickedUnit.isAlive() && !turnManager.hasUnitActed(clickedUnit)) {
        // Clicked own unit — select and show adjacent enemies as attack targets
        selectedUnit = clickedUnit;
        renderer.setSelectedUnit(clickedUnit);
        attackTargets = getAdjacentEnemies(clickedUnit).map(u => ({ row: u.row, col: u.col }));
        updateView();
      } else if (selectedUnit && selectedUnit.isAlive() && !turnManager.hasUnitActed(selectedUnit)) {
        // Check if clicked on an attack target (red-highlighted enemy)
        const target = manager.getUnitAt(row, col);
        if (target && target.team !== 0 && attackTargets.some(t => t.row === row && t.col === col)) {
          // Execute combat
          executeCombat(selectedUnit, target, manager);
          turnManager.markUnitActed(selectedUnit);
          attackTargets = [];
          renderer.setFlashingUnits([target]);
          updateView();

          const gameOver = turnManager.isGameOver();
          combatInProgress = true;

          setTimeout(() => {
            try {
              renderer.clearFlashingUnits();
              updateView();
              renderSkillBar();
              if (gameOver) {
                turnManager.endPlayerCombat();
                const playerAlive = manager.getUnitsByTeam(0).length > 0;
                alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!');
              } else if (turnManager.getState() === Phase.PlayerCombat && turnManager.isAllUnitsActed()) {
                // Auto-advance to EnemyAI when all units have acted
                const actions = turnManager.endPlayerCombat();
                if (turnManager.getState() === Phase.End) {
                  const playerAlive = manager.getUnitsByTeam(0).length > 0;
                  setTimeout(() => alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!'), 200);
                } else {
                  processEnemyActions(actions, 0);
                }
              }
            } finally {
              combatInProgress = false;
            }
          }, 400);
        } else {
          // Clicked elsewhere — clear selection
          selectedUnit = null;
          renderer.setSelectedUnit(null);
          attackTargets = [];
          updateView();
        }
      } else {
        // Clicked already-acted unit, enemy directly, or empty — clear selection
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        attackTargets = [];
        updateView();
      }
      return;
    }

    // --- PlayerMove phase ---
    if (state !== Phase.PlayerMove) {
      // Not a player-interactive phase — clear selection
      selectedUnit = null;
      renderer.setSelectedUnit(null);
      reachableCells = [];
      updateView();
      return;
    }

    const clickedUnit = manager.getUnitAt(row, col);

    if (clickedUnit && clickedUnit.team === 0 && !clickedUnit.movedThisTurn && !clickedUnit.effects.some(e => e.type === 'skipTurn')) {
      // Clicked own unit — select and show reachable cells
      selectedUnit = clickedUnit;
      renderer.setSelectedUnit(clickedUnit);
      reachableCells = movementEngine.getReachableCells(grid, clickedUnit);
      updateView();
    } else if (selectedUnit && reachableCells.some(c => c.row === row && c.col === col)) {
      // Clicked a highlighted cell — move unit there (no auto-attack)
      const moved = manager.moveUnit(selectedUnit, row, col);
      if (moved) {
        selectedUnit.movedThisTurn = true;
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        reachableCells = [];
        updateView();
      }
      // If moveUnit returns false, keep selection intact
    } else {
      // Clicked empty or enemy cell — clear selection
      selectedUnit = null;
      renderer.setSelectedUnit(null);
      reachableCells = [];
      updateView();
    }
  },
});

// --- Phase label and guide label ---
const phaseLabel = document.getElementById('phase-label') || (() => {
  const el = document.createElement('div');
  el.id = 'phase-label';
  document.body.appendChild(el);
  return el;
})();

const guideLabel = document.getElementById('guide-label') || (() => {
  const el = document.createElement('div');
  el.id = 'guide-label';
  document.body.appendChild(el);
  return el;
})();

// --- Tooltip ---
const tooltip = document.getElementById('tooltip') || (() => {
  const el = document.createElement('div');
  el.id = 'tooltip';
  document.body.appendChild(el);
  return el;
})();

const TILE_SIZE = 80;
const UNIT_TYPE_NAMES: Record<number, string> = { 0: '战士', 1: '弓手', 2: '骑士', 3: '法师' };

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
    const u = manager.getUnitAt(row, col);
    if (u && u.isAlive()) {
      const name = UNIT_TYPE_NAMES[u.type] ?? u.type;
      tooltip.innerHTML = `${name}<br>HP: ${u.hp}/${u.maxHp}  ATK: ${u.atk}  DEF: ${u.def}`;
      tooltip.style.display = 'block';

      // Position with viewport clamping
      let left = e.clientX + 12;
      let top = e.clientY + 12;
      const tipWidth = 180;
      const tipHeight = 50;
      if (left + tipWidth > window.innerWidth) {
        left = e.clientX - tipWidth - 12;
      }
      left = Math.max(0, left);
      if (top + tipHeight > window.innerHeight) {
        top = e.clientY - tipHeight - 12;
      }
      top = Math.max(0, top);
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  } else {
    tooltip.style.display = 'none';
  }
});

canvas.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

const PHASE_NAMES: Record<string, string> = {
  [Phase.Deploy]: '部署阶段',
  [Phase.PlayerMove]: '玩家移动阶段',
  [Phase.PlayerCombat]: '战斗阶段',
  [Phase.EnemyAI]: '敌方回合',
  [Phase.End]: '游戏结束',
};

const PHASE_GUIDES: Record<string, { text: string; color: string }> = {
  [Phase.PlayerMove]: { text: '点击己方单位选中 → 点击高亮格移动', color: '#ccc' },
  [Phase.PlayerCombat]: { text: '点击己方单位 → 攻击或点击下方技能栏使用技能', color: '#ccc' },
  [Phase.EnemyAI]: { text: '敌方回合中，请等待...', color: '#e74c3c' },
  [Phase.End]: { text: '游戏结束，刷新页面重新开始', color: '#ccc' },
};

function updatePhaseUI(phase: Phase): void {
  // Phase emoji mapping
  const iconMap: Record<string, string> = {
    [Phase.Deploy]: '',
    [Phase.PlayerMove]: '\u{1F3AE}',
    [Phase.PlayerCombat]: '\u{2694}\u{FE0F}',
    [Phase.EnemyAI]: '\u{1F47E}',
    [Phase.End]: '\u{1F3C1}',
  };
  const icon = iconMap[phase] || '';
  phaseLabel.textContent = icon ? `${icon} ${PHASE_NAMES[phase] || phase}` : PHASE_NAMES[phase] || phase;

  const guide = PHASE_GUIDES[phase];
  if (guide) {
    guideLabel.textContent = guide.text;
    guideLabel.style.color = guide.color;
  } else {
    guideLabel.textContent = '';
  }
}

// Add End Turn button
const endTurnBtn = document.createElement('button');
endTurnBtn.textContent = 'End Moves';
endTurnBtn.style.cssText = [
  'position: fixed',
  'top: 12px',
  'left: 12px',
  'padding: 10px 20px',
  'font-size: 16px',
  'z-index: 100',
  'cursor: pointer',
  'background: #2c3e50',
  'color: #fff',
  'border: none',
  'border-radius: 4px',
].join(';');
document.body.appendChild(endTurnBtn);

endTurnBtn.addEventListener('click', () => {
  const state = turnManager.getState();

  if (state === Phase.PlayerMove) {
    // Clear selection when ending player move
    renderer.setSelectedUnit(null);
    selectedUnit = null;
    reachableCells = [];

    turnManager.endPlayerTurn();

    // Process skipTurn effects on player units
    const playerUnits = manager.getUnitsByTeam(0);
    for (const unit of playerUnits) {
      const skipEffect = unit.effects.find(e => e.type === 'skipTurn');
      if (skipEffect) {
        turnManager.markUnitActed(unit);
        skipEffect.duration--;
      }
    }
    // Remove expired effects
    for (const unit of playerUnits) {
      unit.effects = unit.effects.filter(e => e.duration > 0);
    }

    updateView();
    renderSkillBar();
  } else if (state === Phase.PlayerCombat) {
    if (combatInProgress) return;
    // Clear selection when ending combat
    renderer.setSelectedUnit(null);
    selectedUnit = null;
    attackTargets = [];

    const actions = turnManager.endPlayerCombat();

    if (turnManager.getState() === Phase.End) {
      const playerAlive = manager.getUnitsByTeam(0).length > 0;
      const msg = playerAlive ? 'Player Wins!' : 'Enemy Wins!';
      updateView();
      setTimeout(() => alert(msg), 200);
      return;
    }

    processEnemyActions(actions, 0);
  }
});

// --- Skill Bar ---
const skillBar = document.createElement('div');
skillBar.id = 'skill-bar';
skillBar.style.display = 'none';
document.body.appendChild(skillBar);

function renderSkillBar(): void {
  skillBar.innerHTML = '';
  const state = turnManager.getState();
  if (state !== Phase.PlayerCombat) {
    skillBar.style.display = 'none';
    return;
  }
  skillBar.style.display = 'flex';

  const unactedUnits = manager.getUnitsByTeam(0).filter(u => u.isAlive() && !turnManager.hasUnitActed(u));
  if (unactedUnits.length === 0) {
    skillBar.style.display = 'none';
    return;
  }
  for (const unit of unactedUnits) {
    const btn = document.createElement('button');
    const skillConfig = ABILITY_CONFIGS[unit.skill];
    const name = UNIT_TYPE_NAMES[unit.type] ?? unit.type;
    const cooldownText = unit.skillCooldown > 0 ? ` (CD:${unit.skillCooldown})` : '';
    btn.textContent = `${name}: ${skillConfig.name}${cooldownText}`;

    if (unit.skillCooldown > 0) {
      btn.className = 'skill-btn on-cooldown';
      btn.disabled = true;
    } else {
      btn.className = 'skill-btn';
      if (selectedUnit === unit && selectedSkill === unit.skill) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        // Toggle: same button clicked again -> cancel
        if (selectedUnit === unit && selectedSkill === unit.skill) {
          selectedSkill = null;
          selectedUnit = null;
          renderer.setSelectedUnit(null);
          skillRangeCells = [];
          skillTargetCells = [];
          attackTargets = [];
        } else {
          selectedUnit = unit;
          renderer.setSelectedUnit(unit);
          selectedSkill = unit.skill;
          const config = ABILITY_CONFIGS[unit.skill];
          skillRangeCells = getAbilityRangeCells(unit, config);
          skillTargetCells = getAbilityTargetsForSkill(unit, unit.skill, config, manager);
          attackTargets = [];
        }
        updateView();
        renderSkillBar();
      });
    }
    skillBar.appendChild(btn);
  }
}

// Subscribe to phase changes for UI state updates
turnManager.onPhaseChange.add((_from, to) => {
  if (to === Phase.PlayerMove || to === Phase.PlayerCombat) {
    endTurnBtn.disabled = false;
    endTurnBtn.textContent = to === Phase.PlayerMove ? 'End Moves' : 'End Combat';
  } else {
    endTurnBtn.disabled = true;
  }
  if (to === Phase.PlayerCombat) {
    renderSkillBar();
  }
  if (_from === Phase.PlayerCombat) {
    selectedSkill = null;
    skillRangeCells = [];
    skillTargetCells = [];
    skillBar.style.display = 'none';
  }
  updatePhaseUI(to);
});
endTurnBtn.disabled = turnManager.getState() !== Phase.PlayerMove;
endTurnBtn.textContent = 'End Moves';

// Execute initial deployment
deployManager.executeDeploy();
// Complete deploy phase — transitions state to PlayerMove
turnManager.completeDeploy();

// Initial UI state
updatePhaseUI(turnManager.getState());

updateView();

import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { executeCombat } from './unit/CombatSystem';
import { TurnManager, type EnemyAction } from './unit/TurnManager';
import { Phase } from './unit/PhaseTypes';
import { GRID_SIZE } from './map/MapGrid';
import { DeployManager } from './unit/DeployManager';
import { DEFAULT_GAME_CONFIG } from './config/GameConfig';
import type { Unit } from './unit/Unit';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();

const manager = new UnitManager(grid);
const movementEngine = new MovementEngine(manager);
const turnManager = new TurnManager(grid, manager, executeCombat);
const deployManager = new DeployManager(manager, DEFAULT_GAME_CONFIG);

let selectedUnit: Unit | null = null;
let reachableCells: { row: number; col: number }[] = [];
let attackTargets: { row: number; col: number }[] = [];
let combatInProgress = false;

const DIRECTION_OFFSETS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

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
  } else {
    // idle
    setTimeout(() => processEnemyActions(actions, index + 1), 200);
  }
}

function updateView(): void {
  renderer.render(grid);
  renderer.renderAttackHighlights(attackTargets);
  renderer.renderHighlights(reachableCells);
  renderer.renderUnits(manager.getAllUnits());
}

const renderer = new MapRenderer({
  canvas,
  onClick: (row: number, col: number) => {
    const state = turnManager.getState();

    // --- PlayerCombat phase ---
    if (state === Phase.PlayerCombat) {
      const clickedUnit = manager.getUnitAt(row, col);

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
            renderer.clearFlashingUnits();
            updateView();
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
            combatInProgress = false;
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

    if (clickedUnit && clickedUnit.team === 0) {
      // Clicked own unit — select and show reachable cells
      selectedUnit = clickedUnit;
      renderer.setSelectedUnit(clickedUnit);
      reachableCells = movementEngine.getReachableCells(grid, clickedUnit);
      updateView();
    } else if (selectedUnit && reachableCells.some(c => c.row === row && c.col === col)) {
      // Clicked a highlighted cell — move unit there (no auto-attack)
      const moved = manager.moveUnit(selectedUnit, row, col);
      if (moved) {
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
  [Phase.PlayerCombat]: { text: '点击己方单位 → 点击红色高亮敌人攻击', color: '#ccc' },
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
    updateView();
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

// Subscribe to phase changes for UI state updates
turnManager.onPhaseChange.add((_from, to) => {
  if (to === Phase.PlayerMove || to === Phase.PlayerCombat) {
    endTurnBtn.disabled = false;
    endTurnBtn.textContent = to === Phase.PlayerMove ? 'End Moves' : 'End Combat';
  } else {
    endTurnBtn.disabled = true;
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

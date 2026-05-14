import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { executeCombat } from './unit/CombatSystem';
import { TurnManager, type EnemyAction } from './unit/TurnManager';
import { Phase } from './unit/PhaseTypes';
import { UnitType } from './unit/UnitType';
import { GRID_SIZE } from './map/MapGrid';
import type { Unit } from './unit/Unit';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();

const manager = new UnitManager(grid);
const movementEngine = new MovementEngine(manager);
const turnManager = new TurnManager(grid, manager, executeCombat);

let selectedUnit: Unit | null = null;
let reachableCells: { row: number; col: number }[] = [];

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

function trySpawn(type: UnitType, team: number, row: number, col: number): Unit | null {
  const unit = manager.spawnUnit(type, team, row, col);
  if (unit) return unit;

  // Fallback: try adjacent cells (cardinal then diagonal)
  const offsets: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      const fallback = manager.spawnUnit(type, team, nr, nc);
      if (fallback) return fallback;
    }
  }
  return null;
}

function updateView(): void {
  renderer.render(grid);
  renderer.renderHighlights(reachableCells);
  renderer.renderUnits(manager.getAllUnits());
}

const renderer = new MapRenderer({
  canvas,
  onClick: (row: number, col: number) => {
    if (turnManager.getState() !== Phase.PlayerMove) return;

    const clickedUnit = manager.getUnitAt(row, col);

    if (clickedUnit && clickedUnit.team === 0) {
      // Clicked own unit — select and show reachable cells
      selectedUnit = clickedUnit;
      renderer.setSelectedUnit(clickedUnit);
      reachableCells = movementEngine.getReachableCells(grid, clickedUnit);
      updateView();
    } else if (selectedUnit && reachableCells.some(c => c.row === row && c.col === col)) {
      // Clicked a highlighted cell — move unit there
      const moved = manager.moveUnit(selectedUnit, row, col);
      if (moved) {
        const movedUnit = selectedUnit;
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        reachableCells = [];

        // Combat detection after movement
        const adjacentEnemies = getAdjacentEnemies(movedUnit);
        if (adjacentEnemies.length > 0) {
          const target = adjacentEnemies.sort((a, b) => a.hp - b.hp)[0];
          executeCombat(movedUnit, target, manager);
          renderer.setFlashingUnits([target]);
          updateView();

          // Check game over after player attack
          const gameOver = turnManager.isGameOver();

          setTimeout(() => {
            renderer.clearFlashingUnits();
            updateView();
            if (gameOver) {
              const playerAlive = manager.getUnitsByTeam(0).length > 0;
              alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!');
            }
          }, 400);
        } else {
          updateView();
        }
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
  [Phase.PlayerCombat]: { text: '移动后自动攻击相邻最弱敌人', color: '#ccc' },
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
endTurnBtn.textContent = 'End Turn';
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
  if (turnManager.getState() !== Phase.PlayerMove) return;

  // Clear selection when ending player turn
  renderer.setSelectedUnit(null);

  const actions = turnManager.endPlayerTurn();

  // Check game over
  if (turnManager.getState() === Phase.End) {
    const playerAlive = manager.getUnitsByTeam(0).length > 0;
    const msg = playerAlive ? 'Player Wins!' : 'Enemy Wins!';
    updateView();
    setTimeout(() => alert(msg), 200);
    return;
  }

  processEnemyActions(actions, 0);
});

// Subscribe to phase changes for UI state updates
turnManager.onPhaseChange.add((_from, to) => {
  endTurnBtn.disabled = to !== Phase.PlayerMove;
  updatePhaseUI(to);
});
endTurnBtn.disabled = turnManager.getState() !== Phase.PlayerMove;

// Deploy team 0 (Blue) — 1 unit at (0,0), guaranteed Plain
trySpawn(UnitType.Warrior, 0, 0, 0);

// Deploy team 1 (Red) — 3 units at recommended positions with fallback
trySpawn(UnitType.Archer, 1, 7, 7);
trySpawn(UnitType.Mage, 1, 7, 0);
trySpawn(UnitType.Knight, 1, 0, 7);

// Initial UI state
updatePhaseUI(turnManager.getState());

updateView();

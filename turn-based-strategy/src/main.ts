import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { executeCombat } from './unit/CombatSystem';
import { TurnManager, type EnemyAction } from './unit/TurnManager';
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
let isEnemyTurn = false;

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
    isEnemyTurn = false;
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
    if (isEnemyTurn || turnManager.getState() === 'gameOver') return;

    const clickedUnit = manager.getUnitAt(row, col);

    if (clickedUnit && clickedUnit.team === 0) {
      // Clicked own unit — select and show reachable cells
      selectedUnit = clickedUnit;
      reachableCells = movementEngine.getReachableCells(grid, clickedUnit);
      updateView();
    } else if (selectedUnit && reachableCells.some(c => c.row === row && c.col === col)) {
      // Clicked a highlighted cell — move unit there
      const moved = manager.moveUnit(selectedUnit, row, col);
      if (moved) {
        const movedUnit = selectedUnit;
        selectedUnit = null;
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
      reachableCells = [];
      updateView();
    }
  },
});

// Add End Turn button
const endTurnBtn = document.createElement('button');
endTurnBtn.textContent = 'End Turn';
endTurnBtn.style.cssText = [
  'position: fixed',
  'top: 12px',
  'right: 12px',
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
  if (isEnemyTurn || turnManager.getState() !== 'player') return;

  isEnemyTurn = true;
  const actions = turnManager.endPlayerTurn();

  // Check game over
  if (turnManager.getState() === 'gameOver') {
    isEnemyTurn = false;
    const playerAlive = manager.getUnitsByTeam(0).length > 0;
    const msg = playerAlive ? 'Player Wins!' : 'Enemy Wins!';
    updateView();
    setTimeout(() => alert(msg), 200);
    return;
  }

  processEnemyActions(actions, 0);
});

// Deploy team 0 (Blue) — 1 unit at (0,0), guaranteed Plain
trySpawn(UnitType.Warrior, 0, 0, 0);

// Deploy team 1 (Red) — 3 units at recommended positions with fallback
trySpawn(UnitType.Archer, 1, 7, 7);
trySpawn(UnitType.Mage, 1, 7, 0);
trySpawn(UnitType.Knight, 1, 0, 7);

updateView();

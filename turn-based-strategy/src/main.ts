import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { UnitType } from './unit/UnitType';
import { GRID_SIZE } from './map/MapGrid';
import type { Unit } from './unit/Unit';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();

const manager = new UnitManager(grid);
const movementEngine = new MovementEngine(manager);

let selectedUnit: Unit | null = null;
let reachableCells: { row: number; col: number }[] = [];

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
        selectedUnit = null;
        reachableCells = [];
        updateView();
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

// Deploy team 0 (Blue) — 1 unit at (0,0), guaranteed Plain
trySpawn(UnitType.Warrior, 0, 0, 0);

// Deploy team 1 (Red) — 3 units at recommended positions with fallback
trySpawn(UnitType.Archer, 1, 7, 7);
trySpawn(UnitType.Mage, 1, 7, 0);
trySpawn(UnitType.Knight, 1, 0, 7);

updateView();

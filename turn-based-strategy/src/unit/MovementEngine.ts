import type { MapGrid } from '../map/MapGrid';
import type { Unit } from './Unit';
import type { UnitManager } from './UnitManager';
import { DIRECTION_OFFSETS } from '../core/Coordinate';

interface QueueEntry {
  row: number;
  col: number;
  cost: number;
}

export class MovementEngine {
  private unitManager: UnitManager;

  constructor(unitManager: UnitManager) {
    this.unitManager = unitManager;
  }

  getReachableCells(grid: MapGrid, unit: Unit): { row: number; col: number }[] {
    const result: { row: number; col: number }[] = [];
    const bestCost = new Map<string, number>();
    const queue: QueueEntry[] = [];

    const startKey = `${unit.row},${unit.col}`;
    bestCost.set(startKey, 0);
    queue.push({ row: unit.row, col: unit.col, cost: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [dr, dc] of DIRECTION_OFFSETS) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        const key = `${nr},${nc}`;

        const moveCost = grid.getMoveCost(nr, nc);
        if (moveCost < 0) {
          continue; // Impassable tile or out of bounds
        }

        const newCost = current.cost + moveCost;
        if (newCost > unit.moveRange) {
          continue; // Exceeds movement range
        }

        // Skip if we already found a path with equal or lower cost
        const previousCost = bestCost.get(key);
        if (previousCost !== undefined && previousCost <= newCost) {
          continue;
        }

        // Record this as the best known cost to reach this cell
        const isNewCell = previousCost === undefined;
        bestCost.set(key, newCost);

        // Check occupancy — skip cells occupied by other units
        if (this.unitManager.isOccupied(nr, nc)) {
          continue;
        }

        // Only add to results on first discovery (not on subsequent cheaper-path revisits)
        if (isNewCell) {
          result.push({ row: nr, col: nc });
        }

        // Enqueue to propagate movement further (needed when a cheaper path allows more exploration)
        if (newCost < unit.moveRange) {
          queue.push({ row: nr, col: nc, cost: newCost });
        }
      }
    }

    return result;
  }
}

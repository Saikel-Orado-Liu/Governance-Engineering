import { MapGrid, GRID_SIZE } from '../map/MapGrid';
import { UnitType } from './UnitType';
import { Unit } from './Unit';

export class UnitManager {
  private grid: MapGrid;
  private units: Unit[] = [];

  constructor(grid: MapGrid) {
    this.grid = grid;
  }

  spawnUnit(type: UnitType, team: number, row: number, col: number): Unit | null {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    if (!this.grid.isPassable(row, col)) {
      return null;
    }
    if (this.isOccupied(row, col)) {
      return null;
    }
    const unit = new Unit(type, team, row, col);
    this.units.push(unit);
    return unit;
  }

  getUnitAt(row: number, col: number): Unit | null {
    return this.units.find(u => u.isAlive() && u.row === row && u.col === col) ?? null;
  }

  getUnitsByTeam(team: number): Unit[] {
    return this.units.filter(u => u.isAlive() && u.team === team);
  }

  getAllUnits(): Unit[] {
    return this.units.filter(u => u.isAlive());
  }

  moveUnit(unit: Unit, targetRow: number, targetCol: number): boolean {
    if (targetRow < 0 || targetRow >= GRID_SIZE || targetCol < 0 || targetCol >= GRID_SIZE) {
      return false;
    }
    if (!this.grid.isPassable(targetRow, targetCol)) {
      return false;
    }
    if (this.isOccupied(targetRow, targetCol)) {
      return false;
    }
    unit.setPosition(targetRow, targetCol);
    return true;
  }

  removeUnit(unit: Unit): void {
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }
  }

  getGrid(): MapGrid {
    return this.grid;
  }

  isOccupied(row: number, col: number): boolean {
    return this.units.some(u => u.isAlive() && u.row === row && u.col === col);
  }
}

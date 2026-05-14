import { UnitManager } from './UnitManager';
import type { Unit } from './Unit';
import type { GameConfig } from '../config/GameConfig';
import { UnitType } from './UnitType';
import { GRID_SIZE } from '../map/MapGrid';

export interface FailedDeploy {
  team: number;
  index: number;
  type: UnitType;
  intendedRow: number;
  intendedCol: number;
  reason: string;
}

export interface DeployResult {
  deployed: Unit[];
  failed: FailedDeploy[];
}

export class DeployManager {
  private unitManager: UnitManager;
  private config: GameConfig;

  constructor(unitManager: UnitManager, config: GameConfig) {
    this.unitManager = unitManager;
    this.config = config;
  }

  executeDeploy(): DeployResult {
    const deployed: Unit[] = [];
    const failed: FailedDeploy[] = [];

    for (const teamStr of Object.keys(this.config.deployCoordinates)) {
      const team = Number(teamStr);
      const coords = this.config.deployCoordinates[team];
      const formations = this.config.formations[team];
      const count = Math.min(coords.length, formations.length, this.config.teamSize);

      for (let i = 0; i < count; i++) {
        const { row, col } = coords[i];
        const unitType = formations[i];
        const unit = this.unitManager.spawnUnit(unitType, team, row, col);
        if (unit) {
          deployed.push(unit);
        } else {
          const fallback = this.trySpawnFallback(unitType, team, row, col);
          if (fallback) {
            deployed.push(fallback);
          } else {
            failed.push({
              team,
              index: i,
              type: unitType,
              intendedRow: row,
              intendedCol: col,
              reason: 'Position occupied or impassable, no fallback available',
            });
          }
        }
      }
    }

    return { deployed, failed };
  }

  private trySpawnFallback(type: UnitType, team: number, row: number, col: number): Unit | null {
    // Cardinal first, then diagonal — same order as original trySpawn
    const offsets: [number, number][] = [
      [0, 1], [1, 0], [0, -1], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const fallback = this.unitManager.spawnUnit(type, team, nr, nc);
        if (fallback) return fallback;
      }
    }
    return null;
  }
}

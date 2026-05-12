import { TileType } from './TileType';
import { MapGrid, GRID_SIZE } from './MapGrid';

const TARGET_COUNTS: Record<TileType, number> = {
  [TileType.Plain]: 32,
  [TileType.Forest]: 16,
  [TileType.Mountain]: 10,
  [TileType.Water]: 6,
};

const DIRECTIONS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

function bfsHasPath(grid: MapGrid, startRow: number, startCol: number, endRow: number, endCol: number): boolean {
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const queue: [number, number][] = [[startRow, startCol]];
  visited[startRow][startCol] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === endRow && c === endCol) return true;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc] && grid.isPassable(nr, nc)) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return false;
}

function bfsFindAnyPath(): [number, number][] {
  // BFS ignoring terrain to find a path from (0,0) to (7,7)
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const parent: ([number, number] | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === GRID_SIZE - 1 && c === GRID_SIZE - 1) {
      // Reconstruct path
      const path: [number, number][] = [];
      let cur: [number, number] | null = [r, c];
      while (cur !== null) {
        path.unshift(cur);
        cur = parent[cur[0]][cur[1]];
      }
      return path;
    }

    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
        visited[nr][nc] = true;
        parent[nr][nc] = [r, c];
        queue.push([nr, nc]);
      }
    }
  }
  return []; // should never happen on a connected grid
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class MapGenerator {
  generate(): MapGrid {
    // Build tile pool with target counts
    const pool: TileType[] = [];
    for (const [typeStr, count] of Object.entries(TARGET_COUNTS)) {
      const type = Number(typeStr) as TileType;
      for (let i = 0; i < count; i++) {
        pool.push(type);
      }
    }

    // Shuffle pool
    const shuffled = shuffleArray(pool);

    // Build 8x8 grid
    const tiles: TileType[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      tiles.push(shuffled.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE));
    }

    // Force start and end to be Plain
    tiles[0][0] = TileType.Plain;
    tiles[GRID_SIZE - 1][GRID_SIZE - 1] = TileType.Plain;

    const grid = new MapGrid(tiles);

    // Ensure a passable path from (0,0) to (7,7)
    if (!bfsHasPath(grid, 0, 0, GRID_SIZE - 1, GRID_SIZE - 1)) {
      const path = bfsFindAnyPath();
      for (const [r, c] of path) {
        const tile = grid.tiles[r][c];
        if (tile !== TileType.Plain && tile !== TileType.Forest) {
          grid.tiles[r][c] = TileType.Plain;
        }
      }
    }

    return grid;
  }
}

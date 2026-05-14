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

/** BFS from (startRow, startCol) across passable tiles, returning visited matrix. */
function bfsReachable(grid: MapGrid, startRow: number, startCol: number): boolean[][] {
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const queue: [number, number][] = [[startRow, startCol]];
  visited[startRow][startCol] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc] && grid.isPassable(nr, nc)) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}

/**
 * Ensures all passable tiles are in one connected component reachable from (0,0).
 * Isolated passable regions are connected by converting blocking obstacles to Plain.
 * Afterwards, tiles that were originally isolated are converted to Forest (balance).
 */
function forceFullConnectivity(grid: MapGrid): void {
  // 1) Identify passable tiles not reachable from (0,0)
  const reachable = bfsReachable(grid, 0, 0);
  const isolatedPassable: [number, number][] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.isPassable(r, c) && !reachable[r][c]) {
        isolatedPassable.push([r, c]);
      }
    }
  }

  if (isolatedPassable.length === 0) return;

  // 2) Connect each isolated region by breaking through nearest obstacles
  for (const [isoR, isoC] of isolatedPassable) {
    // Skip if already connected (fixed by an earlier iteration)
    const currentConnected = bfsReachable(grid, 0, 0);
    if (currentConnected[isoR][isoC]) continue;

    // BFS from isolated tile to nearest reachable tile (ignoring passability)
    const parent: ([number, number] | null)[][] = Array.from(
      { length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)
    );
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    const queue: [number, number][] = [[isoR, isoC]];
    visited[isoR][isoC] = true;
    let foundTile: [number, number] | null = null;

    for (let qi = 0; qi < queue.length && !foundTile; qi++) {
      const [r, c] = queue[qi];
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
          visited[nr][nc] = true;
          parent[nr][nc] = [r, c];
          if (currentConnected[nr][nc]) {
            foundTile = [nr, nc];
            break;
          }
          queue.push([nr, nc]);
        }
      }
    }

    if (!foundTile) continue;

    // Walk path from foundTile back to isolated tile, converting obstacles to Plain
    let [cr, cc] = foundTile;
    while (cr !== isoR || cc !== isoC) {
      const p = parent[cr][cc];
      if (!p) break;
      const [pr, pc] = p;
      if (!grid.isPassable(pr, pc)) {
        grid.tiles[pr][pc] = TileType.Plain;
      }
      cr = pr;
      cc = pc;
    }
  }

  // 3) Convert originally-isolated passable tiles to Forest (balance measure)
  for (const [r, c] of isolatedPassable) {
    grid.tiles[r][c] = TileType.Forest;
  }
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

    // Ensure no isolated passable regions (fixes enemy spawn unreachable bug)
    forceFullConnectivity(grid);

    return grid;
  }
}

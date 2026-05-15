import { MapGrid, GRID_SIZE } from '../map/MapGrid';

/** A* 寻路节点 */
export interface PathNode {
  row: number;
  col: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

/** 启发函数类型 */
type HeuristicFn = (
  row: number,
  col: number,
  targetRow: number,
  targetCol: number,
) => number;

/** 四方向移动 */
const DIRS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** 默认 Manhattan 距离启发函数 */
function manhattan(
  row: number,
  col: number,
  targetRow: number,
  targetCol: number,
): number {
  return Math.abs(row - targetRow) + Math.abs(col - targetCol);
}

/**
 * Pathfinding — 通用 A* 加权寻路工具类
 *
 * @example
 * ```ts
 * const pf = new Pathfinding(grid, (r, c) => units.has(`${r},${c}`));
 * const path = pf.findPath(0, 0, 7, 7);
 * const cells = pf.findPathInRange(4, 4, 3);
 * ```
 */
export class Pathfinding {
  private readonly grid: MapGrid;
  private readonly isOccupied: ((row: number, col: number) => boolean) | undefined;
  private readonly heuristic: HeuristicFn;

  constructor(
    grid: MapGrid,
    isOccupied?: (row: number, col: number) => boolean,
    heuristic?: HeuristicFn,
  ) {
    this.grid = grid;
    this.isOccupied = isOccupied;
    this.heuristic = heuristic ?? manhattan;
  }

  /**
   * A* 加权寻路
   *
   * @param startRow - 起点行
   * @param startCol - 起点列
   * @param endRow - 目标行
   * @param endCol - 目标列
   * @returns 不含起点的路径数组（从起点相邻格到终点），无可达路径时返回 null
   */
  findPath(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): { row: number; col: number }[] | null {
    // 边界检查
    if (!this.isInBounds(startRow, startCol) || !this.isInBounds(endRow, endCol)) {
      return null;
    }

    // 起点或终点不可通行的快速返回
    if (this.grid.getMoveCost(startRow, startCol) < 0) return null;
    if (this.grid.getMoveCost(endRow, endCol) < 0) return null;

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startH = this.heuristic(startRow, startCol, endRow, endCol);
    openList.push({
      row: startRow,
      col: startCol,
      g: 0,
      h: startH,
      f: startH,
      parent: null,
    });

    while (openList.length > 0) {
      const lowestIdx = this.findLowestF(openList);

      const current = openList[lowestIdx];

      // 到达终点
      if (current.row === endRow && current.col === endCol) {
        return this.reconstructPath(current);
      }

      openList.splice(lowestIdx, 1);
      closedSet.add(this.key(current.row, current.col));

      // 扩展邻居
      for (const [dr, dc] of DIRS) {
        const nr = current.row + dr;
        const nc = current.col + dc;

        if (!this.isInBounds(nr, nc)) continue;
        if (closedSet.has(this.key(nr, nc))) continue;

        const moveCost = this.grid.getMoveCost(nr, nc);
        if (moveCost < 0) continue;

        if (this.isOccupied && this.isOccupied(nr, nc)) continue;

        const g = current.g + moveCost;
        const h = this.heuristic(nr, nc, endRow, endCol);
        const f = g + h;

        if (this.tryUpdateNode(openList, nr, nc, g, h, current)) continue;

        openList.push({ row: nr, col: nc, g, h, f, parent: current });
      }
    }

    return null; // 无路径
  }

  /**
   * 查找指定移动力范围内所有可达格
   *
   * @param startRow - 起点行
   * @param startCol - 起点列
   * @param range - 移动力上限
   * @returns 可达格数组（不含起点），按探索顺序排列
   */
  findPathInRange(
    startRow: number,
    startCol: number,
    range: number,
  ): { row: number; col: number }[] {
    if (range <= 0) return [];
    if (!this.isInBounds(startRow, startCol)) return [];
    if (this.grid.getMoveCost(startRow, startCol) < 0) return [];

    const distances = new Map<string, number>();
    const startKey = this.key(startRow, startCol);
    distances.set(startKey, 0);

    const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = this.key(current.row, current.col);
      const currentCost = distances.get(currentKey)!;

      for (const [dr, dc] of DIRS) {
        const nr = current.row + dr;
        const nc = current.col + dc;

        if (!this.isInBounds(nr, nc)) continue;

        const moveCost = this.grid.getMoveCost(nr, nc);
        if (moveCost < 0) continue;

        if (this.isOccupied && this.isOccupied(nr, nc)) continue;

        const newCost = currentCost + moveCost;
        const nKey = this.key(nr, nc);

        if (newCost <= range && (!distances.has(nKey) || newCost < distances.get(nKey)!)) {
          distances.set(nKey, newCost);
          queue.push({ row: nr, col: nc });
        }
      }
    }

    // 构造结果（排除起点）
    const result: { row: number; col: number }[] = [];
    for (const key of distances.keys()) {
      if (key !== startKey) {
        const [r, c] = key.split(',').map(Number);
        result.push({ row: r, col: c });
      }
    }
    return result;
  }

  /** 检查坐标是否在网格范围内 */
  private isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
  }

  /** 坐标 -> 字符串键 */
  private key(row: number, col: number): string {
    return `${row},${col}`;
  }

  /** 从目标节点回溯完整路径（不含起点） */
  private reconstructPath(node: PathNode): { row: number; col: number }[] {
    const path: { row: number; col: number }[] = [];
    let current: PathNode | null = node;
    while (current && current.parent !== null) {
      path.unshift({ row: current.row, col: current.col });
      current = current.parent;
    }
    return path;
  }

  /** 在 openList 中查找 f 值最小的节点索引 */
  private findLowestF(openList: PathNode[]): number {
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    return lowestIdx;
  }

  /** 尝试更新 openList 中已有节点，返回 true 表示已存在并更新 */
  private tryUpdateNode(
    openList: PathNode[],
    row: number,
    col: number,
    g: number,
    h: number,
    parent: PathNode,
  ): boolean {
    const existing = openList.find(n => n.row === row && n.col === col);
    if (existing) {
      if (g < existing.g) {
        existing.g = g;
        existing.f = g + h;
        existing.parent = parent;
      }
      return true;
    }
    return false;
  }
}

import { TileType, TILE_PROPERTIES } from './TileType';

export const GRID_SIZE = 8;

export class MapGrid {
  readonly tiles: TileType[][];

  constructor(tiles: TileType[][]) {
    this.tiles = tiles;
  }

  isPassable(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return false;
    }
    return TILE_PROPERTIES[this.tiles[row][col]].passable;
  }

  getMoveCost(row: number, col: number): number {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return -1;
    }
    const tile = this.tiles[row][col];
    if (!TILE_PROPERTIES[tile].passable) {
      return -1;
    }
    return TILE_PROPERTIES[tile].moveCost;
  }
}

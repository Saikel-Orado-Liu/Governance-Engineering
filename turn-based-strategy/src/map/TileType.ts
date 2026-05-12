export const enum TileType {
  Plain = 0,
  Forest = 1,
  Mountain = 2,
  Water = 3,
}

export const TILE_PROPERTIES: Record<TileType, { passable: boolean; moveCost: number }> = {
  [TileType.Plain]: { passable: true, moveCost: 1 },
  [TileType.Forest]: { passable: true, moveCost: 2 },
  [TileType.Mountain]: { passable: false, moveCost: -1 },
  [TileType.Water]: { passable: false, moveCost: -1 },
};

export function getTileLabel(type: TileType): string {
  switch (type) {
    case TileType.Plain: return 'Plain';
    case TileType.Forest: return 'Forest';
    case TileType.Mountain: return 'Mountain';
    case TileType.Water: return 'Water';
  }
}

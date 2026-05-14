export interface Coordinate {
  row: number;
  col: number;
}

export const DIRECTION_OFFSETS: readonly [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

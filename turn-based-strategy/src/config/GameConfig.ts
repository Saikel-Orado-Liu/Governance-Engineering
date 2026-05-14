import { UnitType } from '../unit/UnitType';

/** Formation 代表一队的编队配置，即单位类型数组 */
export type Formation = UnitType[];

/**
 * GameConfig — 游戏全局配置接口
 * 所有字段均为 readonly，运行时不可修改
 */
export interface GameConfig {
  /** 每队可部署单位数量（1-4） */
  readonly teamSize: number;

  /** 编队配置：键为 team 索引 (0/1)，值为 UnitType[] */
  readonly formations: Record<number, Formation>;

  /** 部署坐标：键为 team 索引 (0/1)，值为坐标数组 */
  readonly deployCoordinates: Record<number, { readonly row: number; readonly col: number }[]>;
}

/** 默认游戏配置 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  teamSize: 3,

  formations: {
    0: [UnitType.Warrior, UnitType.Archer, UnitType.Knight],
    1: [UnitType.Warrior, UnitType.Archer, UnitType.Knight],
  },

  deployCoordinates: {
    0: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
    1: [
      { row: 7, col: 7 },
      { row: 7, col: 6 },
      { row: 7, col: 5 },
    ],
  },
};

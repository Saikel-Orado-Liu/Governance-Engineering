import { describe, it, expect } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../GameConfig';

describe('GameConfig', () => {
  describe('DEFAULT_GAME_CONFIG', () => {
    it('should have teamSize === 3', () => {
      expect(DEFAULT_GAME_CONFIG.teamSize).toBe(3);
    });

    it('should have deployCoordinates for team 0 and team 1', () => {
      expect(DEFAULT_GAME_CONFIG.deployCoordinates).toHaveProperty('0');
      expect(DEFAULT_GAME_CONFIG.deployCoordinates).toHaveProperty('1');
    });

    it('should have correct deploy positions for team 0', () => {
      const coords = DEFAULT_GAME_CONFIG.deployCoordinates[0];
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ row: 0, col: 0 });
      expect(coords[1]).toEqual({ row: 0, col: 1 });
      expect(coords[2]).toEqual({ row: 0, col: 2 });
    });

    it('should have correct deploy positions for team 1', () => {
      const coords = DEFAULT_GAME_CONFIG.deployCoordinates[1];
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ row: 7, col: 7 });
      expect(coords[1]).toEqual({ row: 7, col: 6 });
      expect(coords[2]).toEqual({ row: 7, col: 5 });
    });

    it('should have formations for team 0 and team 1', () => {
      expect(DEFAULT_GAME_CONFIG.formations).toHaveProperty('0');
      expect(DEFAULT_GAME_CONFIG.formations).toHaveProperty('1');
      expect(DEFAULT_GAME_CONFIG.formations[0]).toHaveLength(3);
      expect(DEFAULT_GAME_CONFIG.formations[1]).toHaveLength(3);
    });
  });
});

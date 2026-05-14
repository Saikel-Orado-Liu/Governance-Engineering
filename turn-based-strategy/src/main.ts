import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { UnitType, UNIT_CONFIGS } from './unit/UnitType';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();

const manager = new UnitManager(grid);

const renderer = new MapRenderer({
  canvas,
  onClick: (row: number, col: number) => {
    const unit = manager.getUnitAt(row, col);
    if (unit) {
      const config = UNIT_CONFIGS[unit.type];
      console.log(`Unit: ${unit.team === 0 ? 'Blue' : 'Red'} ${config.name} at (${row},${col}) HP: ${unit.hp}/${unit.maxHp}`);
    }
  },
});

// Deploy Team 0 (Blue)
manager.spawnUnit(UnitType.Warrior, 0, 0, 0);
manager.spawnUnit(UnitType.Archer, 0, 0, 1);
manager.spawnUnit(UnitType.Mage, 0, 0, 2);
manager.spawnUnit(UnitType.Knight, 0, 0, 3);
manager.spawnUnit(UnitType.Warrior, 0, 1, 0);

// Deploy Team 1 (Red)
manager.spawnUnit(UnitType.Warrior, 1, 7, 7);
manager.spawnUnit(UnitType.Archer, 1, 7, 6);
manager.spawnUnit(UnitType.Mage, 1, 7, 5);
manager.spawnUnit(UnitType.Knight, 1, 7, 4);
manager.spawnUnit(UnitType.Warrior, 1, 6, 7);

renderer.render(grid);
renderer.renderUnits(manager.getAllUnits());

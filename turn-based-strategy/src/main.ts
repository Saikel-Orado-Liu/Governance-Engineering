import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const generator = new MapGenerator();
const grid = generator.generate();
const renderer = new MapRenderer({ canvas });
renderer.render(grid);

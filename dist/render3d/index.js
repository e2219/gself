import * as THREE from 'three';
import {createFlightRenderer} from './flight.js';
import {createPuzzleRenderer} from './puzzle.js';
window.Moon3D={revision:THREE.REVISION,createFlight:canvas=>createFlightRenderer(THREE,canvas),createPuzzle:canvas=>createPuzzleRenderer(THREE,canvas)};

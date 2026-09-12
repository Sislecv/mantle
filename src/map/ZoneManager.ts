/**
 * Mantle Chapter 1 - Zone Manager
 * Coordinates multi-zone room transitions, map instantiation, obstacle tracking,
 * and unified collision detection across the 5 Chapter 1 Dark World areas.
 */

import { Tilemap } from './Tilemap';
import { TILES, createTile } from './Tile';
import { DestructibleObstacle } from './DestructibleObstacle';
import { Renderer } from '../core/Renderer';

export const ZONE_IDS = {
  CLIFFS: 'ZONE_CLIFFS',
  CASTLE_TOWN: 'ZONE_CASTLE_TOWN',
  FIELD: 'ZONE_FIELD',
  FOREST: 'ZONE_FOREST',
  CASTLE: 'ZONE_CASTLE',
} as const;

export type ZoneId = (typeof ZONE_IDS)[keyof typeof ZONE_IDS] | string;

export interface ZoneTransition {
  gridX: number;
  gridY: number;
  targetZoneId: string;
  targetSpawnX: number;
  targetSpawnY: number;
}

export interface ZoneData {
  id: string;
  name: string;
  tilemap: Tilemap;
  obstacles: DestructibleObstacle[];
  spawnX: number;
  spawnY: number;
  transitions: ZoneTransition[];
  bgm?: string;
}

export class ZoneManager {
  private zones: Map<string, ZoneData> = new Map();
  private currentZoneId: string = ZONE_IDS.CLIFFS;

  public playerSpawnX: number = 2;
  public playerSpawnY: number = 7;
  public onZoneTransition?: (targetZoneId: string, spawnX: number, spawnY: number) => void;

  constructor() {
    this.buildDefaultZones();
    this.loadZone(ZONE_IDS.CLIFFS);
  }

  /**
   * Registers a zone data object.
   */
  public registerZone(zone: ZoneData): void {
    this.zones.set(zone.id, zone);
  }

  /**
   * Loads and switches the active zone.
   */
  public loadZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone not found: ${zoneId}`);
    }
    this.currentZoneId = zoneId;
    this.playerSpawnX = zone.spawnX;
    this.playerSpawnY = zone.spawnY;
  }

  /**
   * Retrieves the currently active zone data.
   */
  public getCurrentZone(): ZoneData {
    const zone = this.zones.get(this.currentZoneId);
    if (!zone) {
      throw new Error(`Current zone invalid: ${this.currentZoneId}`);
    }
    return zone;
  }

  /**
   * Returns list of destructible obstacles present in the current zone.
   */
  public getObstacles(): DestructibleObstacle[] {
    return this.getCurrentZone().obstacles;
  }

  /**
   * Triggers a transition to another zone and sets new player spawn coordinates.
   */
  public triggerTransition(targetZoneId: string, spawnX: number, spawnY: number): void {
    this.loadZone(targetZoneId);
    this.playerSpawnX = spawnX;
    this.playerSpawnY = spawnY;

    if (this.onZoneTransition) {
      this.onZoneTransition(targetZoneId, spawnX, spawnY);
    }
  }

  /**
   * Returns any obstacle occupying the specified grid coordinate.
   */
  public getObstacleAt(gridX: number, gridY: number): DestructibleObstacle | null {
    const obstacles = this.getObstacles();
    for (const obstacle of obstacles) {
      if (obstacle.occupies(gridX, gridY)) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * Evaluates solidity at (gridX, gridY), accounting for both tilemap collisions
   * and any active (non-destroyed) destructible obstacles.
   */
  public isSolid(gridX: number, gridY: number): boolean {
    const current = this.getCurrentZone();

    // 1. Check tilemap solidity
    if (current.tilemap.isSolid(gridX, gridY)) {
      return true;
    }

    // 2. Check destructible obstacles
    const obstacle = this.getObstacleAt(gridX, gridY);
    if (obstacle && obstacle.isSolid()) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates solidity at pixel coordinates (pixelX, pixelY).
   */
  public isSolidAtPixel(pixelX: number, pixelY: number): boolean {
    const current = this.getCurrentZone();
    if (current.tilemap.isSolidAtPixel(pixelX, pixelY)) {
      return true;
    }

    for (const obstacle of current.obstacles) {
      if (obstacle.occupiesPixel(pixelX, pixelY)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks whether the current grid coordinate contains a transition point.
   */
  public checkTransition(gridX: number, gridY: number): ZoneTransition | null {
    const current = this.getCurrentZone();
    for (const tr of current.transitions) {
      if (tr.gridX === gridX && tr.gridY === gridY) {
        return tr;
      }
    }
    return null;
  }

  /**
   * Renders the active zone: base tilemap followed by all obstacles.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const current = this.getCurrentZone();
    current.tilemap.render(renderer, cameraX, cameraY);

    for (const obstacle of current.obstacles) {
      obstacle.render(renderer, cameraX, cameraY);
    }
  }

  // --------------------------------------------------------------------------
  // Default Chapter 1 Zone Builders
  // --------------------------------------------------------------------------

  private buildDefaultZones(): void {
    this.registerZone(this.createCliffsZone());
    this.registerZone(this.createCastleTownZone());
    this.registerZone(this.createFieldZone());
    this.registerZone(this.createForestZone());
    this.registerZone(this.createCastleZone());
  }

  /**
   * Zone 1: Dark Cliffs
   * Awakening area, downward slide slope, leading towards Castle Town gate.
   */
  private createCliffsZone(): ZoneData {
    const map = new Tilemap(16, 15, TILES.FLOOR_CLIFF);

    // Perimeter walls
    this.fillBorderWalls(map, 'WALL_CLIFF');

    // Slide slope feature in center
    for (let x = 6; x <= 9; x++) {
      map.setTile(x, 6, createTile('SLIDE_SLOPE'));
      map.setTile(x, 7, createTile('SLIDE_SLOPE'));
    }

    // East exit to Castle Town
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_castle_town' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'cliffs_gate_1',
        gridX: 12,
        gridY: 7,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: true,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE_TOWN,
        targetSpawnX: 1,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.CLIFFS,
      name: 'Dark Cliffs',
      tilemap: map,
      obstacles,
      spawnX: 2,
      spawnY: 7,
      transitions,
    };
  }

  /**
   * Zone 2: Castle Town
   * The empty town, hero sword in stone pedestal at center, Ralsei castle.
   */
  private createCastleTownZone(): ZoneData {
    const map = new Tilemap(16, 15, TILES.FLOOR_CLIFF);
    this.fillBorderWalls(map, 'WALL_CASTLE');

    // West entrance from Cliffs
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_cliffs' }));

    // Center sword pedestal area
    map.setTile(8, 7, createTile('FLOOR_CHECKER_LIGHT', { symbol: '†', triggerId: 'pedestal_sword' }));

    // East exit to Field
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'town_boulder',
        gridX: 13,
        gridY: 7,
        type: 'BOULDER',
        requiredLv: 3,
        requiredSword: true,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.CLIFFS,
        targetSpawnX: 14,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.FIELD,
        targetSpawnX: 1,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.CASTLE_TOWN,
      name: 'Castle Town',
      tilemap: map,
      obstacles,
      spawnX: 1,
      spawnY: 7,
      transitions,
    };
  }

  /**
   * Zone 3: Field of Hopes and Dreams
   * Iconic purple checkerboard tiles, puzzle plate spots, water hazards.
   */
  private createFieldZone(): ZoneData {
    const map = new Tilemap(16, 15, TILES.FLOOR_CHECKER_LIGHT);

    // Checkerboard floor pattern
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 16; x++) {
        if ((x + y) % 2 === 1) {
          map.setTile(x, y, createTile('FLOOR_CHECKER_DARK'));
        }
      }
    }

    // Border walls
    this.fillBorderWalls(map, 'WALL_CLIFF');

    // West entrance from Castle Town
    map.setTile(0, 7, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_castle_town' }));

    // Water obstacle in upper area
    for (let x = 5; x <= 10; x++) {
      map.setTile(x, 3, createTile('WATER'));
    }

    // East exit to Scarlet Forest
    map.setTile(15, 7, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_forest' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'field_tree_1',
        gridX: 10,
        gridY: 7,
        type: 'TREE',
        requiredLv: 2,
        requiredSword: true,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE_TOWN,
        targetSpawnX: 14,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.FOREST,
        targetSpawnX: 1,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.FIELD,
      name: 'Field of Hopes and Dreams',
      tilemap: map,
      obstacles,
      spawnX: 1,
      spawnY: 7,
      transitions,
    };
  }

  /**
   * Zone 4: Scarlet Forest
   * Crimson foliage, dense destructible trees (LV 2 sword slice), spike traps.
   */
  private createForestZone(): ZoneData {
    const map = new Tilemap(16, 15, TILES.FLOOR_CLIFF);
    this.fillBorderWalls(map, 'WALL_CLIFF');

    // West entrance from Field
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));

    // Spurt spikes hazard
    map.setTile(5, 5, createTile('SPURT_SPIKES'));
    map.setTile(5, 6, createTile('SPURT_SPIKES'));

    // East exit to Card Castle
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_castle' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'forest_tree_1',
        gridX: 7,
        gridY: 7,
        type: 'TREE',
        requiredLv: 2,
        requiredSword: true,
      }),
      new DestructibleObstacle({
        id: 'forest_tree_2',
        gridX: 10,
        gridY: 4,
        type: 'TREE',
        requiredLv: 2,
        requiredSword: true,
      }),
      new DestructibleObstacle({
        id: 'forest_boulder_1',
        gridX: 12,
        gridY: 7,
        type: 'BOULDER',
        requiredLv: 3,
        requiredSword: true,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.FIELD,
        targetSpawnX: 14,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE,
        targetSpawnX: 1,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.FOREST,
      name: 'Scarlet Forest',
      tilemap: map,
      obstacles,
      spawnX: 1,
      spawnY: 7,
      transitions,
    };
  }

  /**
   * Zone 5: Card Castle
   * Dark stone walls, dungeon cells, royal throne room path.
   */
  private createCastleZone(): ZoneData {
    const map = new Tilemap(16, 15, TILES.FLOOR_CLIFF);
    this.fillBorderWalls(map, 'WALL_CASTLE');

    // West entrance from Scarlet Forest
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_forest' }));

    // Castle throne or dungeon entrance at North
    map.setTile(8, 0, createTile('FLOOR_CLIFF', { triggerId: 'throne_room' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'castle_gate_1',
        gridX: 8,
        gridY: 4,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: true,
      }),
      new DestructibleObstacle({
        id: 'castle_boulder_1',
        gridX: 8,
        gridY: 10,
        type: 'BOULDER',
        requiredLv: 3,
        requiredSword: true,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.FOREST,
        targetSpawnX: 14,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.CASTLE,
      name: 'Card Castle',
      tilemap: map,
      obstacles,
      spawnX: 1,
      spawnY: 7,
      transitions,
    };
  }

  /**
   * Utility helper to draw solid border walls around a tilemap.
   */
  private fillBorderWalls(map: Tilemap, wallType: 'WALL_CLIFF' | 'WALL_CASTLE'): void {
    for (let x = 0; x < map.width; x++) {
      map.setTile(x, 0, createTile(wallType));
      map.setTile(x, map.height - 1, createTile(wallType));
    }
    for (let y = 0; y < map.height; y++) {
      map.setTile(0, y, createTile(wallType));
      map.setTile(map.width - 1, y, createTile(wallType));
    }
  }
}

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
   * Tolerant to border tile alignment so players hitting map boundaries transition smoothly.
   */
  /**
   * Checks whether the current grid coordinate contains a transition point.
   * Tolerant to border tile alignment so players hitting map boundaries transition smoothly.
   */
  public checkTransition(
    gridX: number,
    gridY: number,
    facing?: string,
    vx?: number
  ): ZoneTransition | null {
    const current = this.getCurrentZone();
    for (const tr of current.transitions) {
      if (tr.gridX === 15) {
        // East exit
        const matchY = Math.abs(tr.gridY - gridY) <= 1;
        const onEdge = gridX >= 14;
        const movingEast = !facing || facing === 'RIGHT' || (vx !== undefined && vx > 0);
        if (onEdge && matchY && movingEast) {
          return tr;
        }
      } else if (tr.gridX === 0) {
        // West exit
        const matchY = Math.abs(tr.gridY - gridY) <= 1;
        const onEdge = gridX <= 1;
        const movingWest = !facing || facing === 'LEFT' || (vx !== undefined && vx < 0);
        if (onEdge && matchY && movingWest) {
          return tr;
        }
      } else {
        if (tr.gridX === gridX && Math.abs(tr.gridY - gridY) <= 1) {
          return tr;
        }
      }
    }
    return null;
  }

  /**
   * Renders the active zone: atmospheric background, base tilemap, and obstacles.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const current = this.getCurrentZone();

    // 1. Zone-specific atmospheric background
    this.renderZoneBackground(renderer, current.id, cameraX, cameraY);

    // 2. Base tilemap
    current.tilemap.render(renderer, cameraX, cameraY);

    // 3. Zone props & ambient effects
    this.renderZoneAtmosphere(renderer, current.id);

    // 4. Destructible obstacles
    for (const obstacle of current.obstacles) {
      obstacle.render(renderer, cameraX, cameraY);
    }
  }

  /**
   * Renders authentic 8-bit ambient backdrop for each zone.
   */
  private renderZoneBackground(
    renderer: Renderer,
    zoneId: string,
    _camX: number,
    _camY: number
  ): void {
    switch (zoneId) {
      case ZONE_IDS.CLIFFS:
        // Dark indigo to abyssal purple gradient
        renderer.drawRect(0, 0, 256, 240, '#0E0918', true);
        break;
      case ZONE_IDS.CASTLE_TOWN:
        // Pure silent dark town
        renderer.drawRect(0, 0, 256, 240, '#080810', true);
        break;
      case ZONE_IDS.FIELD:
        // Field of Hopes & Dreams deep crimson base
        renderer.drawRect(0, 0, 256, 240, '#1C060E', true);
        break;
      case ZONE_IDS.FOREST:
        // Scarlet Forest deep maroon
        renderer.drawRect(0, 0, 256, 240, '#24080A', true);
        break;
      case ZONE_IDS.CASTLE:
        // Royal Card Castle deep obsidian navy
        renderer.drawRect(0, 0, 256, 240, '#060B18', true);
        break;
    }
  }

  /**
   * Ambient particles and thematic visual accents.
   */
  private renderZoneAtmosphere(renderer: Renderer, zoneId: string): void {
    const time = Date.now();

    switch (zoneId) {
      case ZONE_IDS.CLIFFS: {
        // Floating dust specks in the dark cliffs
        for (let i = 0; i < 12; i++) {
          const px = (i * 37 + Math.sin(time / 1000 + i) * 12) % 240 + 8;
          const py = (i * 23 + (time / 80) * (i % 2 === 0 ? 0.3 : 0.5)) % 220 + 15;
          renderer.drawRect(Math.floor(px), Math.floor(py), 1, 1, '#665588', true);
        }
        break;
      }
      case ZONE_IDS.CASTLE_TOWN: {
        // Distant ethereal beam of the Dark Fountain (center horizon)
        renderer.drawRect(124, 0, 8, 120, 'rgba(64, 192, 224, 0.15)', true);
        renderer.drawRect(126, 0, 4, 120, 'rgba(255, 255, 255, 0.25)', true);
        break;
      }
      case ZONE_IDS.FIELD: {
        // Red checkerboard accents on ground
        for (let gx = 1; gx < 15; gx += 2) {
          for (let gy = 1; gy < 14; gy += 2) {
            renderer.drawRect(gx * 16, gy * 16, 16, 16, 'rgba(180, 20, 60, 0.08)', true);
          }
        }
        break;
      }
      case ZONE_IDS.FOREST: {
        // Falling scarlet leaves drifting down
        for (let i = 0; i < 10; i++) {
          const lx = (i * 29 + Math.sin(time / 400 + i) * 14) % 240 + 8;
          const ly = (i * 31 + (time / 50) * 0.4) % 220 + 15;
          renderer.drawRect(Math.floor(lx), Math.floor(ly), 2, 2, '#D32F2F', true);
        }
        break;
      }
      case ZONE_IDS.CASTLE: {
        // Royal spade marble corner accents
        for (let gx = 2; gx < 14; gx += 4) {
          renderer.drawRect(gx * 16 + 7, 24, 2, 2, 'rgba(255, 255, 255, 0.15)', true);
        }
        break;
      }
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

    // Slide slope feature in center (rows 6 & 7)
    for (let x = 5; x <= 8; x++) {
      map.setTile(x, 6, createTile('SLIDE_SLOPE'));
      map.setTile(x, 7, createTile('SLIDE_SLOPE'));
    }

    // Canyon rock walls funneling to gate at (12, 7)
    for (let y = 1; y <= 5; y++) {
      map.setTile(12, y, createTile('WALL_CLIFF'));
    }
    for (let y = 9; y <= 13; y++) {
      map.setTile(12, y, createTile('WALL_CLIFF'));
    }

    // East exit to Castle Town (rows 6, 7, 8)
    map.setTile(15, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_castle_town' }));
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_castle_town' }));
    map.setTile(15, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_castle_town' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'cliffs_gate_1',
        gridX: 12,
        gridY: 7,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: false,
      }),
      new DestructibleObstacle({
        id: 'cliffs_gate_top',
        gridX: 12,
        gridY: 6,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: false,
      }),
      new DestructibleObstacle({
        id: 'cliffs_gate_bottom',
        gridX: 12,
        gridY: 8,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: false,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE_TOWN,
        targetSpawnX: 2,
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

    // West entrance from Cliffs (rows 6, 7, 8)
    map.setTile(0, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_cliffs' }));
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_cliffs' }));
    map.setTile(0, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_cliffs' }));

    // Center sword pedestal area
    map.setTile(8, 7, createTile('FLOOR_CHECKER_LIGHT', { symbol: '†', triggerId: 'pedestal_sword' }));

    // East exit to Field (rows 6, 7, 8)
    map.setTile(15, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));
    map.setTile(15, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));

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
        targetSpawnX: 13,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.FIELD,
        targetSpawnX: 2,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.CASTLE_TOWN,
      name: 'Castle Town',
      tilemap: map,
      obstacles,
      spawnX: 2,
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

    // West entrance from Castle Town (rows 6, 7, 8)
    map.setTile(0, 6, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_castle_town' }));
    map.setTile(0, 7, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_castle_town' }));
    map.setTile(0, 8, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_castle_town' }));

    // Hint sign for Suit Plate puzzle at (2, 6)
    map.setTile(2, 6, createTile('FLOOR_CHECKER_LIGHT', { symbol: '§', triggerId: 'suit_hint' }));

    // Barrier wall partition 1 (column 6, gating Suit puzzle)
    for (let y = 1; y <= 5; y++) {
      map.setTile(6, y, createTile('WALL_CLIFF'));
    }
    for (let y = 9; y <= 13; y++) {
      map.setTile(6, y, createTile('WALL_CLIFF'));
    }

    // Barrier wall partition 2 (column 10, gating Box puzzle)
    for (let y = 1; y <= 5; y++) {
      map.setTile(10, y, createTile('WALL_CLIFF'));
    }
    for (let y = 9; y <= 13; y++) {
      map.setTile(10, y, createTile('WALL_CLIFF'));
    }

    // Water hazard in upper area
    for (let x = 7; x <= 9; x++) {
      map.setTile(x, 2, createTile('WATER'));
      map.setTile(x, 3, createTile('WATER'));
    }

    // East exit to Scarlet Forest (rows 6, 7, 8)
    map.setTile(15, 6, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_forest' }));
    map.setTile(15, 7, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_forest' }));
    map.setTile(15, 8, createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'to_forest' }));

    const obstacles: DestructibleObstacle[] = [
      // Suit Puzzle Electric Spike Barrier (column 6, rows 6..8)
      new DestructibleObstacle({
        id: 'field_spike_1',
        gridX: 6,
        gridY: 6,
        type: 'SPIKE_BARRIER',
      }),
      new DestructibleObstacle({
        id: 'field_spike_2',
        gridX: 6,
        gridY: 7,
        type: 'SPIKE_BARRIER',
      }),
      new DestructibleObstacle({
        id: 'field_spike_3',
        gridX: 6,
        gridY: 8,
        type: 'SPIKE_BARRIER',
      }),

      // Box Puzzle Iron Gate (column 10, rows 6..8)
      new DestructibleObstacle({
        id: 'field_gate_1',
        gridX: 10,
        gridY: 6,
        type: 'IRON_GATE',
      }),
      new DestructibleObstacle({
        id: 'field_gate_2',
        gridX: 10,
        gridY: 7,
        type: 'IRON_GATE',
      }),
      new DestructibleObstacle({
        id: 'field_gate_3',
        gridX: 10,
        gridY: 8,
        type: 'IRON_GATE',
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE_TOWN,
        targetSpawnX: 13,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.FOREST,
        targetSpawnX: 2,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.FIELD,
      name: 'Field of Hopes and Dreams',
      tilemap: map,
      obstacles,
      spawnX: 2,
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

    // West entrance from Field (rows 6, 7, 8)
    map.setTile(0, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));
    map.setTile(0, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_field' }));

    // Tree carving sign at (4, 5)
    map.setTile(4, 5, createTile('FLOOR_CLIFF', { symbol: '¶', triggerId: 'forest_sign' }));

    // Spurt spikes hazard
    map.setTile(5, 3, createTile('SPURT_SPIKES'));
    map.setTile(5, 4, createTile('SPURT_SPIKES'));

    // East exit to Card Castle (rows 6, 7, 8)
    map.setTile(15, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_castle' }));
    map.setTile(15, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_castle' }));
    map.setTile(15, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_castle' }));

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
        id: 'forest_tree_top',
        gridX: 7,
        gridY: 6,
        type: 'TREE',
        requiredLv: 2,
        requiredSword: true,
      }),
      new DestructibleObstacle({
        id: 'forest_tree_bottom',
        gridX: 7,
        gridY: 8,
        type: 'TREE',
        requiredLv: 2,
        requiredSword: true,
      }),
      new DestructibleObstacle({
        id: 'forest_boulder_1',
        gridX: 11,
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
        targetSpawnX: 13,
        targetSpawnY: 7,
      },
      {
        gridX: 15,
        gridY: 7,
        targetZoneId: ZONE_IDS.CASTLE,
        targetSpawnX: 2,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.FOREST,
      name: 'Scarlet Forest',
      tilemap: map,
      obstacles,
      spawnX: 2,
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

    // West entrance from Scarlet Forest (rows 6, 7, 8)
    map.setTile(0, 6, createTile('FLOOR_CLIFF', { triggerId: 'to_forest' }));
    map.setTile(0, 7, createTile('FLOOR_CLIFF', { triggerId: 'to_forest' }));
    map.setTile(0, 8, createTile('FLOOR_CLIFF', { triggerId: 'to_forest' }));

    // Royal corridor partition wall at row 4 leading to Throne Room
    for (let x = 1; x <= 6; x++) {
      map.setTile(x, 4, createTile('WALL_CASTLE'));
    }
    for (let x = 10; x <= 14; x++) {
      map.setTile(x, 4, createTile('WALL_CASTLE'));
    }

    // Throne room doorway at (7..9, 4)
    map.setTile(7, 4, createTile('WALL_CASTLE'));
    map.setTile(9, 4, createTile('WALL_CASTLE'));
    map.setTile(8, 4, createTile('FLOOR_CLIFF'));

    // Dark Fountain in throne room at (8, 0)
    map.setTile(8, 0, createTile('FLOOR_CLIFF', { triggerId: 'dark_fountain' }));

    const obstacles: DestructibleObstacle[] = [
      new DestructibleObstacle({
        id: 'castle_gate_1',
        gridX: 8,
        gridY: 4,
        type: 'IRON_GATE',
        requiredLv: 99,
        requiredSword: false,
      }),
    ];

    const transitions: ZoneTransition[] = [
      {
        gridX: 0,
        gridY: 7,
        targetZoneId: ZONE_IDS.FOREST,
        targetSpawnX: 13,
        targetSpawnY: 7,
      },
    ];

    return {
      id: ZONE_IDS.CASTLE,
      name: 'Card Castle',
      tilemap: map,
      obstacles,
      spawnX: 2,
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

/**
 * Mantle Chapter 1 - Box Push Puzzle & Rouxls Kaard Spoof
 * Implements pushable crates, floor pressure plates, and the hilarious
 * Rouxls Kaard single-tile puzzle parody from Deltarune Chapter 1.
 */

import { Puzzle, PuzzleOptions } from './Puzzle';
import { Entity } from '../entities/Entity';
import { Tilemap } from '../map/Tilemap';
import { Renderer } from '../core/Renderer';
import { NES_COLORS, TILE_SIZE } from '../core/Constants';

export interface Crate {
  id: string;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isSolid: boolean;
}

export interface PressurePlate {
  id: string;
  gridX: number;
  gridY: number;
  isPressed: boolean;
}

export interface BoxPushPuzzleOptions extends PuzzleOptions {
  crates: Array<{ id: string; gridX: number; gridY: number; isSolid?: boolean }>;
  plates: Array<{ id: string; gridX: number; gridY: number }>;
}

export class BoxPushPuzzle extends Puzzle {
  public crates: Crate[];
  public plates: PressurePlate[];

  constructor(options: BoxPushPuzzleOptions) {
    super(options);

    this.crates = options.crates.map((c) => ({
      id: c.id,
      gridX: c.gridX,
      gridY: c.gridY,
      x: c.gridX * TILE_SIZE,
      y: c.gridY * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      isSolid: c.isSolid ?? true,
    }));

    this.plates = options.plates.map((p) => ({
      id: p.id,
      gridX: p.gridX,
      gridY: p.gridY,
      isPressed: false,
    }));

    this.updatePlates();
  }

  public getCrate(id: string): Crate | undefined {
    return this.crates.find((c) => c.id === id);
  }

  public getPlate(id: string): PressurePlate | undefined {
    return this.plates.find((p) => p.id === id);
  }

  /**
   * Evaluates if all pressure plates are covered by crates.
   */
  public checkSolution(): boolean {
    return this.isSolved || (this.plates.length > 0 && this.plates.every((p) => p.isPressed));
  }

  /**
   * Attempts to push a crate 1 tile in specified direction.
   */
  public pushCrate(crateId: string, dirX: number, dirY: number, tilemap?: Tilemap): boolean {
    const crate = this.getCrate(crateId);
    if (!crate) {
      return false;
    }

    const destGridX = crate.gridX + dirX;
    const destGridY = crate.gridY + dirY;

    // Check map boundaries
    if (destGridX < 0 || destGridY < 0) {
      return false;
    }

    if (tilemap) {
      if (destGridX >= tilemap.width || destGridY >= tilemap.height) {
        return false;
      }
      if (tilemap.isSolid(destGridX, destGridY)) {
        return false;
      }
    }

    // Check collision with another crate
    const isOccupied = this.crates.some(
      (c) => c.id !== crate.id && c.gridX === destGridX && c.gridY === destGridY
    );
    if (isOccupied) {
      return false;
    }

    // Move crate
    crate.gridX = destGridX;
    crate.gridY = destGridY;
    crate.x = destGridX * TILE_SIZE;
    crate.y = destGridY * TILE_SIZE;

    if (this.audio) {
      this.audio.playSfx('SELECT');
    }

    this.updatePlates();

    if (this.checkSolution()) {
      this.solve();
    }

    return true;
  }

  /**
   * Updates isPressed state of all pressure plates.
   */
  public updatePlates(): void {
    for (const plate of this.plates) {
      plate.isPressed = this.crates.some(
        (c) => c.gridX === plate.gridX && c.gridY === plate.gridY
      );
    }
  }

  /**
   * Interacts with player bounding box and movement vector.
   */
  public update(player: Entity, tilemap?: Tilemap): void {
    if (this.isSolved) {
      return;
    }

    const pBounds = player.getBounds();

    for (const crate of this.crates) {
      const cBounds = {
        x: crate.x,
        y: crate.y,
        width: crate.width,
        height: crate.height,
      };

      // Check overlap
      const overlapX =
        pBounds.x < cBounds.x + cBounds.width && pBounds.x + pBounds.width > cBounds.x;
      const overlapY =
        pBounds.y < cBounds.y + cBounds.height && pBounds.y + pBounds.height > cBounds.y;

      if (overlapX && overlapY) {
        // Player is touching / pressing against crate; resolve push based on facing
        let dirX = 0;
        let dirY = 0;

        switch (player.facing) {
          case 'RIGHT':
            if (player.vx >= 0) dirX = 1;
            break;
          case 'LEFT':
            if (player.vx <= 0) dirX = -1;
            break;
          case 'DOWN':
            if (player.vy >= 0) dirY = 1;
            break;
          case 'UP':
            if (player.vy <= 0) dirY = -1;
            break;
        }

        if (dirX !== 0 || dirY !== 0) {
          this.pushCrate(crate.id, dirX, dirY, tilemap);
        }
      }
    }
  }

  /**
   * Renders pressure plates and crates.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    // 1. Render Pressure Plates
    for (const plate of this.plates) {
      const px = Math.floor(plate.gridX * TILE_SIZE - cameraX);
      const py = Math.floor(plate.gridY * TILE_SIZE - cameraY);

      const baseColor = plate.isPressed ? '#4A3B18' : '#2A2038';
      const buttonColor = plate.isPressed ? NES_COLORS.GOLD_ACCENT : '#5B4B70';

      renderer.drawRect(px, py, TILE_SIZE, TILE_SIZE, baseColor);
      renderer.drawRect(px + 2, py + 2, 12, 12, buttonColor);
      if (plate.isPressed) {
        renderer.drawRect(px + 4, py + 4, 8, 8, '#FFF08A');
      }
    }

    // 2. Render Crates
    for (const crate of this.crates) {
      const cx = Math.floor(crate.x - cameraX);
      const cy = Math.floor(crate.y - cameraY);

      // Wooden Crate body
      renderer.drawRect(cx, cy, TILE_SIZE, TILE_SIZE, '#8D5B28');
      renderer.drawRect(cx, cy, TILE_SIZE, TILE_SIZE, '#5C3814', false);

      // Wooden planks & diagonal cross bracing
      renderer.drawRect(cx + 2, cy + 2, 12, 12, '#A66D33');
      renderer.drawRect(cx + 4, cy + 4, 8, 8, '#704218');
      renderer.drawRect(cx + 6, cy + 6, 4, 4, '#8D5B28');
    }
  }
}

/**
 * Rouxls Kaard Spoof Puzzle Preset
 * Features a single crate placed 1 tile away from the plate, accompanied by
 * iconic bombastic dialogue from the Great Duke of Puzzles himself.
 */
export class RouxlsKaardPuzzle extends BoxPushPuzzle {
  constructor(audio?: PuzzleOptions['audio']) {
    super({
      id: 'rouxls_kaard_puzzle',
      crates: [{ id: 'rouxls_crate', gridX: 5, gridY: 5 }],
      plates: [{ id: 'rouxls_plate', gridX: 6, gridY: 5 }],
      audio,
    });
  }

  public getDialogue(): string[] {
    return [
      'HA HA HA! BEHOLD, WORMS!',
      'THOU SHALT NEVER PASS MINE ULTIMATE PUZZLE!',
      'TRY AS THOU MIGHTST, THY TINY BRAINS SHALT SURELY FAIL!',
    ];
  }

  public getSolveDialogue(): string[] {
    return [
      'GOD',
      'DAMMIT',
      'THOU COMPLETEST MINE PUZZLE SO EASILY?!',
      'WORMS! THOU ART MERE CHANCE-LUCKY WORMS!',
    ];
  }
}

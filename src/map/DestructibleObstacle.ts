/**
 * Mantle Chapter 1 - Destructible Obstacles
 * Represents sword-cuttable trees, boulders, and wooden gates in the Dark World.
 */

import { TILE_SIZE } from '../core/Constants';
import { Renderer } from '../core/Renderer';

export type ObstacleType = 'TREE' | 'BOULDER' | 'WOOD_GATE';

export interface ObstacleOptions {
  id: string;
  gridX: number;
  gridY: number;
  type: ObstacleType;
  requiredLv?: number;
  requiredSword?: boolean;
  hp?: number;
  maxHp?: number;
}

export interface HitResult {
  destroyed: boolean;
  damageDealt: number;
  reason?: string;
}

export class DestructibleObstacle {
  public readonly id: string;
  public readonly gridX: number;
  public readonly gridY: number;
  public readonly type: ObstacleType;
  public readonly requiredLv: number;
  public readonly requiredSword: boolean;
  public readonly maxHp: number;

  public hp: number;
  public isDestroyed: boolean = false;

  constructor(options: ObstacleOptions) {
    this.id = options.id;
    this.gridX = options.gridX;
    this.gridY = options.gridY;
    this.type = options.type;

    // Default configuration based on obstacle type
    const defaults = this.getDefaultsForType(options.type);
    this.requiredLv = options.requiredLv ?? defaults.requiredLv;
    this.requiredSword = options.requiredSword ?? defaults.requiredSword;
    this.maxHp = options.maxHp ?? options.hp ?? defaults.hp;
    this.hp = options.hp ?? this.maxHp;
  }

  private getDefaultsForType(type: ObstacleType): { requiredLv: number; requiredSword: boolean; hp: number } {
    switch (type) {
      case 'TREE':
        return { requiredLv: 2, requiredSword: true, hp: 1 };
      case 'BOULDER':
        return { requiredLv: 3, requiredSword: true, hp: 2 };
      case 'WOOD_GATE':
        return { requiredLv: 1, requiredSword: true, hp: 1 };
    }
  }

  /**
   * Checks whether the obstacle is currently solid for movement collision.
   */
  public isSolid(): boolean {
    return !this.isDestroyed;
  }

  /**
   * Checks if an intact obstacle occupies the specified grid coordinate.
   */
  public occupies(gridX: number, gridY: number): boolean {
    if (this.isDestroyed) return false;
    return this.gridX === gridX && this.gridY === gridY;
  }

  /**
   * Checks if an intact obstacle occupies the given pixel coordinates.
   */
  public occupiesPixel(pixelX: number, pixelY: number): boolean {
    if (this.isDestroyed) return false;
    const minX = this.gridX * TILE_SIZE;
    const maxX = minX + TILE_SIZE;
    const minY = this.gridY * TILE_SIZE;
    const maxY = minY + TILE_SIZE;
    return pixelX >= minX && pixelX < maxX && pixelY >= minY && pixelY < maxY;
  }

  /**
   * Checks if the player meets all requirements to cut or destroy this obstacle.
   */
  public canDestroy(playerLv: number, hasSword: boolean): boolean {
    if (this.isDestroyed) return false;
    if (this.requiredSword && !hasSword) return false;
    if (playerLv < this.requiredLv) return false;
    return true;
  }

  /**
   * Attempts to hit and damage the obstacle.
   */
  public hit(damage: number, playerLv: number, hasSword: boolean): HitResult {
    if (this.isDestroyed) {
      return { destroyed: true, damageDealt: 0, reason: 'Already destroyed' };
    }

    if (this.requiredSword && !hasSword) {
      return { destroyed: false, damageDealt: 0, reason: 'Requires sword' };
    }

    if (playerLv < this.requiredLv) {
      return { destroyed: false, damageDealt: 0, reason: `Requires LV ${this.requiredLv}` };
    }

    const dealt = Math.min(this.hp, Math.max(1, damage));
    this.hp -= dealt;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDestroyed = true;
    }

    return {
      destroyed: this.isDestroyed,
      damageDealt: dealt,
    };
  }

  /**
   * Directly destroys the obstacle (e.g. triggered by cutscenes or puzzle solutions).
   */
  public destroy(): void {
    this.hp = 0;
    this.isDestroyed = true;
  }

  /**
   * Renders the obstacle (intact or destroyed remains).
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const s = TILE_SIZE;
    const drawX = this.gridX * s - cameraX;
    const drawY = this.gridY * s - cameraY;

    if (this.isDestroyed) {
      this.renderDestroyed(renderer, drawX, drawY);
    } else {
      this.renderIntact(renderer, drawX, drawY);
    }
  }

  private renderIntact(renderer: Renderer, x: number, y: number): void {
    switch (this.type) {
      case 'TREE':
        // Scarlet Forest Red/Crimson Tree
        // Trunk
        renderer.drawRect(x + 6, y + 8, 4, 8, '#3A1E14');
        renderer.drawRect(x + 7, y + 8, 2, 8, '#5C2F20');
        // Foliage canopy
        renderer.drawRect(x + 2, y + 2, 12, 8, '#990022');
        renderer.drawRect(x + 4, y, 8, 3, '#B81434');
        renderer.drawRect(x + 5, y + 3, 6, 4, '#D92348');
        break;

      case 'BOULDER':
        // Heavy dark stone
        renderer.drawRect(x + 2, y + 2, 12, 12, '#3E3E48');
        renderer.drawRect(x + 3, y + 1, 10, 14, '#4B4B57');
        // Highlights & cracks
        renderer.drawRect(x + 4, y + 3, 5, 2, '#6D6D7F');
        renderer.drawRect(x + 5, y + 8, 2, 4, '#24242A');
        renderer.drawRect(x + 7, y + 10, 4, 2, '#24242A');
        break;

      case 'WOOD_GATE':
        // Wooden Barricade / Palisade
        renderer.drawRect(x + 1, y + 1, 14, 14, '#5C381E');
        // Planks
        renderer.drawRect(x + 2, y + 2, 3, 12, '#7A4A28');
        renderer.drawRect(x + 6, y + 2, 4, 12, '#8A542E');
        renderer.drawRect(x + 11, y + 2, 3, 12, '#7A4A28');
        // Cross brace & metal bands
        renderer.drawRect(x + 1, y + 4, 14, 2, '#382010');
        renderer.drawRect(x + 1, y + 10, 14, 2, '#382010');
        renderer.drawRect(x + 3, y + 4, 2, 2, '#8E8E93');
        renderer.drawRect(x + 11, y + 4, 2, 2, '#8E8E93');
        break;
    }
  }

  private renderDestroyed(renderer: Renderer, x: number, y: number): void {
    switch (this.type) {
      case 'TREE':
        // Cut stump
        renderer.drawRect(x + 5, y + 10, 6, 6, '#3A1E14');
        renderer.drawRect(x + 6, y + 10, 4, 2, '#7A4A28');
        renderer.drawRect(x + 7, y + 11, 2, 1, '#966038');
        // Wood shavings / fallen leaves
        renderer.drawRect(x + 2, y + 14, 2, 1, '#D92348');
        renderer.drawRect(x + 12, y + 13, 2, 1, '#D92348');
        break;

      case 'BOULDER':
        // Smashed gravel / rubble
        renderer.drawRect(x + 3, y + 11, 4, 3, '#3E3E48');
        renderer.drawRect(x + 9, y + 12, 3, 3, '#4B4B57');
        renderer.drawRect(x + 6, y + 13, 3, 2, '#24242A');
        break;

      case 'WOOD_GATE':
        // Broken planks / splintered wood on floor
        renderer.drawRect(x + 2, y + 12, 5, 2, '#5C381E');
        renderer.drawRect(x + 9, y + 13, 5, 2, '#7A4A28');
        renderer.drawRect(x + 7, y + 14, 2, 1, '#8E8E93');
        break;
    }
  }
}

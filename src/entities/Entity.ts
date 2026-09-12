/**
 * Mantle Chapter 1 - Entity Base Class
 * Fundamental base class for dynamic game entities (Player, Followers, NPCs, Enemies).
 */

import { Tilemap } from '../map/Tilemap';
import { Renderer } from '../core/Renderer';

export type FacingDirection = 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';

export interface EntityBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EntityOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  vx?: number;
  vy?: number;
  facing?: FacingDirection;
  isSolid?: boolean;
}

export abstract class Entity {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public vx: number;
  public vy: number;
  public facing: FacingDirection;
  public isSolid: boolean;

  constructor(options?: EntityOptions) {
    this.x = options?.x ?? 0;
    this.y = options?.y ?? 0;
    this.width = options?.width ?? 16;
    this.height = options?.height ?? 16;
    this.vx = options?.vx ?? 0;
    this.vy = options?.vy ?? 0;
    this.facing = options?.facing ?? 'DOWN';
    this.isSolid = options?.isSolid ?? true;
  }

  /**
   * Returns current bounding box in pixel coordinates.
   */
  public getBounds(): EntityBounds {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Frame update logic. Subclasses can override for custom collision and state transitions.
   */
  public update(dt: number, _tilemap?: Tilemap): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Renders the entity to the canvas.
   */
  public abstract render(renderer: Renderer, cameraX?: number, cameraY?: number): void;
}

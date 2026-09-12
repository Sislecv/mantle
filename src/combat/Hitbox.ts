/**
 * Mantle Chapter 1 - Combat Hitbox System
 * Represents active attack hitboxes for player sword strikes and enemy attacks.
 */

export type HitboxOwner = 'PLAYER' | 'ENEMY';

export interface HitboxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  damage?: number;
  duration?: number;
  owner?: HitboxOwner;
  knockback?: { x: number; y: number };
}

export class Hitbox {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public damage: number;
  public duration: number;
  public owner: HitboxOwner;
  public knockback: { x: number; y: number };

  constructor(options: HitboxOptions) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.damage = options.damage ?? 1;
    this.duration = options.duration ?? 0.25;
    this.owner = options.owner ?? 'PLAYER';
    this.knockback = options.knockback ? { ...options.knockback } : { x: 0, y: 0 };
  }

  /**
   * Evaluates axis-aligned bounding box (AABB) intersection.
   * Edge-touching borders without volume overlap return false.
   */
  public intersects(bounds: { x: number; y: number; width: number; height: number }): boolean {
    return (
      this.x < bounds.x + bounds.width &&
      this.x + this.width > bounds.x &&
      this.y < bounds.y + bounds.height &&
      this.y + this.height > bounds.y
    );
  }

  /**
   * Advances the hitbox lifespan by dt seconds.
   * Returns true if still active, false if expired.
   */
  public update(dt: number): boolean {
    this.duration -= dt;
    return this.duration > 0;
  }
}

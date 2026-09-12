/**
 * Mantle Chapter 1 - Bullet Entity
 * Manages bullet trajectories, collision detection against the SOUL, and retro rendering.
 */

import { Renderer } from '../core/Renderer';
import { NES_COLORS } from '../core/Constants';
import { Soul } from './Soul';

export type BulletType = 'SPADE' | 'AXE' | 'CROWN_STOMP' | 'DIAMOND';

export interface BulletOptions {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius?: number;
  width?: number;
  height?: number;
  type?: BulletType;
  damage?: number;
  angle?: number;
  angularVelocity?: number;
  spawnDelay?: number;
  lifetime?: number;
  customUpdate?: (bullet: Bullet, dt: number, soul?: Soul) => void;
}

export class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public width: number;
  public height: number;
  public type: BulletType;
  public damage: number;
  public angle: number;
  public angularVelocity: number;
  public spawnDelay: number;
  public lifetime: number;
  public age: number;
  public active: boolean;
  public customUpdate?: (bullet: Bullet, dt: number, soul?: Soul) => void;

  constructor(options: BulletOptions) {
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx ?? 0;
    this.vy = options.vy ?? 0;
    this.radius = options.radius ?? (options.width ? options.width / 2 : 4);
    this.width = options.width ?? this.radius * 2;
    this.height = options.height ?? this.radius * 2;
    this.type = options.type ?? 'SPADE';
    this.damage = options.damage ?? 5;
    this.angle = options.angle ?? 0;
    this.angularVelocity = options.angularVelocity ?? 0;
    this.spawnDelay = options.spawnDelay ?? 0;
    this.lifetime = options.lifetime ?? 0;
    this.age = 0;
    this.active = true;
    this.customUpdate = options.customUpdate;
  }

  public isReady(): boolean {
    return this.active && this.spawnDelay <= 0;
  }

  public update(dt: number, soul?: Soul): void {
    if (!this.active) return;

    if (this.spawnDelay > 0) {
      this.spawnDelay -= dt;
      if (this.spawnDelay > 0) return;
    }

    this.age += dt;

    if (this.customUpdate) {
      this.customUpdate(this, dt, soul);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;

    if (this.lifetime > 0 && this.age >= this.lifetime) {
      this.active = false;
    }
  }

  /**
   * Checks collision with SOUL using circular radius or bounding box overlap.
   */
  public checkCollision(soul: Soul): boolean {
    if (!this.isReady()) return false;

    const soulCenter = soul.getCenter();
    const soulHitboxRadius = (soul.size / 2) * 0.75; // Fair forgiving hitbox

    if (this.radius > 0) {
      const dx = this.x - soulCenter.x;
      const dy = this.y - soulCenter.y;
      const distSq = dx * dx + dy * dy;
      const collisionDist = this.radius + soulHitboxRadius;
      return distSq <= collisionDist * collisionDist;
    }

    // AABB fallback
    const soulBounds = soul.getBounds();
    const bx = this.x - this.width / 2;
    const by = this.y - this.height / 2;

    return (
      bx < soulBounds.x + soulBounds.width &&
      bx + this.width > soulBounds.x &&
      by < soulBounds.y + soulBounds.height &&
      by + this.height > soulBounds.y
    );
  }

  /**
   * Renders the bullet based on its type.
   */
  public render(renderer: Renderer): void {
    if (!this.isReady()) return;

    const ix = Math.floor(this.x);
    const iy = Math.floor(this.y);

    switch (this.type) {
      case 'SPADE': {
        // Crisp 7x7 spade shape
        renderer.drawRect(ix - 1, iy - 3, 3, 2, NES_COLORS.WHITE, true);
        renderer.drawRect(ix - 3, iy - 1, 7, 3, NES_COLORS.WHITE, true);
        renderer.drawRect(ix - 2, iy + 2, 5, 2, NES_COLORS.WHITE, true);
        renderer.drawRect(ix - 1, iy + 4, 3, 1, NES_COLORS.WHITE, true);
        // Center accent
        renderer.drawRect(ix, iy, 1, 2, NES_COLORS.DARK_ACCENT, true);
        break;
      }

      case 'AXE': {
        // Spinning battle axe
        renderer.drawRect(ix - 1, iy - 4, 2, 8, NES_COLORS.GRAY_LIGHT, true);
        renderer.drawRect(ix - 4, iy - 3, 3, 3, NES_COLORS.SUSIE_MAGENTA, true);
        renderer.drawRect(ix + 1, iy - 3, 3, 3, NES_COLORS.SUSIE_MAGENTA, true);
        break;
      }

      case 'CROWN_STOMP': {
        // Heavy royal checker crown stomp
        const w = Math.max(10, Math.floor(this.width));
        const h = Math.max(8, Math.floor(this.height));
        const left = ix - Math.floor(w / 2);
        const top = iy - Math.floor(h / 2);

        renderer.drawRect(left, top, w, h, NES_COLORS.GOLD_ACCENT, true);
        renderer.drawRect(left + 2, top + 2, w - 4, h - 4, NES_COLORS.SOUL_RED, true);
        break;
      }

      case 'DIAMOND': {
        // Crisp diamond
        renderer.drawRect(ix, iy - 3, 1, 7, NES_COLORS.KRIS_CYAN, true);
        renderer.drawRect(ix - 1, iy - 2, 3, 5, NES_COLORS.WHITE, true);
        renderer.drawRect(ix - 2, iy - 1, 5, 3, NES_COLORS.WHITE, true);
        renderer.drawRect(ix - 3, iy, 7, 1, NES_COLORS.KRIS_CYAN, true);
        break;
      }
    }
  }
}

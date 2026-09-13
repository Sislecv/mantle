/**
 * Mantle Chapter 1 - Party Follower Dynamics
 * Implements Susie (HERO_AXE) and Ralsei (HERO_SCARF) follower party mechanics.
 * Features conga line trailing history algorithm, 4-directional rendering, and walk animations.
 */

import { Entity, EntityOptions, FacingDirection } from './Entity';
import { Tilemap } from '../map/Tilemap';
import { Renderer } from '../core/Renderer';
import { NES_COLORS } from '../core/Constants';
import { SpriteLoader } from '../core/SpriteLoader';

export type FollowerName = 'SUSIE' | 'RALSEI';

export interface Breadcrumb {
  x: number;
  y: number;
  facing: FacingDirection;
  isMoving: boolean;
}

export interface FollowerOptions extends EntityOptions {
  name: FollowerName;
  leader?: Entity | null;
  trailDistance?: number;
}

export class Follower extends Entity {
  public readonly name: FollowerName;
  public leader: Entity | null;
  public trailDistance: number;
  public breadcrumbs: Breadcrumb[] = [];
  public isMoving: boolean = false;
  public walkTimer: number = 0;
  public walkFrame: number = 0;

  constructor(options: FollowerOptions) {
    super({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.width ?? 16,
      height: options.height ?? 16,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      facing: options.facing ?? 'DOWN',
      isSolid: options.isSolid ?? false, // Party members do not block player
    });

    this.name = options.name;
    this.leader = options.leader ?? null;
    this.trailDistance = options.trailDistance ?? (this.name === 'SUSIE' ? 16 : 32);

    // Initialize breadcrumbs if leader is already set
    if (this.leader) {
      if (this.x !== this.leader.x || this.y !== this.leader.y) {
        this.breadcrumbs.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          isMoving: false,
        });
      }
      this.breadcrumbs.push({
        x: this.leader.x,
        y: this.leader.y,
        facing: this.leader.facing,
        isMoving: false,
      });
    }
  }

  /**
   * Dynamically attaches or changes the leader entity.
   */
  public setLeader(leader: Entity | null): void {
    this.leader = leader;
    if (leader && this.breadcrumbs.length === 0) {
      if (this.x !== leader.x || this.y !== leader.y) {
        this.breadcrumbs.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          isMoving: false,
        });
      }
      this.breadcrumbs.push({
        x: leader.x,
        y: leader.y,
        facing: leader.facing,
        isMoving: false,
      });
    }
  }

  /**
   * Records a position breadcrumb from the active leader.
   */
  public recordBreadcrumb(leader: Entity): void {
    if (this.breadcrumbs.length === 0) {
      if (this.x !== leader.x || this.y !== leader.y) {
        this.breadcrumbs.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          isMoving: false,
        });
      }
      this.breadcrumbs.push({
        x: leader.x,
        y: leader.y,
        facing: leader.facing,
        isMoving: false,
      });
      return;
    }

    const last = this.breadcrumbs[this.breadcrumbs.length - 1];
    const dist = Math.hypot(leader.x - last.x, leader.y - last.y);

    if (dist > 0.001) {
      this.breadcrumbs.push({
        x: leader.x,
        y: leader.y,
        facing: leader.facing,
        isMoving: true,
      });
    } else if (last.isMoving) {
      // Leader came to a complete stop
      this.breadcrumbs.push({
        x: leader.x,
        y: leader.y,
        facing: leader.facing,
        isMoving: false,
      });
    }

    // Prune excessively old breadcrumbs to prevent unbounded memory growth
    if (this.breadcrumbs.length > 250) {
      let accumulated = 0;
      let pruneIndex = -1;
      for (let i = this.breadcrumbs.length - 1; i > 0; i--) {
        accumulated += Math.hypot(
          this.breadcrumbs[i].x - this.breadcrumbs[i - 1].x,
          this.breadcrumbs[i].y - this.breadcrumbs[i - 1].y
        );
        if (accumulated > this.trailDistance + 64) {
          pruneIndex = i - 1;
          break;
        }
      }
      if (pruneIndex > 0) {
        this.breadcrumbs.splice(0, pruneIndex);
      }
    }
  }

  /**
   * Primary frame update routine. Follows leader's path trail smoothly in a conga line.
   */
  public override update(dt: number, _tilemap?: Tilemap, leader?: Entity): void {
    const activeLeader = leader ?? this.leader;
    if (leader && leader !== this.leader) {
      this.leader = leader;
    }

    if (!activeLeader) {
      this.isMoving = false;
      this.walkTimer = 0;
      this.walkFrame = 0;
      return;
    }

    // Record breadcrumbs from current leader state
    this.recordBreadcrumb(activeLeader);

    if (this.breadcrumbs.length === 0) {
      return;
    }

    // Walk backwards from latest breadcrumb along the path by trailDistance
    let remaining = this.trailDistance;
    let targetX = this.breadcrumbs[0].x;
    let targetY = this.breadcrumbs[0].y;
    let targetFacing = this.breadcrumbs[0].facing;

    for (let i = this.breadcrumbs.length - 1; i > 0; i--) {
      const curr = this.breadcrumbs[i];
      const prev = this.breadcrumbs[i - 1];
      const segDist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

      if (segDist === 0) continue;

      if (remaining <= segDist) {
        const t = remaining / segDist;
        targetX = curr.x + (prev.x - curr.x) * t;
        targetY = curr.y + (prev.y - curr.y) * t;
        targetFacing = curr.facing;
        break;
      }

      remaining -= segDist;
      targetX = prev.x;
      targetY = prev.y;
      targetFacing = prev.facing;
    }

    // Move smoothly to target position
    const moveDist = Math.hypot(targetX - this.x, targetY - this.y);

    if (moveDist > 0.05) {
      this.vx = dt > 0 ? (targetX - this.x) / dt : 0;
      this.vy = dt > 0 ? (targetY - this.y) / dt : 0;
      this.x = targetX;
      this.y = targetY;
      this.facing = targetFacing;
      this.isMoving = true;

      this.walkTimer += dt;
      this.walkFrame = Math.floor(this.walkTimer * 6) % 4;
    } else {
      this.x = targetX;
      this.y = targetY;
      this.vx = 0;
      this.vy = 0;
      this.facing = targetFacing;
      this.isMoving = false;

      this.walkTimer = 0;
      this.walkFrame = 0;
    }
  }

  /**
   * Renders the party follower to the canvas.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    if (this.name === 'SUSIE') {
      this.renderSusie(renderer, drawX, drawY);
    } else {
      this.renderRalsei(renderer, drawX, drawY);
    }
  }

  /**
   * Susie (HERO_AXE): Dark violet armor, magenta skin, golden axe.
   */
  private renderSusie(renderer: Renderer, x: number, y: number): void {
    const frame = this.isMoving ? (this.walkFrame % 2) : 0;
    let spriteKey = `ch3_susie_down_${frame}`;
    let flipX = false;

    switch (this.facing) {
      case 'UP':
        spriteKey = `ch3_susie_up_${frame}`;
        break;
      case 'LEFT':
        spriteKey = `ch3_susie_left_${frame}`;
        break;
      case 'RIGHT':
        spriteKey = `ch3_susie_right_${frame}`;
        break;
      case 'DOWN':
      default:
        spriteKey = `ch3_susie_down_${frame}`;
        break;
    }

    // 1. Prioritize Chapter 3 official 8-bit directional frame
    if (SpriteLoader.has(spriteKey) && SpriteLoader.getSpriteInfo(spriteKey)?.loaded) {
      SpriteLoader.draw(renderer.ctx, spriteKey, x, y, 16, 16, { flipX });
      return;
    }

    // 2. Fallback to loaded Susie sprite
    if (SpriteLoader.has('susie') && SpriteLoader.getSpriteInfo('susie')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'susie', x, y, 16, 16, {
        flipX: this.facing === 'LEFT',
      });
      return;
    }

    const darkArmor = NES_COLORS.SUSIE_PURPLE;
    const skin = NES_COLORS.SUSIE_MAGENTA;
    const goldAxe = NES_COLORS.GOLD_ACCENT;
    const hair = '#200C2A';
    const darkPants = '#140D1C';
    const bladeColor = '#E6E6E6';
    const bob = this.isMoving && (this.walkFrame === 1 || this.walkFrame === 3) ? 1 : 0;

    switch (this.facing) {
      case 'UP':
        renderer.drawRect(x + 3, y + bob, 10, 7, hair);
        renderer.drawRect(x + 2, y + 2 + bob, 12, 5, hair);
        renderer.drawRect(x + 4, y + 7 + bob, 8, 5, darkArmor);
        renderer.drawRect(x + 4, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 9, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 7, y - 2 + bob, 2, 10, goldAxe);
        renderer.drawRect(x + 9, y - 2 + bob, 4, 3, bladeColor);
        break;
      case 'LEFT':
        renderer.drawRect(x + 1, y + 4 + bob, 5, 3, skin);
        renderer.drawRect(x + 4, y + 1 + bob, 9, 6, hair);
        renderer.drawRect(x + 9, y + 3 + bob, 4, 5, hair);
        renderer.drawRect(x + 4, y + 7 + bob, 8, 5, darkArmor);
        renderer.drawRect(x + 5, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 8, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 1, y + 6 + bob, 2, 8, goldAxe);
        renderer.drawRect(x - 1, y + 5 + bob, 3, 3, bladeColor);
        break;
      case 'RIGHT':
        renderer.drawRect(x + 10, y + 4 + bob, 5, 3, skin);
        renderer.drawRect(x + 3, y + 1 + bob, 9, 6, hair);
        renderer.drawRect(x + 3, y + 3 + bob, 4, 5, hair);
        renderer.drawRect(x + 4, y + 7 + bob, 8, 5, darkArmor);
        renderer.drawRect(x + 5, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 8, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 13, y + 6 + bob, 2, 8, goldAxe);
        renderer.drawRect(x + 14, y + 5 + bob, 3, 3, bladeColor);
        break;
      case 'DOWN':
      default:
        renderer.drawRect(x + 3, y + 1 + bob, 10, 6, hair);
        renderer.drawRect(x + 2, y + 3 + bob, 12, 4, hair);
        renderer.drawRect(x + 5, y + 5 + bob, 6, 2, skin);
        renderer.drawRect(x + 4, y + 7 + bob, 8, 5, darkArmor);
        renderer.drawRect(x + 6, y + 8 + bob, 4, 1, '#4A1C5A');
        renderer.drawRect(x + 4, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 9, y + 12 + bob, 3, 4, darkPants);
        renderer.drawRect(x + 12, y + 5 + bob, 2, 8, goldAxe);
        renderer.drawRect(x + 13, y + 4 + bob, 3, 3, bladeColor);
        break;
    }
  }

  /**
   * Ralsei (HERO_SCARF): Forest green robe, long pink scarf trailing.
   */
  private renderRalsei(renderer: Renderer, x: number, y: number): void {
    const frame = this.isMoving ? (this.walkFrame % 2) : 0;
    let spriteKey = `ch3_ralsei_down_${frame}`;
    let flipX = false;

    switch (this.facing) {
      case 'UP':
        spriteKey = `ch3_ralsei_up_${frame}`;
        break;
      case 'LEFT':
        spriteKey = `ch3_ralsei_right_${frame}`;
        flipX = true;
        break;
      case 'RIGHT':
        spriteKey = `ch3_ralsei_right_${frame}`;
        break;
      case 'DOWN':
      default:
        spriteKey = `ch3_ralsei_down_${frame}`;
        break;
    }

    if (SpriteLoader.has(spriteKey) && SpriteLoader.getSpriteInfo(spriteKey)?.loaded) {
      SpriteLoader.draw(renderer.ctx, spriteKey, x, y, 16, 16, { flipX });
      return;
    }

    const robe = NES_COLORS.RALSEI_GREEN;
    const scarf = NES_COLORS.RALSEI_PINK;
    const hat = '#14291D';
    const shadowFace = '#1A1822';
    const glasses = '#82E0AA';
    const pinkHorns = '#FF8DA1';
    const bob = this.isMoving && (this.walkFrame === 1 || this.walkFrame === 3) ? 1 : 0;

    switch (this.facing) {
      case 'UP':
        // Pointed wizard hat
        renderer.drawRect(x + 7, y - 2 + bob, 2, 3, hat);
        renderer.drawRect(x + 5, y + 1 + bob, 6, 3, hat);
        renderer.drawRect(x + 2, y + 4 + bob, 12, 2, hat);
        // Pink Horns
        renderer.drawRect(x + 3, y + 1 + bob, 2, 2, pinkHorns);
        renderer.drawRect(x + 11, y + 1 + bob, 2, 2, pinkHorns);
        // Green robe back
        renderer.drawRect(x + 4, y + 7 + bob, 8, 8, robe);
        // Trailing pink scarf ends
        renderer.drawRect(x + 6, y + 7 + bob, 4, 2, scarf);
        renderer.drawRect(x + 3, y + 9 + bob, 2, 5, scarf);
        break;

      case 'LEFT':
        // Hat angled
        renderer.drawRect(x + 5, y - 1 + bob, 3, 3, hat);
        renderer.drawRect(x + 2, y + 2 + bob, 11, 3, hat);
        // Horn
        renderer.drawRect(x + 3, y + bob, 2, 2, pinkHorns);
        // Face / Glasses
        renderer.drawRect(x + 3, y + 5 + bob, 4, 3, shadowFace);
        renderer.drawRect(x + 2, y + 5 + bob, 2, 2, glasses);
        // Scarf tied in front
        renderer.drawRect(x + 3, y + 7 + bob, 5, 2, scarf);
        // Trailing scarf behind to right
        renderer.drawRect(x + 8, y + 8 + bob, 5, 2, scarf);
        renderer.drawRect(x + 12, y + 9 + bob, 3, 2, scarf);
        // Green robe
        renderer.drawRect(x + 4, y + 9 + bob, 8, 6, robe);
        break;

      case 'RIGHT':
        // Hat angled
        renderer.drawRect(x + 8, y - 1 + bob, 3, 3, hat);
        renderer.drawRect(x + 3, y + 2 + bob, 11, 3, hat);
        // Horn
        renderer.drawRect(x + 11, y + bob, 2, 2, pinkHorns);
        // Face / Glasses
        renderer.drawRect(x + 9, y + 5 + bob, 4, 3, shadowFace);
        renderer.drawRect(x + 12, y + 5 + bob, 2, 2, glasses);
        // Scarf tied in front
        renderer.drawRect(x + 8, y + 7 + bob, 5, 2, scarf);
        // Trailing scarf behind to left
        renderer.drawRect(x + 3, y + 8 + bob, 5, 2, scarf);
        renderer.drawRect(x + 1, y + 9 + bob, 3, 2, scarf);
        // Green robe
        renderer.drawRect(x + 4, y + 9 + bob, 8, 6, robe);
        break;

      case 'DOWN':
      default:
        // Pointed wizard hat
        renderer.drawRect(x + 7, y - 2 + bob, 2, 3, hat);
        renderer.drawRect(x + 5, y + 1 + bob, 6, 3, hat);
        renderer.drawRect(x + 2, y + 4 + bob, 12, 2, hat);
        // Pink Horns
        renderer.drawRect(x + 3, y + 1 + bob, 2, 2, pinkHorns);
        renderer.drawRect(x + 11, y + 1 + bob, 2, 2, pinkHorns);
        // Fluffy shadow face with green glasses
        renderer.drawRect(x + 4, y + 5 + bob, 8, 3, shadowFace);
        renderer.drawRect(x + 5, y + 5 + bob, 2, 2, glasses);
        renderer.drawRect(x + 9, y + 5 + bob, 2, 2, glasses);
        // Long pink scarf wrapped around neck
        renderer.drawRect(x + 3, y + 7 + bob, 10, 3, scarf);
        renderer.drawRect(x + 9, y + 10 + bob, 3, 5, scarf);
        // Forest green robe
        renderer.drawRect(x + 4, y + 10 + bob, 8, 5, robe);
        renderer.drawRect(x + 7, y + 11 + bob, 2, 2, '#000000'); // black heart on chest
        break;
    }
  }
}

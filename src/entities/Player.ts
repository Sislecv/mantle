/**
 * Mantle Chapter 1 - Player HERO_SWORD Entity
 * Manages Kris's state machine, overworld movement, sword pull sequence,
 * 5-frame attack animations, hitbox generation, and obstacle interaction.
 */

import { Entity, EntityOptions } from './Entity';
import { Hitbox } from '../combat/Hitbox';
import { Tilemap } from '../map/Tilemap';
import { DestructibleObstacle, HitResult } from '../map/DestructibleObstacle';
import { InputManager } from '../core/InputManager';
import { Renderer } from '../core/Renderer';
import { NES_COLORS, TILE_SIZE } from '../core/Constants';
import { SpriteLoader } from '../core/SpriteLoader';

export type PlayerState = 'UNARMED' | 'SWORD_PULL' | 'ARMED' | 'ATTACKING' | 'HURT' | 'DEFEAT';

export interface PlayerOptions extends EntityOptions {
  state?: PlayerState;
  hasSword?: boolean;
  lv?: number;
  hp?: number;
  maxHp?: number;
  exp?: number;
  speed?: number;
  attackDamage?: number;
}

export class Player extends Entity {
  public state: PlayerState;
  public hasSword: boolean;
  public lv: number;
  public hp: number;
  public maxHp: number;
  public exp: number;
  public attackDamage: number;
  public attackFrame: number = 0;
  public attackHitbox: Hitbox | null = null;
  public invulnerableTime: number = 0;
  public pullTimer: number = 0;

  // Track obstacles hit during current attack swing to prevent multi-hit bug
  private hitObstacleIds: Set<string> = new Set();

  // Speed configuration (85 px/s when UNARMED, 70 px/s when ARMED)
  private _baseSpeed: number = 70;
  private customSpeed?: number;

  public get speed(): number {
    if (this.customSpeed !== undefined) {
      return this.customSpeed;
    }
    return this.state === 'UNARMED' ? 85 : this._baseSpeed;
  }

  public set speed(val: number) {
    this._baseSpeed = val;
    this.customSpeed = val;
  }

  // Internal timers & configurations
  private attackTimer: number = 0;
  private attackDuration: number = 0.25;
  private hurtTimer: number = 0;
  private readonly hurtDuration: number = 0.3;

  // Optional attached input
  public input: InputManager | null = null;

  constructor(options?: PlayerOptions) {
    super({
      x: options?.x ?? 0,
      y: options?.y ?? 0,
      width: options?.width ?? 16,
      height: options?.height ?? 16,
      vx: options?.vx ?? 0,
      vy: options?.vy ?? 0,
      facing: options?.facing ?? 'DOWN',
      isSolid: options?.isSolid ?? true,
    });

    this.state = options?.state ?? 'UNARMED';
    this.hasSword = options?.hasSword ?? false;
    this.lv = options?.lv ?? 1;
    this.hp = options?.hp ?? 20;
    this.maxHp = options?.maxHp ?? 20;
    this.exp = options?.exp ?? 0;
    if (options?.speed !== undefined) {
      this.customSpeed = options.speed;
      this._baseSpeed = options.speed;
    }
    this.attackDamage = options?.attackDamage ?? 1;

    if (this.hasSword && this.state === 'UNARMED') {
      this.state = 'ARMED';
    }
  }

  /**
   * Initiates the sword pull interaction sequence from a pedestal.
   */
  public pullSword(duration = 1.0): void {
    if (this.hasSword || this.state === 'DEFEAT' || this.state === 'SWORD_PULL') {
      return;
    }

    this.state = 'SWORD_PULL';
    this.pullTimer = duration;
    this.vx = 0;
    this.vy = 0;
    this.attackHitbox = null;
  }

  /**
   * Triggers a 5-frame sword attack swing and directional hitbox.
   * Only accessible when in ARMED state.
   */
  public attack(duration = 0.25): boolean {
    if (this.state !== 'ARMED') {
      return false;
    }

    this.state = 'ATTACKING';
    this.attackTimer = duration;
    this.attackDuration = duration;
    this.attackFrame = 0;
    this.vx = 0;
    this.vy = 0;
    this.hitObstacleIds.clear();

    // Generate directional attack hitbox in front of player
    this.attackHitbox = this.createAttackHitbox(duration);
    return true;
  }

  /**
   * Calculates directional attack hitbox based on player facing.
   */
  private createAttackHitbox(duration: number): Hitbox {
    let hx = this.x;
    let hy = this.y;
    let knockback = { x: 0, y: 0 };

    switch (this.facing) {
      case 'DOWN':
        hy = this.y + this.height;
        knockback = { x: 0, y: 1 };
        break;
      case 'UP':
        hy = this.y - 16;
        knockback = { x: 0, y: -1 };
        break;
      case 'LEFT':
        hx = this.x - 16;
        knockback = { x: -1, y: 0 };
        break;
      case 'RIGHT':
        hx = this.x + this.width;
        knockback = { x: 1, y: 0 };
        break;
    }

    return new Hitbox({
      x: hx,
      y: hy,
      width: 16,
      height: 16,
      damage: this.attackDamage,
      duration,
      owner: 'PLAYER',
      knockback,
    });
  }

  /**
   * Applies damage to player, triggering knockback and invulnerability frames.
   */
  public takeDamage(amount: number, fromX?: number, fromY?: number): void {
    if (this.invulnerableTime > 0 || this.state === 'DEFEAT') {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);

    // Apply knockback impulse away from damage origin
    if (fromX !== undefined && fromY !== undefined) {
      const dx = this.x - fromX;
      const dy = this.y - fromY;
      const dist = Math.hypot(dx, dy) || 1;
      this.vx = (dx / dist) * 120;
      this.vy = (dy / dist) * 120;
    }

    if (this.hp <= 0) {
      this.state = 'DEFEAT';
      this.vx = 0;
      this.vy = 0;
      this.attackHitbox = null;
      this.hitObstacleIds.clear();
    } else {
      this.state = 'HURT';
      this.hurtTimer = this.hurtDuration;
      this.invulnerableTime = 1.0;
      this.attackHitbox = null;
      this.hitObstacleIds.clear();
    }
  }

  /**
   * Awards EXP and processes level progression.
   */
  public gainExp(amount: number): { leveledUp: boolean; newLv: number } {
    this.exp += amount;
    let leveledUp = false;

    while (this.exp >= this.lv * 100) {
      this.lv += 1;
      this.maxHp += 4;
      this.hp = this.maxHp;
      leveledUp = true;
    }

    return {
      leveledUp,
      newLv: this.lv,
    };
  }

  /**
   * Attempts to strike a single destructible obstacle with the active sword hitbox.
   */
  public hitObstacle(obstacle: DestructibleObstacle): HitResult | null {
    if (!this.attackHitbox) {
      return null;
    }

    if (this.hitObstacleIds.has(obstacle.id)) {
      return null;
    }

    const obstacleBounds = {
      x: obstacle.gridX * TILE_SIZE,
      y: obstacle.gridY * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    };

    if (this.attackHitbox.intersects(obstacleBounds)) {
      this.hitObstacleIds.add(obstacle.id);
      return obstacle.hit(this.attackHitbox.damage, this.lv, this.hasSword);
    }

    return null;
  }

  /**
   * Attempts to strike multiple obstacles in the room with the active sword hitbox.
   */
  public hitObstacles(obstacles: DestructibleObstacle[]): HitResult[] {
    const results: HitResult[] = [];
    if (!this.attackHitbox) {
      return results;
    }

    for (const obs of obstacles) {
      const result = this.hitObstacle(obs);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * Primary frame update routine.
   */
  public override update(
    dt: number,
    tilemap?: Tilemap,
    input?: InputManager,
    obstacles?: DestructibleObstacle[]
  ): void {
    // 1. Invulnerability countdown
    if (this.invulnerableTime > 0) {
      this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
    }

    // 2. State: DEFEAT
    if (this.state === 'DEFEAT') {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // 3. State: SWORD_PULL
    if (this.state === 'SWORD_PULL') {
      this.vx = 0;
      this.vy = 0;
      this.pullTimer -= dt;
      if (this.pullTimer <= 0) {
        this.pullTimer = 0;
        this.hasSword = true;
        this.state = 'ARMED';
      }
      return;
    }

    // 4. State: HURT
    if (this.state === 'HURT') {
      this.moveWithCollision(dt, tilemap, obstacles);
      // Decelerate knockback
      const decay = Math.max(0, 1 - dt * 6);
      this.vx *= decay;
      this.vy *= decay;

      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.state = this.hasSword ? 'ARMED' : 'UNARMED';
      }
      return;
    }

    // 5. State: ATTACKING
    if (this.state === 'ATTACKING') {
      this.vx = 0;
      this.vy = 0;
      this.attackTimer -= dt;

      if (this.attackTimer <= 0) {
        this.attackTimer = 0;
        this.attackFrame = 0;
        this.attackHitbox = null;
        this.hitObstacleIds.clear();
        this.state = 'ARMED';
      } else {
        const elapsed = this.attackDuration - this.attackTimer;
        this.attackFrame = Math.min(4, Math.floor((elapsed / this.attackDuration) * 5 + 1e-5));

        if (this.attackHitbox) {
          const stillActive = this.attackHitbox.update(dt);
          if (!stillActive) {
            this.attackHitbox = null;
          }
        }

        if (obstacles && this.attackHitbox) {
          this.hitObstacles(obstacles);
        }
      }
      return;
    }

    // 6. States: UNARMED / ARMED
    const activeInput = input ?? this.input;
    if (activeInput) {
      if (this.state === 'ARMED' && activeInput.isJustPressed('action')) {
        this.attack();
        if (obstacles && this.attackHitbox) {
          this.hitObstacles(obstacles);
        }
        return;
      }

      let dx = 0;
      let dy = 0;

      if (activeInput.isDown('left')) dx -= 1;
      if (activeInput.isDown('right')) dx += 1;
      if (activeInput.isDown('up')) dy -= 1;
      if (activeInput.isDown('down')) dy += 1;

      // Update facing orientation
      if (dx < 0) this.facing = 'LEFT';
      else if (dx > 0) this.facing = 'RIGHT';
      else if (dy < 0) this.facing = 'UP';
      else if (dy > 0) this.facing = 'DOWN';

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.SQRT2;
        dx *= inv;
        dy *= inv;
      }

      const isSprinting = activeInput.isDown('cancel');
      const moveSpeed = isSprinting ? this.speed * 1.5 : this.speed;

      this.vx = dx * moveSpeed;
      this.vy = dy * moveSpeed;
    }

    this.moveWithCollision(dt, tilemap, obstacles);
  }

  /**
   * Sub-pixel axis-separated collision resolution.
   */
  private moveWithCollision(
    dt: number,
    tilemap?: Tilemap,
    obstacles?: DestructibleObstacle[]
  ): void {
    // 1. Move X axis
    const moveX = this.vx * dt;
    if (moveX !== 0) {
      const step = Math.sign(moveX);
      const total = Math.abs(moveX);
      let moved = 0;
      while (moved < total) {
        const delta = Math.min(1, total - moved);
        const nextX = this.x + step * delta;
        if (this.checkCollision(nextX, this.y, tilemap, obstacles)) {
          this.vx = 0;
          break;
        }
        this.x = nextX;
        moved += delta;
      }
    }

    // 2. Move Y axis
    const moveY = this.vy * dt;
    if (moveY !== 0) {
      const step = Math.sign(moveY);
      const total = Math.abs(moveY);
      let moved = 0;
      while (moved < total) {
        const delta = Math.min(1, total - moved);
        const nextY = this.y + step * delta;
        if (this.checkCollision(this.x, nextY, tilemap, obstacles)) {
          this.vy = 0;
          break;
        }
        this.y = nextY;
        moved += delta;
      }
    }
  }

  /**
   * Checks if an AABB at (x, y, width, height) collides with solid tiles or obstacles.
   */
  private checkCollision(
    x: number,
    y: number,
    tilemap?: Tilemap,
    obstacles?: DestructibleObstacle[]
  ): boolean {
    const w = this.width;
    const h = this.height;

    // Check Tilemap solid cells
    if (tilemap) {
      const corners = [
        { px: x, py: y },
        { px: x + w - 1, py: y },
        { px: x, py: y + h - 1 },
        { px: x + w - 1, py: y + h - 1 },
      ];
      for (const pt of corners) {
        if (tilemap.isSolidAtPixel(pt.px, pt.py)) {
          return true;
        }
      }
    }

    // Check Destructible Obstacles
    if (obstacles) {
      const pBox = { x, y, width: w, height: h };
      for (const obstacle of obstacles) {
        if (obstacle.isSolid()) {
          const oBox = {
            x: obstacle.gridX * TILE_SIZE,
            y: obstacle.gridY * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
          };
          if (
            pBox.x < oBox.x + oBox.width &&
            pBox.x + pBox.width > oBox.x &&
            pBox.y < oBox.y + oBox.height &&
            pBox.y + pBox.height > oBox.y
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Renders Kris to the canvas using authentic 8-bit NES aesthetics.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const drawX = Math.floor(this.x - cameraX);
    const drawY = Math.floor(this.y - cameraY);

    // Flicker rendering during invulnerability frames
    if (this.invulnerableTime > 0) {
      const isVisible = Math.floor(this.invulnerableTime * 20) % 2 === 0;
      if (!isVisible) return;
    }

    switch (this.state) {
      case 'DEFEAT':
        this.renderDefeat(renderer, drawX, drawY);
        break;
      case 'HURT':
        this.renderHurt(renderer, drawX, drawY);
        break;
      case 'SWORD_PULL':
        this.renderSwordPull(renderer, drawX, drawY);
        break;
      case 'ATTACKING':
        this.renderAttack(renderer, drawX, drawY);
        break;
      case 'ARMED':
      case 'UNARMED':
      default:
        this.renderDefault(renderer, drawX, drawY);
        break;
    }
  }

  /**
  * Default Kris standing / walking pose using authentic 8-bit sprite.
  */
  private renderDefault(renderer: Renderer, x: number, y: number): void {
    const isMoving = this.vx !== 0 || this.vy !== 0;
    const isLeft = this.facing === 'LEFT';
    const isRight = this.facing === 'RIGHT';
    const isUp = this.facing === 'UP';
    const frame = isMoving ? (Math.floor(Date.now() / 150) % 2) : 0;

    let spriteKey = 'ch3_kris_down_0';
    let flipX = false;

    if (isUp) {
      spriteKey = `ch3_kris_up_${frame}`;
    } else if (isLeft) {
      spriteKey = `ch3_kris_left_${frame}`;
    } else if (isRight) {
      spriteKey = `ch3_kris_left_${frame}`;
      flipX = true;
    } else {
      spriteKey = 'ch3_kris_down_0';
    }

    if (SpriteLoader.has(spriteKey) && SpriteLoader.getSpriteInfo(spriteKey)?.loaded) {
      SpriteLoader.draw(renderer.ctx, spriteKey, x, y, this.width, this.height, {
        flipX,
      });
      return;
    }

    if (SpriteLoader.has('kris_walk') && SpriteLoader.getSpriteInfo('kris_walk')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'kris_walk', x, y, this.width, this.height, {
        flipX: isLeft,
      });
      // Footstep bobbing
      if (isMoving) {
        const step = Math.floor(Date.now() / 150) % 2;
        if (step === 1) {
          renderer.drawRect(x + (isLeft ? 3 : 9), y + 14, 2, 2, '#101828');
        }
      }
      return;
    }

    // Fallback pixel rendering
    renderer.drawRect(x + 4, y, 8, 4, '#241738');
    renderer.drawRect(x + 3, y + 2, 10, 3, '#241738');
    renderer.drawRect(x + 5, y + 4, 6, 3, '#82E0AA');
    renderer.drawRect(x + 4, y + 7, 8, 2, NES_COLORS.KRIS_CAPE);
    renderer.drawRect(x + 4, y + 9, 8, 4, NES_COLORS.KRIS_CYAN);
    renderer.drawRect(x + 4, y + 13, 3, 3, '#192841');
    renderer.drawRect(x + 9, y + 13, 3, 3, '#192841');

    // Sword at hip if ARMED
    if (this.hasSword) {
      if (this.facing === 'LEFT') {
        renderer.drawRect(x + 12, y + 8, 2, 6, '#FFFFFF');
      } else {
        renderer.drawRect(x + 2, y + 8, 2, 6, '#FFFFFF');
      }
    }
  }

  /**
   * 5-Frame sword slash animation with authentic 8-bit sprite.
   */
  private renderAttack(renderer: Renderer, x: number, y: number): void {
    const strikeFrameIndex = Math.min(2, this.attackFrame);
    let strikeKey = '';
    let sx = x;
    let sy = y;
    let sw = this.width;
    let sh = this.height;

    if (this.facing === 'RIGHT') {
      strikeKey = `ch3_kris_strike_right_${strikeFrameIndex}`;
      sw = 32;
    } else if (this.facing === 'LEFT') {
      strikeKey = `ch3_kris_strike_left_${strikeFrameIndex}`;
      sw = 32;
      sx = x - 16;
    } else if (this.facing === 'UP') {
      strikeKey = `ch3_kris_strike_up_0`;
      sh = 32;
      sy = y - 16;
    }

    if (strikeKey && SpriteLoader.has(strikeKey) && SpriteLoader.getSpriteInfo(strikeKey)?.loaded) {
      SpriteLoader.draw(renderer.ctx, strikeKey, sx, sy, sw, sh);
      return;
    }

    const isLeft = this.facing === 'LEFT';
    if (SpriteLoader.has('kris_attack') && SpriteLoader.getSpriteInfo('kris_attack')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'kris_attack', x, y, this.width, this.height, {
        flipX: isLeft,
      });
    } else {
      this.renderDefault(renderer, x, y);
    }

    const f = this.attackFrame;
    const bladeColor = '#FFFFFF';
    const arcColor = NES_COLORS.KRIS_CYAN;

    switch (this.facing) {
      case 'RIGHT':
        if (f === 0) {
          renderer.drawRect(x + 12, y + 2, 3, 3, bladeColor);
        } else if (f === 1) {
          renderer.drawRect(x + 14, y + 4, 6, 3, bladeColor);
        } else if (f === 2) {
          renderer.drawRect(x + 16, y + 2, 14, 12, arcColor, false);
          renderer.drawRect(x + 16, y + 6, 12, 4, bladeColor);
        } else if (f === 3) {
          renderer.drawRect(x + 15, y + 8, 8, 3, bladeColor);
        } else {
          renderer.drawRect(x + 14, y + 10, 4, 2, arcColor);
        }
        break;

      case 'LEFT':
        if (f === 0) {
          renderer.drawRect(x + 1, y + 2, 3, 3, bladeColor);
        } else if (f === 1) {
          renderer.drawRect(x - 4, y + 4, 6, 3, bladeColor);
        } else if (f === 2) {
          renderer.drawRect(x - 14, y + 2, 14, 12, arcColor, false);
          renderer.drawRect(x - 12, y + 6, 12, 4, bladeColor);
        } else if (f === 3) {
          renderer.drawRect(x - 7, y + 8, 8, 3, bladeColor);
        } else {
          renderer.drawRect(x - 2, y + 10, 4, 2, arcColor);
        }
        break;

      case 'UP':
        if (f === 0) {
          renderer.drawRect(x + 12, y + 2, 3, 3, bladeColor);
        } else if (f === 1) {
          renderer.drawRect(x + 6, y - 6, 4, 6, bladeColor);
        } else if (f === 2) {
          renderer.drawRect(x + 2, y - 14, 12, 14, arcColor, false);
          renderer.drawRect(x + 6, y - 12, 4, 12, bladeColor);
        } else if (f === 3) {
          renderer.drawRect(x + 3, y - 7, 10, 4, bladeColor);
        } else {
          renderer.drawRect(x + 4, y - 2, 8, 2, arcColor);
        }
        break;

      case 'DOWN':
        if (f === 0) {
          renderer.drawRect(x + 2, y + 8, 3, 3, bladeColor);
        } else if (f === 1) {
          renderer.drawRect(x + 6, y + 14, 4, 6, bladeColor);
        } else if (f === 2) {
          renderer.drawRect(x + 2, y + 16, 12, 14, arcColor, false);
          renderer.drawRect(x + 6, y + 16, 4, 12, bladeColor);
        } else if (f === 3) {
          renderer.drawRect(x + 3, y + 18, 10, 4, bladeColor);
        } else {
          renderer.drawRect(x + 4, y + 15, 8, 2, arcColor);
        }
        break;
    }
  }

  /**
   * Sword pull triumph pose using official 8-bit pose sprite.
   */
  private renderSwordPull(renderer: Renderer, x: number, y: number): void {
    if (SpriteLoader.has('kris_pose') && SpriteLoader.getSpriteInfo('kris_pose')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'kris_pose', x, y - 2, 17, 16);
    } else {
      renderer.drawRect(x + 4, y + 4, 8, 4, '#241738');
      renderer.drawRect(x + 5, y + 6, 6, 3, '#82E0AA');
      renderer.drawRect(x + 4, y + 9, 8, 2, NES_COLORS.KRIS_CAPE);
      renderer.drawRect(x + 4, y + 11, 8, 4, NES_COLORS.KRIS_CYAN);
      renderer.drawRect(x + 4, y + 15, 3, 2, '#192841');
      renderer.drawRect(x + 9, y + 15, 3, 2, '#192841');
      renderer.drawRect(x + 7, y - 10, 2, 14, '#FFFFFF');
      renderer.drawRect(x + 5, y + 2, 6, 2, '#C0C0C0');
    }

    // Shining sparkle at blade tip
    const sparklePulse = Math.floor(this.pullTimer * 10) % 2 === 0;
    if (sparklePulse) {
      renderer.drawRect(x + 5, y - 13, 6, 2, NES_COLORS.GOLD_ACCENT);
      renderer.drawRect(x + 7, y - 15, 2, 6, NES_COLORS.GOLD_ACCENT);
    }
  }

  /**
   * Recoil / hurt pose with authentic 8-bit hurt sprite.
   */
  private renderHurt(renderer: Renderer, x: number, y: number): void {
    if (SpriteLoader.has('kris_hurt') && SpriteLoader.getSpriteInfo('kris_hurt')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'kris_hurt', x, y, this.width, this.height, {
        flashWhite: true,
      });
    } else {
      renderer.drawRect(x + 3, y + 2, 10, 14, '#FFFFFF');
      renderer.drawRect(x + 5, y + 4, 6, 4, NES_COLORS.SOUL_RED);
    }
  }

  /**
   * Defeat / fallen pose with authentic 8-bit defeat sprite.
   */
  private renderDefeat(renderer: Renderer, x: number, y: number): void {
    if (SpriteLoader.has('kris_defeat') && SpriteLoader.getSpriteInfo('kris_defeat')?.loaded) {
      SpriteLoader.draw(renderer.ctx, 'kris_defeat', x, y, this.width, this.height);
    } else {
      renderer.drawRect(x + 1, y + 10, 14, 5, '#1B1428');
      renderer.drawRect(x + 3, y + 9, 8, 3, NES_COLORS.KRIS_CYAN);
      renderer.drawRect(x + 11, y + 10, 4, 4, NES_COLORS.KRIS_CAPE);
    }
  }
}

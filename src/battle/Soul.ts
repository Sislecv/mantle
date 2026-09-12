/**
 * Mantle Chapter 1 - SOUL Controller
 * 8-Bit NES red heart controller strictly clamped to BattleBox arena with iFrames and sprinting.
 */

import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NES_COLORS } from '../core/Constants';
import { BattleBox } from './BattleBox';

export class Soul {
  public x: number;
  public y: number;
  public size: number;
  public baseSpeed: number;
  public sprintMultiplier: number;
  public iFrames: number;

  // 8x8 NES Heart pixel pattern (row by row bitmap: 1 = red, 2 = white highlight)
  private static readonly HEART_PIXELS: number[][] = [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
  ];

  constructor(
    x: number = 128,
    y: number = 155,
    size: number = 8,
    baseSpeed: number = 70,
    sprintMultiplier: number = 1.6
  ) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.baseSpeed = baseSpeed;
    this.sprintMultiplier = sprintMultiplier;
    this.iFrames = 0;
  }

  public get isInvulnerable(): boolean {
    return this.iFrames > 0;
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Attempts to take damage. If invulnerable, returns false.
   * If vulnerable, sets iFrames and returns true.
   */
  public takeDamage(iFrameDuration: number = 1.0): boolean {
    if (this.isInvulnerable) {
      return false;
    }
    this.iFrames = iFrameDuration;
    return true;
  }

  /**
   * Returns axis-aligned bounding box centered on soul.
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    const half = this.size / 2;
    return {
      x: this.x - half,
      y: this.y - half,
      width: this.size,
      height: this.size,
    };
  }

  /**
   * Returns center coordinates.
   */
  public getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Clamps soul coordinates strictly within the interior of the BattleBox.
   */
  public clampToBounds(box: BattleBox): void {
    const clamped = box.clampPoint(this.x, this.y, this.size / 2);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  /**
   * Updates soul movement, iFrames, and box containment.
   */
  public update(dt: number, input?: InputManager, box?: BattleBox): void {
    if (this.iFrames > 0) {
      this.iFrames = Math.max(0, this.iFrames - dt);
    }

    if (input) {
      let dx = 0;
      let dy = 0;

      if (input.isDown('left')) dx -= 1;
      if (input.isDown('right')) dx += 1;
      if (input.isDown('up')) dy -= 1;
      if (input.isDown('down')) dy += 1;

      if (dx !== 0 && dy !== 0) {
        dx /= Math.SQRT2;
        dy /= Math.SQRT2;
      }

      const speed = input.isDown('cancel')
        ? this.baseSpeed * this.sprintMultiplier
        : this.baseSpeed;

      this.x += dx * speed * dt;
      this.y += dy * speed * dt;
    }

    if (box) {
      this.clampToBounds(box);
    }
  }

  /**
   * Renders the 8-bit SOUL heart with flashing effect when invulnerable.
   */
  public render(renderer: Renderer): void {
    // Flashing effect: 20Hz flicker during invulnerability
    if (this.iFrames > 0 && Math.floor(this.iFrames * 20) % 2 === 1) {
      return;
    }

    const startX = Math.floor(this.x - this.size / 2);
    const startY = Math.floor(this.y - this.size / 2);

    for (let r = 0; r < Soul.HEART_PIXELS.length; r++) {
      const row = Soul.HEART_PIXELS[r];
      for (let c = 0; c < row.length; c++) {
        const pixel = row[c];
        if (pixel === 1) {
          renderer.drawRect(startX + c, startY + r, 1, 1, NES_COLORS.SOUL_RED, true);
        } else if (pixel === 2) {
          renderer.drawRect(startX + c, startY + r, 1, 1, NES_COLORS.WHITE, true);
        }
      }
    }
  }
}

/**
 * Mantle Chapter 1 - Battle Box Arena
 * Manages the iconic Deltarune arena box with smooth tweening and strict boundary clamping.
 */

import { Renderer } from '../core/Renderer';
import { NES_COLORS } from '../core/Constants';

export class BattleBox {
  public static readonly DEFAULT_X = 68;
  public static readonly DEFAULT_Y = 120;
  public static readonly DEFAULT_WIDTH = 120;
  public static readonly DEFAULT_HEIGHT = 70;
  public static readonly BORDER_THICKNESS = 2;

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public targetX: number;
  public targetY: number;
  public targetWidth: number;
  public targetHeight: number;
  public lerpSpeed: number;

  constructor(
    x: number = BattleBox.DEFAULT_X,
    y: number = BattleBox.DEFAULT_Y,
    width: number = BattleBox.DEFAULT_WIDTH,
    height: number = BattleBox.DEFAULT_HEIGHT,
    lerpSpeed: number = 15
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.targetX = x;
    this.targetY = y;
    this.targetWidth = width;
    this.targetHeight = height;
    this.lerpSpeed = lerpSpeed;
  }

  /**
   * Sets new target position and dimensions for smooth tweening.
   */
  public setTarget(x: number, y: number, width: number, height: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetWidth = width;
    this.targetHeight = height;
  }

  /**
   * Snaps or resizes back to default arena dimensions.
   */
  public resetToDefault(): void {
    this.setTarget(
      BattleBox.DEFAULT_X,
      BattleBox.DEFAULT_Y,
      BattleBox.DEFAULT_WIDTH,
      BattleBox.DEFAULT_HEIGHT
    );
  }

  /**
   * Immediately snaps to target boundaries.
   */
  public snapToTarget(): void {
    this.x = this.targetX;
    this.y = this.targetY;
    this.width = this.targetWidth;
    this.height = this.targetHeight;
  }

  /**
   * Smoothly interpolates boundaries towards target.
   */
  public update(dt: number): void {
    const factor = Math.min(1, this.lerpSpeed * dt);
    this.x += (this.targetX - this.x) * factor;
    this.y += (this.targetY - this.y) * factor;
    this.width += (this.targetWidth - this.width) * factor;
    this.height += (this.targetHeight - this.height) * factor;

    if (Math.abs(this.targetX - this.x) < 0.1) this.x = this.targetX;
    if (Math.abs(this.targetY - this.y) < 0.1) this.y = this.targetY;
    if (Math.abs(this.targetWidth - this.width) < 0.1) this.width = this.targetWidth;
    if (Math.abs(this.targetHeight - this.height) < 0.1) this.height = this.targetHeight;
  }

  /**
   * Returns outer boundary rectangle.
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Returns playable inner boundary area (excluding 2px white border).
   */
  public getInnerBounds(): { x: number; y: number; width: number; height: number } {
    const border = BattleBox.BORDER_THICKNESS;
    return {
      x: this.x + border,
      y: this.y + border,
      width: Math.max(0, this.width - border * 2),
      height: Math.max(0, this.height - border * 2),
    };
  }

  /**
   * Clamps a coordinate within the playable interior of the battle box.
   */
  public clampPoint(px: number, py: number, padding: number = 0): { x: number; y: number } {
    const border = BattleBox.BORDER_THICKNESS;
    const minX = this.x + border + padding;
    const maxX = this.x + this.width - border - padding;
    const minY = this.y + border + padding;
    const maxY = this.y + this.height - border - padding;

    const clampedX = maxX >= minX ? Math.max(minX, Math.min(maxX, px)) : this.x + this.width / 2;
    const clampedY = maxY >= minY ? Math.max(minY, Math.min(maxY, py)) : this.y + this.height / 2;

    return { x: clampedX, y: clampedY };
  }

  /**
   * Renders the battle box with crisp 2px border and solid black interior.
   */
  public render(renderer: Renderer): void {
    // Outer white box
    renderer.drawRect(this.x, this.y, this.width, this.height, NES_COLORS.WHITE, true);

    // Inner black box
    const border = BattleBox.BORDER_THICKNESS;
    const innerW = Math.max(0, this.width - border * 2);
    const innerH = Math.max(0, this.height - border * 2);
    renderer.drawRect(this.x + border, this.y + border, innerW, innerH, NES_COLORS.BLACK, true);
  }
}

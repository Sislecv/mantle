/**
 * Mantle Chapter 1 - Deltarune Card Suit Plate Puzzle
 * Implements ground pressure plates with Card Suit glyphs (SPADE, HEART, DIAMOND, CLUB).
 * Requires stepping on plates in the target order to unlock electric barriers and gates.
 */

import { Puzzle, PuzzleOptions } from './Puzzle';
import { Entity } from '../entities/Entity';
import { Renderer } from '../core/Renderer';
import { NES_COLORS, TILE_SIZE } from '../core/Constants';

export type CardSuit = 'SPADE' | 'HEART' | 'DIAMOND' | 'CLUB';

export interface SuitPlate {
  suit: CardSuit;
  gridX: number;
  gridY: number;
  isPressed: boolean;
}

export interface SuitPlatePuzzleOptions extends PuzzleOptions {
  targetSequence: CardSuit[];
  plates: Array<{ suit: CardSuit; gridX: number; gridY: number; isPressed?: boolean }>;
}

export class SuitPlatePuzzle extends Puzzle {
  public targetSequence: CardSuit[];
  public currentStep: number = 0;
  public plates: SuitPlate[];
  public barrierDisabled: boolean = false;
  private activePlateIndex: number | null = null;

  constructor(options: SuitPlatePuzzleOptions) {
    super(options);
    this.targetSequence = [...options.targetSequence];
    this.plates = options.plates.map((p) => ({
      suit: p.suit,
      gridX: p.gridX,
      gridY: p.gridY,
      isPressed: p.isPressed ?? false,
    }));
  }

  /**
   * Checks whether the puzzle is solved.
   */
  public checkSolution(): boolean {
    return this.isSolved || this.currentStep >= this.targetSequence.length;
  }

  /**
   * Processes a step on a plate with the given suit.
   * Advances step on match, resets on mismatch.
   */
  public stepOnPlate(suit: CardSuit): boolean {
    if (this.isSolved) {
      return true;
    }

    const expectedSuit = this.targetSequence[this.currentStep];

    if (suit === expectedSuit) {
      // Correct step
      this.currentStep += 1;

      // Mark the corresponding plate as pressed
      const plate = this.plates.find((p) => p.suit === suit);
      if (plate) {
        plate.isPressed = true;
      }

      if (this.currentStep >= this.targetSequence.length) {
        this.solve();
      } else if (this.audio) {
        this.audio.playSfx('SELECT');
      }

      return true;
    }

    // Incorrect step: buzzer and reset
    this.currentStep = 0;
    for (const p of this.plates) {
      p.isPressed = false;
    }

    if (this.audio) {
      this.audio.playSfx('HURT');
    }

    return false;
  }

  /**
   * Solves puzzle and drops associated barrier.
   */
  public override solve(): void {
    this.barrierDisabled = true;
    super.solve();
  }

  /**
   * Resets puzzle step progression, unpresses plates, and re-engages barrier.
   */
  public override reset(): void {
    this.currentStep = 0;
    this.activePlateIndex = null;
    this.barrierDisabled = false;
    for (const p of this.plates) {
      p.isPressed = false;
    }
    super.reset();
  }

  /**
   * Updates puzzle state based on player position overlap.
   */
  public update(player: Entity): void {
    if (this.isSolved) {
      return;
    }

    const bounds = player.getBounds();
    const playerCenterX = bounds.x + bounds.width / 2;
    const playerCenterY = bounds.y + bounds.height / 2;

    let steppedPlateIndex: number | null = null;

    for (let i = 0; i < this.plates.length; i++) {
      const p = this.plates[i];
      const px = p.gridX * TILE_SIZE;
      const py = p.gridY * TILE_SIZE;

      if (
        playerCenterX >= px &&
        playerCenterX < px + TILE_SIZE &&
        playerCenterY >= py &&
        playerCenterY < py + TILE_SIZE
      ) {
        steppedPlateIndex = i;
        break;
      }
    }

    if (steppedPlateIndex !== null) {
      if (this.activePlateIndex !== steppedPlateIndex) {
        this.activePlateIndex = steppedPlateIndex;
        this.stepOnPlate(this.plates[steppedPlateIndex].suit);
      }
    } else {
      this.activePlateIndex = null;
    }
  }

  /**
   * Renders the suit plates with NES aesthetic glyphs.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    for (const plate of this.plates) {
      const drawX = Math.floor(plate.gridX * TILE_SIZE - cameraX);
      const drawY = Math.floor(plate.gridY * TILE_SIZE - cameraY);

      // Plate base
      const baseColor = plate.isPressed ? '#2C223B' : '#1F172B';
      const borderColor = plate.isPressed ? NES_COLORS.GOLD_ACCENT : '#4A3B66';
      renderer.drawRect(drawX, drawY, TILE_SIZE, TILE_SIZE, baseColor);
      renderer.drawRect(drawX, drawY, TILE_SIZE, TILE_SIZE, borderColor, false);

      // Render Suit Glyph
      this.renderSuitGlyph(renderer, plate.suit, drawX, drawY, plate.isPressed);
    }
  }

  /**
   * Renders pixel-art suit glyph in the center of the plate tile.
   */
  private renderSuitGlyph(
    renderer: Renderer,
    suit: CardSuit,
    x: number,
    y: number,
    isPressed: boolean
  ): void {
    const offset = isPressed ? 1 : 0;

    switch (suit) {
      case 'HEART': {
        const c = NES_COLORS.SOUL_RED;
        renderer.drawRect(x + 5, y + 5 + offset, 2, 2, c);
        renderer.drawRect(x + 9, y + 5 + offset, 2, 2, c);
        renderer.drawRect(x + 4, y + 6 + offset, 8, 3, c);
        renderer.drawRect(x + 5, y + 9 + offset, 6, 2, c);
        renderer.drawRect(x + 7, y + 11 + offset, 2, 1, c);
        break;
      }

      case 'DIAMOND': {
        const c = NES_COLORS.KRIS_CYAN;
        renderer.drawRect(x + 7, y + 4 + offset, 2, 2, c);
        renderer.drawRect(x + 5, y + 6 + offset, 6, 4, c);
        renderer.drawRect(x + 7, y + 10 + offset, 2, 2, c);
        break;
      }

      case 'SPADE': {
        const c = NES_COLORS.KRIS_BLUE;
        renderer.drawRect(x + 7, y + 4 + offset, 2, 2, c);
        renderer.drawRect(x + 5, y + 6 + offset, 6, 4, c);
        renderer.drawRect(x + 4, y + 8 + offset, 8, 2, c);
        renderer.drawRect(x + 7, y + 10 + offset, 2, 3, c); // spade base
        break;
      }

      case 'CLUB': {
        const c = NES_COLORS.RALSEI_GREEN;
        renderer.drawRect(x + 7, y + 4 + offset, 2, 2, c); // top leaf
        renderer.drawRect(x + 4, y + 7 + offset, 3, 2, c); // left leaf
        renderer.drawRect(x + 9, y + 7 + offset, 3, 2, c); // right leaf
        renderer.drawRect(x + 6, y + 6 + offset, 4, 4, c); // center
        renderer.drawRect(x + 7, y + 10 + offset, 2, 3, c); // stem
        break;
      }
    }
  }
}

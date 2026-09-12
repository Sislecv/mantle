/**
 * Mantle Chapter 1 - Puzzle Base Class
 * Fundamental base class for environmental puzzles, switches, and interactive mechanics.
 */

import { Renderer } from '../core/Renderer';
import { ChiptuneSynth } from '../audio/ChiptuneSynth';

export interface PuzzleOptions {
  id: string;
  onSolveCallback?: () => void;
  audio?: ChiptuneSynth | null;
}

export abstract class Puzzle {
  public readonly id: string;
  public isSolved: boolean = false;
  public onSolveCallback?: (() => void) | null;
  public audio?: ChiptuneSynth | null;

  constructor(options: PuzzleOptions) {
    this.id = options.id;
    this.onSolveCallback = options.onSolveCallback ?? null;
    this.audio = options.audio ?? null;
  }

  /**
   * Evaluates puzzle conditions and returns whether puzzle criteria are satisfied.
   */
  public abstract checkSolution(): boolean;

  /**
   * Solves the puzzle, invoking registered callbacks and playing victory sound effects.
   */
  public solve(): void {
    if (this.isSolved) {
      return;
    }

    this.isSolved = true;
    if (this.onSolveCallback) {
      this.onSolveCallback();
    }
    if (this.audio) {
      this.audio.playSfx('LEVEL_UP');
    }
  }

  /**
   * Resets puzzle to initial unsolved state.
   */
  public reset(): void {
    this.isSolved = false;
  }

  /**
   * Renders puzzle elements onto canvas.
   */
  public abstract render(renderer: Renderer, cameraX?: number, cameraY?: number): void;
}

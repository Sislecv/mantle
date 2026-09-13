/**
 * Mantle Chapter 1 - Main Application Entrypoint
 * Boots up Canvas, Renderer, InputManager, ChiptuneSynth, and GameLoop.
 * Orchestrates Chapter1Story with seamless transitions between Overworld, Dialogues,
 * Puzzles, Boss Battles, and Epilogue with Keyboard HUD overlay.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, NES_COLORS } from './core/Constants';
import { Renderer } from './core/Renderer';
import { InputManager } from './core/InputManager';
import { ChiptuneSynth } from './audio/ChiptuneSynth';
import { GameLoop } from './core/GameLoop';
import { Chapter1Story } from './scenes/Chapter1Story';
import { SpriteLoader } from './core/SpriteLoader';

export class MantleApp {
  public renderer: Renderer;
  public input: InputManager;
  public synth: ChiptuneSynth;
  public loop: GameLoop;
  public story: Chapter1Story;

  constructor() {
    SpriteLoader.initCoreSprites();
    this.renderer = new Renderer('#game-canvas');
    this.input = new InputManager();
    this.synth = new ChiptuneSynth();
    this.story = new Chapter1Story({
      renderer: this.renderer,
      input: this.input,
      synth: this.synth,
    });
    this.loop = new GameLoop();

    this.setupLoop();
  }

  private setupLoop(): void {
    this.loop.setUpdateCallback((dt: number) => this.update(dt));
    this.loop.setRenderCallback(() => this.render());
  }

  public start(): void {
    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
  }

  public update(dt: number): void {
    this.story.update(dt, this.input);
    this.input.update();
  }

  public render(): void {
    this.story.render(this.renderer);
    this.renderKeyboardHUD();
  }

  private renderKeyboardHUD(): void {
    if (this.story.mode === 'EPILOGUE' && this.story.whiteoutAlpha >= 0.9) {
      return;
    }

    const hudY = CANVAS_HEIGHT - 9;
    this.renderer.drawRect(0, hudY - 2, CANVAS_WIDTH, 11, 'rgba(0, 0, 0, 0.7)');

    let hint = '[WASD/ARROWS] Move  [Z/J] Action  [X/K] Sprint  [C/L] Menu';
    if (this.story.mode === 'BATTLE') {
      hint = '[ARROWS] Move SOUL  [Z/J] Action  [X/K] Focus';
    } else if (this.story.mode === 'DIALOGUE') {
      hint = '[Z/J] Advance Text / Confirm';
    }

    this.renderer.drawText(hint, CANVAS_WIDTH / 2, hudY, {
      color: NES_COLORS.GRAY_LIGHT,
      size: 6,
      align: 'center',
    });
  }
}

// Bootstrap when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new MantleApp();
    app.start();
  });
}

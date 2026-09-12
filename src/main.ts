/**
 * Mantle Chapter 1 - Main Entry Point
 * Initializes 8-bit Canvas Engine, Input System, and Interactive SOUL Demo Screen.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, NES_COLORS } from './core/Constants';
import { Renderer } from './core/Renderer';
import { InputManager } from './core/InputManager';
import { GameLoop } from './core/GameLoop';

// 8-bit Heart / SOUL Bit Pattern (10x9 pixels)
const SOUL_PIXELS: number[][] = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
];

class MantleDemoApp {
  private renderer: Renderer;
  private input: InputManager;
  private loop: GameLoop;

  // SOUL State
  private soulX: number = CANVAS_WIDTH / 2 - 5;
  private soulY: number = 140;
  private soulBaseY: number = 140;
  private soulTimer: number = 0;
  private flashTimer: number = 0;
  private stars: Array<{ x: number; y: number; speed: number; char: string }> = [];

  constructor() {
    this.renderer = new Renderer('#game-canvas');
    this.input = new InputManager();
    this.loop = new GameLoop();

    this.initStars();
    this.setupLoop();
  }

  private initStars(): void {
    const starCount = 30;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 10 + Math.random() * 20,
        char: Math.random() > 0.5 ? '.' : '+',
      });
    }
  }

  private setupLoop(): void {
    this.loop.setUpdateCallback((dt: number) => this.update(dt));
    this.loop.setRenderCallback(() => this.render());
  }

  public start(): void {
    this.loop.start();
  }

  private update(dt: number): void {
    this.soulTimer += dt * 3;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // Move background stars
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Input Movement
    const speed = this.input.isDown('cancel') ? 110 : 70;
    let dx = 0;
    let dy = 0;

    if (this.input.isDown('left')) dx -= 1;
    if (this.input.isDown('right')) dx += 1;
    if (this.input.isDown('up')) dy -= 1;
    if (this.input.isDown('down')) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      this.soulX += dx * speed * dt;
      this.soulY += dy * speed * dt;
      this.soulBaseY = this.soulY;
    } else {
      // Gentle floating bob when idle
      this.soulY = this.soulBaseY + Math.sin(this.soulTimer) * 3;
    }

    // Clamp SOUL to screen margins
    const margin = 12;
    this.soulX = Math.max(margin, Math.min(CANVAS_WIDTH - margin - 10, this.soulX));
    this.soulY = Math.max(margin, Math.min(CANVAS_HEIGHT - margin - 10, this.soulY));

    // Action Key Press (Pulse effect)
    if (this.input.isJustPressed('action')) {
      this.flashTimer = 0.2;
    }

    // Advance input frame state
    this.input.update();
  }

  private render(): void {
    // 1. Clear background
    this.renderer.clear(NES_COLORS.DARK_BG);

    // 2. Draw starfield
    for (const star of this.stars) {
      this.renderer.drawText(star.char, star.x, star.y, {
        color: NES_COLORS.DARK_ACCENT,
        size: 8,
      });
    }

    // 3. Draw NES decorative frame
    this.renderer.drawRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8, NES_COLORS.DARK_CLIFF, false);
    this.renderer.drawRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12, NES_COLORS.DARK_ACCENT, false);

    // 4. Logo and Title Text
    this.renderer.drawText('DELTA MANTLE', CANVAS_WIDTH / 2, 28, {
      color: NES_COLORS.GOLD_ACCENT,
      size: 16,
      align: 'center',
    });

    this.renderer.drawText('CHAPTER 1: THE DARK REALM', CANVAS_WIDTH / 2, 50, {
      color: NES_COLORS.KRIS_CYAN,
      size: 8,
      align: 'center',
    });

    this.renderer.drawText('- 8-BIT FAMICOM DEMAKE -', CANVAS_WIDTH / 2, 64, {
      color: NES_COLORS.GRAY_LIGHT,
      size: 7,
      align: 'center',
    });

    // 5. Battle Box Preview Frame
    const boxX = CANVAS_WIDTH / 2 - 40;
    const boxY = 116;
    const boxW = 80;
    const boxH = 56;
    this.renderer.drawRect(boxX, boxY, boxW, boxH, NES_COLORS.WHITE, false);
    this.renderer.drawRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2, NES_COLORS.BLACK, true);

    // 6. Draw 8-Bit Red SOUL
    const soulColor = this.flashTimer > 0 ? NES_COLORS.SOUL_GLOW : NES_COLORS.SOUL_RED;
    for (let r = 0; r < SOUL_PIXELS.length; r++) {
      for (let c = 0; c < SOUL_PIXELS[r].length; c++) {
        if (SOUL_PIXELS[r][c] === 1) {
          this.renderer.drawRect(this.soulX + c, this.soulY + r, 1, 1, soulColor, true);
        }
      }
    }

    // 7. Interactive Hint / Action indicator
    if (this.flashTimer > 0) {
      this.renderer.drawText('* DETERMINATION!', CANVAS_WIDTH / 2, 182, {
        color: NES_COLORS.GOLD_ACCENT,
        size: 8,
        align: 'center',
      });
    } else {
      const blink = Math.floor(this.soulTimer * 2) % 2 === 0;
      this.renderer.drawText(
        blink ? 'PRESS [Z] OR [ENTER] TO INTERACT' : '',
        CANVAS_WIDTH / 2,
        182,
        {
          color: NES_COLORS.WHITE,
          size: 7,
          align: 'center',
        }
      );
    }

    // 8. Bottom Control Prompt
    this.renderer.drawText('[ARROWS] Move SOUL  [X] Sprint  [Z] Action', CANVAS_WIDTH / 2, 218, {
      color: NES_COLORS.GRAY_DARK,
      size: 7,
      align: 'center',
    });
  }
}

// Bootstrap when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new MantleDemoApp();
  app.start();
});

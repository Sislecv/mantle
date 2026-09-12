/**
 * Mantle Chapter 1 - Renderer
 * Manages HTML5 2D Canvas context with crisp pixel scaling, primitives, and sprite blitting.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, NES_COLORS } from './Constants';

export interface DrawTextOptions {
  color?: string;
  size?: number;
  font?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly width: number;
  public readonly height: number;

  constructor(canvasOrSelector: HTMLCanvasElement | string, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    if (typeof canvasOrSelector === 'string') {
      const el = typeof document !== 'undefined' ? document.querySelector(canvasOrSelector) : null;
      if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element not found for selector: ${canvasOrSelector}`);
      }
      this.canvas = el;
    } else {
      this.canvas = canvasOrSelector;
    }

    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D rendering context from canvas');
    }
    this.ctx = context;

    this.initPixelSettings();
  }

  public initPixelSettings(): void {
    this.ctx.imageSmoothingEnabled = false;
    const ctxAny = this.ctx as unknown as Record<string, unknown>;
    ctxAny.webkitImageSmoothingEnabled = false;
    ctxAny.mozImageSmoothingEnabled = false;
    ctxAny.msImageSmoothingEnabled = false;
  }

  public clear(color: string = NES_COLORS.BLACK): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public drawRect(x: number, y: number, w: number, h: number, color: string, fill = true): void {
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w) - 1, Math.floor(h) - 1);
    }
  }

  public drawText(text: string, x: number, y: number, options?: DrawTextOptions): void {
    const color = options?.color ?? NES_COLORS.WHITE;
    const size = options?.size ?? 8;
    const font = options?.font ?? 'monospace';
    const align = options?.align ?? 'left';
    const baseline = options?.baseline ?? 'top';

    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px ${font}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }

  public drawSprite(
    img: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void {
    this.ctx.drawImage(
      img,
      Math.floor(sx),
      Math.floor(sy),
      Math.floor(sw),
      Math.floor(sh),
      Math.floor(dx),
      Math.floor(dy),
      Math.floor(dw),
      Math.floor(dh)
    );
  }
}

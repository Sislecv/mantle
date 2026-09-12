import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer } from '../../src/core/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT, NES_COLORS } from '../../src/core/Constants';

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let mockCtx: any;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    mockCtx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    renderer = new Renderer(canvas);
  });

  it('should initialize with correct dimensions and disable image smoothing', () => {
    expect(renderer.width).toBe(CANVAS_WIDTH);
    expect(renderer.height).toBe(CANVAS_HEIGHT);
    expect(renderer.ctx.imageSmoothingEnabled).toBe(false);
  });

  it('should clear canvas with designated color', () => {
    renderer.clear(NES_COLORS.DARK_BG);

    expect(renderer.ctx.fillStyle).toBe(NES_COLORS.DARK_BG);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  });

  it('should draw filled and outlined rects', () => {
    renderer.drawRect(10, 20, 30, 40, NES_COLORS.SOUL_RED, true);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40);

    renderer.drawRect(5, 5, 20, 20, NES_COLORS.WHITE, false);
    expect(mockCtx.strokeRect).toHaveBeenCalledWith(5.5, 5.5, 19, 19);
  });

  it('should draw text with custom options', () => {
    renderer.drawText('HELLO', 50, 60, {
      color: NES_COLORS.GOLD_ACCENT,
      size: 12,
      font: 'sans-serif',
      align: 'center',
    });

    expect(renderer.ctx.textAlign).toBe('center');
    expect(renderer.ctx.fillStyle).toBe(NES_COLORS.GOLD_ACCENT);
    expect(mockCtx.fillText).toHaveBeenCalledWith('HELLO', 50, 60);
  });

  it('should draw sprite via drawImage', () => {
    const mockImage = {} as CanvasImageSource;
    renderer.drawSprite(mockImage, 0, 0, 16, 16, 32, 48, 16, 16);

    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 16, 16, 32, 48, 16, 16);
  });
});

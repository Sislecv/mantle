import { describe, it, expect, vi } from 'vitest';
import { Hud, HudState } from '../../src/ui/Hud';
import { Renderer } from '../../src/core/Renderer';

describe('Hud', () => {
  it('instantiates and calculates health ratio accurately', () => {
    const hud = new Hud();
    const state: HudState = {
      hp: 15,
      maxHp: 20,
      hasSword: true,
      swordCharges: 4,
      maxSwordCharges: 4,
      lv: 1,
      roomName: 'DARK CLIFFS',
    };

    expect(hud.getHpRatio(state)).toBe(0.75);
  });

  it('clamps hp ratio between 0 and 1', () => {
    const hud = new Hud();
    expect(hud.getHpRatio({ hp: -5, maxHp: 20, hasSword: false, lv: 1 })).toBe(0);
    expect(hud.getHpRatio({ hp: 30, maxHp: 20, hasSword: false, lv: 1 })).toBe(1);
  });

  it('renders top HUD without throwing on canvas renderer', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 240;
    const mockCtx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

    const renderer = new Renderer(canvas);
    const hud = new Hud();

    expect(() => {
      hud.render(renderer, {
        hp: 20,
        maxHp: 20,
        hasSword: true,
        swordCharges: 4,
        maxSwordCharges: 4,
        lv: 2,
        roomName: 'FIELD',
      });
    }).not.toThrow();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SpriteLoader } from '../../src/core/SpriteLoader';

describe('SpriteLoader', () => {
  beforeEach(() => {
    SpriteLoader.clear();
  });

  it('registers sprite definition and retrieves metadata', () => {
    SpriteLoader.register('kris', '/assets/png/Kris_overworld_8bit.png', 16, 16);
    const info = SpriteLoader.getSpriteInfo('kris');
    expect(info).toBeDefined();
    expect(info?.width).toBe(16);
    expect(info?.height).toBe(16);
  });

  it('provides safe fallback rendering without throwing in node environment', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: () => {},
      drawImage: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      SpriteLoader.draw(mockCtx, 'kris', 10, 20, 16, 16, { flipX: true });
      SpriteLoader.draw(mockCtx, 'non_existent_key', 0, 0, 16, 16);
    }).not.toThrow();
  });

  it('loads core deltarune chapter 1 sprites catalog', () => {
    SpriteLoader.initCoreSprites();
    expect(SpriteLoader.has('kris_walk')).toBe(true);
    expect(SpriteLoader.has('kris_attack')).toBe(true);
    expect(SpriteLoader.has('kris_pose')).toBe(true);
    expect(SpriteLoader.has('susie')).toBe(true);
    expect(SpriteLoader.has('ralsei')).toBe(true);
    expect(SpriteLoader.has('king')).toBe(true);
    expect(SpriteLoader.has('k_round')).toBe(true);
    expect(SpriteLoader.has('portrait_susie')).toBe(true);
  });
});

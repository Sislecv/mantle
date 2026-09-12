import { describe, it, expect } from 'vitest';
import { Hitbox } from '../../src/combat/Hitbox';

describe('Hitbox', () => {
  describe('Creation and defaults', () => {
    it('should initialize with provided coordinates and default values', () => {
      const hb = new Hitbox({
        x: 10,
        y: 20,
        width: 16,
        height: 16,
      });

      expect(hb.x).toBe(10);
      expect(hb.y).toBe(20);
      expect(hb.width).toBe(16);
      expect(hb.height).toBe(16);
      expect(hb.damage).toBe(1);
      expect(hb.duration).toBe(0.25);
      expect(hb.owner).toBe('PLAYER');
      expect(hb.knockback).toEqual({ x: 0, y: 0 });
    });

    it('should accept custom parameters overriding defaults', () => {
      const hb = new Hitbox({
        x: 5,
        y: 15,
        width: 32,
        height: 8,
        damage: 4,
        duration: 0.5,
        owner: 'ENEMY',
        knockback: { x: -2, y: 1 },
      });

      expect(hb.damage).toBe(4);
      expect(hb.duration).toBe(0.5);
      expect(hb.owner).toBe('ENEMY');
      expect(hb.knockback).toEqual({ x: -2, y: 1 });
    });
  });

  describe('intersects() calculation', () => {
    const hb = new Hitbox({ x: 16, y: 16, width: 16, height: 16 });

    it('should detect overlap when bounding boxes intersect', () => {
      // Complete overlap
      expect(hb.intersects({ x: 16, y: 16, width: 16, height: 16 })).toBe(true);

      // Partial overlap from right
      expect(hb.intersects({ x: 24, y: 16, width: 16, height: 16 })).toBe(true);

      // Partial overlap from bottom
      expect(hb.intersects({ x: 16, y: 24, width: 16, height: 16 })).toBe(true);

      // Partial overlap corner
      expect(hb.intersects({ x: 20, y: 20, width: 16, height: 16 })).toBe(true);
    });

    it('should return false when bounding boxes do not intersect', () => {
      // Completely to the right
      expect(hb.intersects({ x: 40, y: 16, width: 16, height: 16 })).toBe(false);

      // Completely to the left
      expect(hb.intersects({ x: -10, y: 16, width: 16, height: 16 })).toBe(false);

      // Completely above
      expect(hb.intersects({ x: 16, y: -20, width: 16, height: 16 })).toBe(false);

      // Completely below
      expect(hb.intersects({ x: 16, y: 40, width: 16, height: 16 })).toBe(false);
    });

    it('should return false for edge-touching boundaries without volume overlap', () => {
      // Touching right edge exactly at x = 32
      expect(hb.intersects({ x: 32, y: 16, width: 16, height: 16 })).toBe(false);

      // Touching left edge exactly at x = 0
      expect(hb.intersects({ x: 0, y: 16, width: 16, height: 16 })).toBe(false);

      // Touching bottom edge exactly at y = 32
      expect(hb.intersects({ x: 16, y: 32, width: 16, height: 16 })).toBe(false);

      // Touching top edge exactly at y = 0
      expect(hb.intersects({ x: 16, y: 0, width: 16, height: 16 })).toBe(false);
    });
  });

  describe('update() lifecycle and duration countdown', () => {
    it('should decrease duration by dt and return true while active', () => {
      const hb = new Hitbox({ x: 0, y: 0, width: 16, height: 16, duration: 0.25 });

      const stillActive = hb.update(0.1);
      expect(stillActive).toBe(true);
      expect(hb.duration).toBeCloseTo(0.15, 5);
    });

    it('should return false and expire when duration drops to zero or below', () => {
      const hb = new Hitbox({ x: 0, y: 0, width: 16, height: 16, duration: 0.25 });

      hb.update(0.15);
      const expired = hb.update(0.1);
      expect(expired).toBe(false);
      expect(hb.duration).toBeLessThanOrEqual(0);
    });
  });
});

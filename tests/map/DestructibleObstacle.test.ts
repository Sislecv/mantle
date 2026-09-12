import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestructibleObstacle } from '../../src/map/DestructibleObstacle';
import { Renderer } from '../../src/core/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from '../../src/core/Constants';

describe('DestructibleObstacle', () => {
  describe('Properties and defaults', () => {
    it('should create TREE with default requiredLv 2, requiredSword true, hp 1', () => {
      const tree = new DestructibleObstacle({
        id: 'tree_1',
        gridX: 4,
        gridY: 7,
        type: 'TREE',
      });

      expect(tree.id).toBe('tree_1');
      expect(tree.gridX).toBe(4);
      expect(tree.gridY).toBe(7);
      expect(tree.type).toBe('TREE');
      expect(tree.requiredLv).toBe(2);
      expect(tree.requiredSword).toBe(true);
      expect(tree.hp).toBe(1);
      expect(tree.maxHp).toBe(1);
      expect(tree.isDestroyed).toBe(false);
      expect(tree.isSolid()).toBe(true);
    });

    it('should create BOULDER with default requiredLv 3, requiredSword true, hp 2', () => {
      const boulder = new DestructibleObstacle({
        id: 'boulder_1',
        gridX: 10,
        gridY: 5,
        type: 'BOULDER',
      });

      expect(boulder.requiredLv).toBe(3);
      expect(boulder.requiredSword).toBe(true);
      expect(boulder.hp).toBe(2);
      expect(boulder.maxHp).toBe(2);
      expect(boulder.isDestroyed).toBe(false);
    });

    it('should create WOOD_GATE with default requiredLv 1, requiredSword true, hp 1', () => {
      const gate = new DestructibleObstacle({
        id: 'gate_1',
        gridX: 8,
        gridY: 12,
        type: 'WOOD_GATE',
      });

      expect(gate.requiredLv).toBe(1);
      expect(gate.requiredSword).toBe(true);
      expect(gate.hp).toBe(1);
      expect(gate.isDestroyed).toBe(false);
    });

    it('should allow overriding obstacle properties', () => {
      const customTree = new DestructibleObstacle({
        id: 'custom_tree',
        gridX: 1,
        gridY: 1,
        type: 'TREE',
        requiredLv: 1,
        requiredSword: false,
        hp: 3,
      });

      expect(customTree.requiredLv).toBe(1);
      expect(customTree.requiredSword).toBe(false);
      expect(customTree.hp).toBe(3);
      expect(customTree.maxHp).toBe(3);
    });
  });

  describe('canDestroy check', () => {
    let tree: DestructibleObstacle;
    let boulder: DestructibleObstacle;

    beforeEach(() => {
      tree = new DestructibleObstacle({ id: 't1', gridX: 2, gridY: 2, type: 'TREE' });
      boulder = new DestructibleObstacle({ id: 'b1', gridX: 3, gridY: 3, type: 'BOULDER' });
    });

    it('should reject destruction if required sword is missing', () => {
      // Tree requires sword and LV 2
      expect(tree.canDestroy(2, false)).toBe(false);
      expect(tree.canDestroy(99, false)).toBe(false);
    });

    it('should reject destruction if player level is insufficient', () => {
      // Tree requires LV 2
      expect(tree.canDestroy(1, true)).toBe(false);

      // Boulder requires LV 3
      expect(boulder.canDestroy(2, true)).toBe(false);
    });

    it('should allow destruction when player has sword and sufficient level', () => {
      expect(tree.canDestroy(2, true)).toBe(true);
      expect(tree.canDestroy(3, true)).toBe(true);

      expect(boulder.canDestroy(3, true)).toBe(true);
      expect(boulder.canDestroy(4, true)).toBe(true);
    });

    it('should return false if already destroyed', () => {
      tree.hit(1, 2, true);
      expect(tree.isDestroyed).toBe(true);
      expect(tree.canDestroy(2, true)).toBe(false);
    });
  });

  describe('hit() logic and HP tracking', () => {
    let tree: DestructibleObstacle;
    let boulder: DestructibleObstacle;

    beforeEach(() => {
      tree = new DestructibleObstacle({ id: 't1', gridX: 2, gridY: 2, type: 'TREE' });
      boulder = new DestructibleObstacle({ id: 'b1', gridX: 3, gridY: 3, type: 'BOULDER', hp: 2 });
    });

    it('should fail to damage if sword is required but missing', () => {
      const result = tree.hit(1, 2, false);
      expect(result.destroyed).toBe(false);
      expect(result.damageDealt).toBe(0);
      expect(result.reason).toBe('Requires sword');
      expect(tree.hp).toBe(1);
      expect(tree.isDestroyed).toBe(false);
    });

    it('should fail to damage if LV is too low', () => {
      const result = tree.hit(1, 1, true);
      expect(result.destroyed).toBe(false);
      expect(result.damageDealt).toBe(0);
      expect(result.reason).toContain('LV');
      expect(tree.hp).toBe(1);
      expect(tree.isDestroyed).toBe(false);
    });

    it('should destroy tree in 1 hit when requirements are met', () => {
      const result = tree.hit(1, 2, true);
      expect(result.destroyed).toBe(true);
      expect(result.damageDealt).toBe(1);
      expect(tree.hp).toBe(0);
      expect(tree.isDestroyed).toBe(true);
      expect(tree.isSolid()).toBe(false);
    });

    it('should decrement HP on multi-hit boulder before destroying', () => {
      // First hit dealt to boulder (hp: 2)
      const firstHit = boulder.hit(1, 3, true);
      expect(firstHit.destroyed).toBe(false);
      expect(firstHit.damageDealt).toBe(1);
      expect(boulder.hp).toBe(1);
      expect(boulder.isDestroyed).toBe(false);
      expect(boulder.isSolid()).toBe(true);

      // Second hit finishes boulder
      const secondHit = boulder.hit(1, 3, true);
      expect(secondHit.destroyed).toBe(true);
      expect(secondHit.damageDealt).toBe(1);
      expect(boulder.hp).toBe(0);
      expect(boulder.isDestroyed).toBe(true);
      expect(boulder.isSolid()).toBe(false);
    });

    it('should handle hits to already destroyed obstacles gracefully', () => {
      tree.hit(1, 2, true);
      const redundantHit = tree.hit(1, 2, true);
      expect(redundantHit.destroyed).toBe(true);
      expect(redundantHit.damageDealt).toBe(0);
      expect(redundantHit.reason).toBe('Already destroyed');
    });
  });

  describe('Grid and Pixel Occupancy', () => {
    it('should correctly report occupies at grid coordinates when alive and not when destroyed', () => {
      const tree = new DestructibleObstacle({ id: 't1', gridX: 5, gridY: 6, type: 'TREE' });

      expect(tree.occupies(5, 6)).toBe(true);
      expect(tree.occupies(5, 7)).toBe(false);

      tree.hit(1, 2, true);
      expect(tree.occupies(5, 6)).toBe(false);
    });

    it('should correctly report pixel occupancy', () => {
      const tree = new DestructibleObstacle({ id: 't1', gridX: 2, gridY: 3, type: 'TREE' });
      const px = 2 * TILE_SIZE; // 32
      const py = 3 * TILE_SIZE; // 48

      expect(tree.occupiesPixel(px, py)).toBe(true);
      expect(tree.occupiesPixel(px + 15, py + 15)).toBe(true);
      expect(tree.occupiesPixel(px - 1, py)).toBe(false);
      expect(tree.occupiesPixel(px, py + 16)).toBe(false);
    });
  });

  describe('Rendering', () => {
    it('should render intact and destroyed states without crashing', () => {
      const canvas = document.createElement('canvas');
      const mockCtx = {
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
      const renderer = new Renderer(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
      const tree = new DestructibleObstacle({ id: 't1', gridX: 1, gridY: 1, type: 'TREE' });
      const boulder = new DestructibleObstacle({ id: 'b1', gridX: 2, gridY: 2, type: 'BOULDER' });
      const gate = new DestructibleObstacle({ id: 'g1', gridX: 3, gridY: 3, type: 'WOOD_GATE' });

      expect(() => {
        tree.render(renderer);
        boulder.render(renderer);
        gate.render(renderer);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();

      // Destroy tree and render again
      tree.hit(1, 2, true);
      expect(() => {
        tree.render(renderer);
      }).not.toThrow();
    });
  });
});

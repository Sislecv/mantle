import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZoneManager, ZONE_IDS } from '../../src/map/ZoneManager';
import { Renderer } from '../../src/core/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/core/Constants';

describe('ZoneManager', () => {
  let zoneManager: ZoneManager;

  beforeEach(() => {
    zoneManager = new ZoneManager();
  });

  describe('Zone Initialization & Loading', () => {
    it('should default to ZONE_CLIFFS on creation', () => {
      const current = zoneManager.getCurrentZone();
      expect(current.id).toBe(ZONE_IDS.CLIFFS);
      expect(current.tilemap).toBeDefined();
      expect(current.obstacles).toBeDefined();
    });

    it('should load all 5 Chapter 1 zones successfully', () => {
      const zones = [
        ZONE_IDS.CLIFFS,
        ZONE_IDS.CASTLE_TOWN,
        ZONE_IDS.FIELD,
        ZONE_IDS.FOREST,
        ZONE_IDS.CASTLE,
      ];

      for (const zoneId of zones) {
        zoneManager.loadZone(zoneId);
        expect(zoneManager.getCurrentZone().id).toBe(zoneId);
      }
    });

    it('should throw or keep current zone when loading unknown zoneId', () => {
      expect(() => {
        zoneManager.loadZone('ZONE_NON_EXISTENT');
      }).toThrow();
    });
  });

  describe('Obstacles in Zones', () => {
    it('should provide obstacles for ZONE_FOREST', () => {
      zoneManager.loadZone(ZONE_IDS.FOREST);
      const obstacles = zoneManager.getObstacles();
      expect(obstacles.length).toBeGreaterThan(0);
      expect(obstacles.some((o) => o.type === 'TREE')).toBe(true);
    });

    it('should check solidity taking both tilemap and obstacles into account', () => {
      zoneManager.loadZone(ZONE_IDS.FOREST);
      const tree = zoneManager.getObstacles()[0];

      // At tree's grid position, it should be solid
      expect(zoneManager.isSolid(tree.gridX, tree.gridY)).toBe(true);

      // When tree is destroyed, solidity should clear (assuming the tile underneath is floor)
      tree.hit(1, 2, true);
      expect(tree.isDestroyed).toBe(true);
      expect(zoneManager.isSolid(tree.gridX, tree.gridY)).toBe(false);
    });
  });

  describe('Zone Transitions', () => {
    it('should transition between zones and update spawn coordinates', () => {
      let transitioned = false;
      let targetResult = '';

      zoneManager.onZoneTransition = (targetZoneId) => {
        transitioned = true;
        targetResult = targetZoneId;
      };

      zoneManager.triggerTransition(ZONE_IDS.CASTLE_TOWN, 8, 12);
      expect(transitioned).toBe(true);
      expect(targetResult).toBe(ZONE_IDS.CASTLE_TOWN);
      expect(zoneManager.getCurrentZone().id).toBe(ZONE_IDS.CASTLE_TOWN);
      expect(zoneManager.playerSpawnX).toBe(8);
      expect(zoneManager.playerSpawnY).toBe(12);
    });
  });

  describe('Rendering', () => {
    it('should render zone tilemap and obstacles without crashing', () => {
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

      expect(() => {
        zoneManager.render(renderer, 0, 0);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});

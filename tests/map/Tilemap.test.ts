import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tilemap } from '../../src/map/Tilemap';
import { TILES, createTile } from '../../src/map/Tile';
import { Renderer } from '../../src/core/Renderer';
import { TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/core/Constants';

describe('Tilemap', () => {
  let map: Tilemap;

  beforeEach(() => {
    // Default 16x15 screen
    map = new Tilemap(16, 15);
  });

  describe('Initialization & Bounds', () => {
    it('should initialize with default 16x15 dimensions', () => {
      expect(map.width).toBe(16);
      expect(map.height).toBe(15);
      expect(map.pixelWidth).toBe(256);
      expect(map.pixelHeight).toBe(240);
    });

    it('should support custom dimensions', () => {
      const customMap = new Tilemap(32, 30);
      expect(customMap.width).toBe(32);
      expect(customMap.height).toBe(30);
      expect(customMap.pixelWidth).toBe(512);
      expect(customMap.pixelHeight).toBe(480);
    });

    it('should initialize cells to EMPTY by default', () => {
      const tile = map.getTile(0, 0);
      expect(tile).not.toBeNull();
      expect(tile?.type).toBe('EMPTY');
      expect(tile?.solid).toBe(false);
    });
  });

  describe('setTile & getTile', () => {
    it('should set and retrieve tiles at valid grid coordinates', () => {
      const cliffWall = createTile('WALL_CLIFF');
      map.setTile(3, 4, cliffWall);

      const retrieved = map.getTile(3, 4);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe('WALL_CLIFF');
      expect(retrieved?.solid).toBe(true);
    });

    it('should return null for out-of-bounds getTile', () => {
      expect(map.getTile(-1, 0)).toBeNull();
      expect(map.getTile(0, -1)).toBeNull();
      expect(map.getTile(16, 5)).toBeNull();
      expect(map.getTile(5, 15)).toBeNull();
    });

    it('should gracefully handle out-of-bounds setTile without throwing', () => {
      expect(() => {
        map.setTile(-5, -5, createTile('WALL_CLIFF'));
        map.setTile(100, 100, createTile('WALL_CLIFF'));
      }).not.toThrow();
    });
  });

  describe('Collision Detection (Grid & Pixel)', () => {
    beforeEach(() => {
      map.setTile(2, 2, createTile('FLOOR_CLIFF'));
      map.setTile(5, 5, createTile('WALL_CLIFF'));
      map.setTile(6, 5, createTile('WATER'));
    });

    it('should report correct solidity at grid coordinates', () => {
      expect(map.isSolid(2, 2)).toBe(false);
      expect(map.isSolid(5, 5)).toBe(true);
      expect(map.isSolid(6, 5)).toBe(true);
    });

    it('should treat out-of-bounds grid coordinates as solid boundaries', () => {
      expect(map.isSolid(-1, 0)).toBe(true);
      expect(map.isSolid(0, -1)).toBe(true);
      expect(map.isSolid(16, 5)).toBe(true);
      expect(map.isSolid(5, 15)).toBe(true);
    });

    it('should report correct solidity at pixel coordinates', () => {
      // (5, 5) corresponds to pixels [80..95, 80..95]
      const tile5X = 5 * TILE_SIZE; // 80
      const tile5Y = 5 * TILE_SIZE; // 80

      expect(map.isSolidAtPixel(tile5X, tile5Y)).toBe(true);
      expect(map.isSolidAtPixel(tile5X + 8, tile5Y + 8)).toBe(true);
      expect(map.isSolidAtPixel(tile5X + 15, tile5Y + 15)).toBe(true);

      // (2, 2) corresponds to pixels [32..47, 32..47]
      const tile2X = 2 * TILE_SIZE; // 32
      const tile2Y = 2 * TILE_SIZE; // 32

      expect(map.isSolidAtPixel(tile2X, tile2Y)).toBe(false);
      expect(map.isSolidAtPixel(tile2X + 10, tile2Y + 10)).toBe(false);
    });

    it('should treat negative and out-of-bounds pixels as solid', () => {
      expect(map.isSolidAtPixel(-1, 50)).toBe(true);
      expect(map.isSolidAtPixel(50, -1)).toBe(true);
      expect(map.isSolidAtPixel(256, 100)).toBe(true);
      expect(map.isSolidAtPixel(100, 240)).toBe(true);
    });
  });

  describe('Trigger Detection', () => {
    it('should return triggerId when set on a tile', () => {
      const triggerTile = createTile('FLOOR_CHECKER_LIGHT', { triggerId: 'warp_castle_town' });
      map.setTile(8, 14, triggerTile);

      expect(map.getTrigger(8, 14)).toBe('warp_castle_town');
    });

    it('should return null when tile has no triggerId or is out of bounds', () => {
      expect(map.getTrigger(0, 0)).toBeNull();
      expect(map.getTrigger(-1, 0)).toBeNull();
      expect(map.getTrigger(50, 50)).toBeNull();
    });
  });

  describe('Rendering', () => {
    it('should render tiles to renderer without crashing', () => {
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

      map.setTile(0, 0, createTile('FLOOR_CLIFF'));
      map.setTile(1, 1, createTile('WALL_CLIFF'));
      map.setTile(2, 2, createTile('SLIDE_SLOPE'));
      map.setTile(3, 3, createTile('WATER'));
      map.setTile(4, 4, createTile('SPURT_SPIKES'));

      expect(() => {
        map.render(renderer, 0, 0);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});

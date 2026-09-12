import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Follower } from '../../src/entities/Follower';
import { Player } from '../../src/entities/Player';
import { Renderer } from '../../src/core/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/core/Constants';

describe('Party Follower Dynamics (Follower)', () => {
  let player: Player;
  let susie: Follower;
  let ralsei: Follower;

  beforeEach(() => {
    player = new Player({ x: 100, y: 100, facing: 'DOWN' });
    susie = new Follower({
      name: 'SUSIE',
      x: 100,
      y: 100,
      leader: player,
      trailDistance: 16,
    });
    ralsei = new Follower({
      name: 'RALSEI',
      x: 100,
      y: 100,
      leader: susie,
      trailDistance: 16,
    });
  });

  describe('Initialization & Attributes', () => {
    it('should initialize Susie with proper attributes and HERO_AXE configuration', () => {
      expect(susie.name).toBe('SUSIE');
      expect(susie.trailDistance).toBe(16);
      expect(susie.leader).toBe(player);
      expect(susie.width).toBe(16);
      expect(susie.height).toBe(16);
      expect(susie.isSolid).toBe(false); // Party followers do not block player
      expect(susie.facing).toBe('DOWN');
      expect(susie.isMoving).toBe(false);
    });

    it('should initialize Ralsei with proper attributes and HERO_SCARF configuration', () => {
      expect(ralsei.name).toBe('RALSEI');
      expect(ralsei.trailDistance).toBe(16);
      expect(ralsei.leader).toBe(susie);
      expect(ralsei.facing).toBe('DOWN');
    });

    it('should allow setting custom trailDistance and leader dynamically', () => {
      const customFollower = new Follower({
        name: 'SUSIE',
        trailDistance: 24,
      });
      expect(customFollower.trailDistance).toBe(24);
      expect(customFollower.leader).toBeNull();

      customFollower.setLeader(player);
      expect(customFollower.leader).toBe(player);
    });
  });

  describe('Breadcrumb Tracking & Conga Line Path Following', () => {
    it('should record breadcrumbs as leader moves across multiple tiles', () => {
      // Simulate leader moving right 48 pixels (3 full 16px tiles) from (100, 100) to (148, 100)
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';

      // Advance player in small increments (simulate 60fps game ticks)
      const dt = 0.05;
      for (let i = 0; i < 12; i++) {
        player.x += player.vx * dt; // 4px per tick
        susie.update(dt, undefined, player);
      }

      // Player has moved 48px -> x is 148
      expect(player.x).toBeCloseTo(148, 1);

      // Susie should be trailing 16px behind player along X axis -> (132, 100)
      expect(susie.x).toBeCloseTo(132, 1);
      expect(susie.y).toBeCloseTo(100, 1);
      expect(susie.facing).toBe('RIGHT');
      expect(susie.isMoving).toBe(true);
    });

    it('should maintain queue positioning when leader stops and settles', () => {
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';

      const dt = 0.05;
      for (let i = 0; i < 10; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
      }

      // Leader stops moving
      player.vx = 0;
      player.vy = 0;

      // Update follower for a few frames after stop
      for (let i = 0; i < 5; i++) {
        susie.update(dt, undefined, player);
      }

      expect(susie.isMoving).toBe(false);
      expect(susie.x).toBeCloseTo(player.x - 16, 1);
      expect(susie.y).toBeCloseTo(player.y, 1);
    });

    it('should follow around 90-degree corners along exact path history without cutting corners', () => {
      const dt = 0.05;

      // Phase 1: Player moves East by 32px (from (100, 100) to (132, 100))
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';
      for (let i = 0; i < 8; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
      }

      // Phase 2: Player turns North and moves 32px (from (132, 100) to (132, 68))
      player.vx = 0;
      player.vy = -80;
      player.facing = 'UP';
      for (let i = 0; i < 8; i++) {
        player.y += player.vy * dt;
        susie.update(dt, undefined, player);
      }

      expect(player.x).toBeCloseTo(132, 1);
      expect(player.y).toBeCloseTo(68, 1);

      // Susie is 16px behind player along the path.
      // Since player moved 32px UP from (132, 100), 16px behind player is on the vertical segment:
      // x: 132, y: 68 + 16 = 84
      expect(susie.x).toBeCloseTo(132, 1);
      expect(susie.y).toBeCloseTo(84, 1);
      expect(susie.facing).toBe('UP');
    });

    it('should correctly update facing direction based on path history segment', () => {
      const dt = 0.05;

      // Player moves RIGHT 40px
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';
      for (let i = 0; i < 10; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
      }

      // Player turns DOWN and moves 10px (less than trail distance 16px)
      player.vx = 0;
      player.vy = 80;
      player.facing = 'DOWN';
      for (let i = 0; i < 2; i++) {
        player.y += player.vy * dt; // 8px down
        susie.update(dt, undefined, player);
      }

      // Susie is 16px behind player.
      // Player is 8px down from corner. 16px behind means Susie is 8px to the left of corner!
      // Therefore Susie is still on the horizontal segment and must face RIGHT!
      expect(susie.facing).toBe('RIGHT');

      // Now player moves DOWN another 20px (total 28px down)
      for (let i = 0; i < 5; i++) {
        player.y += player.vy * dt;
        susie.update(dt, undefined, player);
      }

      // Susie has now crossed the corner onto the vertical segment and must face DOWN!
      expect(susie.facing).toBe('DOWN');
    });
  });

  describe('Multi-Follower Conga Line (Susie & Ralsei)', () => {
    it('should support second follower trailing behind first follower', () => {
      const dt = 0.05;
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';

      // Move player 64px to the right (4 tiles)
      for (let i = 0; i < 16; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
        ralsei.update(dt, undefined, susie);
      }

      // Final positions:
      // Player: 100 + 64 = 164
      // Susie: 16px behind player = 148
      // Ralsei: 16px behind Susie = 132
      expect(player.x).toBeCloseTo(164, 1);
      expect(susie.x).toBeCloseTo(148, 1);
      expect(ralsei.x).toBeCloseTo(132, 1);

      expect(susie.facing).toBe('RIGHT');
      expect(ralsei.facing).toBe('RIGHT');
    });

    it('should maintain distinct cornering states across entire party conga line', () => {
      const dt = 0.05;

      // Kris moves East by 32px
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';
      for (let i = 0; i < 8; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
        ralsei.update(dt, undefined, susie);
      }

      // Kris turns South and moves 24px
      player.vx = 0;
      player.vy = 80;
      player.facing = 'DOWN';
      for (let i = 0; i < 6; i++) {
        player.y += player.vy * dt;
        susie.update(dt, undefined, player);
        ralsei.update(dt, undefined, susie);
      }

      // At this point:
      // Kris has moved 24px South from corner (132, 100) -> (132, 124)
      // Susie is 16px behind Kris -> (132, 108), facing DOWN
      // Ralsei is 16px behind Susie -> 8px West of corner -> (124, 100), facing RIGHT!
      expect(susie.facing).toBe('DOWN');
      expect(ralsei.facing).toBe('RIGHT');
      expect(ralsei.y).toBeCloseTo(100, 1);
      expect(ralsei.x).toBeCloseTo(124, 1);
    });

    it('should support second follower following Kris directly with double trailDistance', () => {
      const directRalsei = new Follower({
        name: 'RALSEI',
        x: 100,
        y: 100,
        leader: player,
        trailDistance: 32,
      });

      const dt = 0.05;
      player.vx = 80;
      player.vy = 0;
      player.facing = 'RIGHT';

      for (let i = 0; i < 16; i++) {
        player.x += player.vx * dt;
        susie.update(dt, undefined, player);
        directRalsei.update(dt, undefined, player);
      }

      expect(player.x).toBeCloseTo(164, 1);
      expect(susie.x).toBeCloseTo(148, 1);
      expect(directRalsei.x).toBeCloseTo(132, 1);
    });
  });

  describe('Visual Rendering', () => {
    let renderer: Renderer;
    let mockCtx: {
      fillRect: ReturnType<typeof vi.fn>;
      strokeRect: ReturnType<typeof vi.fn>;
      fillText: ReturnType<typeof vi.fn>;
      drawImage: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      const canvas = document.createElement('canvas');
      mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
      renderer = new Renderer(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    });

    it('should render Susie in all 4 directions without throwing', () => {
      const directions = ['DOWN', 'UP', 'LEFT', 'RIGHT'] as const;
      directions.forEach((dir) => {
        susie.facing = dir;
        expect(() => susie.render(renderer)).not.toThrow();
      });
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should render Ralsei in all 4 directions and walking cycles without throwing', () => {
      const directions = ['DOWN', 'UP', 'LEFT', 'RIGHT'] as const;
      directions.forEach((dir) => {
        ralsei.facing = dir;
        ralsei.isMoving = true;
        expect(() => ralsei.render(renderer)).not.toThrow();
      });
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});

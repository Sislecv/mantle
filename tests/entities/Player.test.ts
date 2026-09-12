import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../src/entities/Player';
import { InputManager } from '../../src/core/InputManager';
import { Tilemap } from '../../src/map/Tilemap';
import { DestructibleObstacle } from '../../src/map/DestructibleObstacle';
import { Renderer } from '../../src/core/Renderer';
import { TILES, createTile } from '../../src/map/Tile';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/core/Constants';

describe('Player (HERO_SWORD State Machine)', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player({ x: 100, y: 100 });
  });

  describe('Initial State & Defaults', () => {
    it('should initialize with UNARMED state and default stats', () => {
      expect(player.state).toBe('UNARMED');
      expect(player.hasSword).toBe(false);
      expect(player.lv).toBe(1);
      expect(player.hp).toBe(20);
      expect(player.maxHp).toBe(20);
      expect(player.exp).toBe(0);
      expect(player.width).toBe(16);
      expect(player.height).toBe(16);
      expect(player.facing).toBe('DOWN');
      expect(player.attackHitbox).toBeNull();
      expect(player.attackFrame).toBe(0);
      expect(player.invulnerableTime).toBe(0);
      expect(player.pullTimer).toBe(0);
    });

    it('should return correct bounding box', () => {
      expect(player.getBounds()).toEqual({
        x: 100,
        y: 100,
        width: 16,
        height: 16,
      });
    });
  });

  describe('UNARMED restrictions', () => {
    it('should not allow attack without sword', () => {
      const attacked = player.attack();
      expect(attacked).toBe(false);
      expect(player.state).toBe('UNARMED');
      expect(player.attackHitbox).toBeNull();
    });
  });

  describe('Sword Pull Mechanic (pullSword)', () => {
    it('should enter SWORD_PULL state and lock movement', () => {
      player.vx = 50;
      player.vy = 50;
      player.pullSword(1.0);

      expect(player.state).toBe('SWORD_PULL');
      expect(player.pullTimer).toBe(1.0);
      expect(player.vx).toBe(0);
      expect(player.vy).toBe(0);
      expect(player.hasSword).toBe(false);
    });

    it('should transition to ARMED with hasSword = true after pull duration completes', () => {
      player.pullSword(1.0);

      // Tick 0.6 seconds - still pulling
      player.update(0.6);
      expect(player.state).toBe('SWORD_PULL');
      expect(player.hasSword).toBe(false);
      expect(player.pullTimer).toBeCloseTo(0.4, 4);

      // Tick remaining 0.4 seconds - finishes pull
      player.update(0.4);
      expect(player.state).toBe('ARMED');
      expect(player.hasSword).toBe(true);
      expect(player.pullTimer).toBe(0);
    });

    it('should ignore subsequent pullSword calls if already armed', () => {
      player.pullSword(0.1);
      player.update(0.1);
      expect(player.hasSword).toBe(true);
      expect(player.state).toBe('ARMED');

      player.pullSword(1.0);
      expect(player.state).toBe('ARMED');
      expect(player.pullTimer).toBe(0);
    });
  });

  describe('5-Frame Attack Mechanic', () => {
    beforeEach(() => {
      // Arm the player
      player.pullSword(0.1);
      player.update(0.1);
    });

    it('should enter ATTACKING state and generate directional attack hitbox', () => {
      player.facing = 'RIGHT';
      const success = player.attack();

      expect(success).toBe(true);
      expect(player.state).toBe('ATTACKING');
      expect(player.attackHitbox).not.toBeNull();
      expect(player.attackHitbox?.x).toBe(player.x + player.width);
      expect(player.attackHitbox?.y).toBe(player.y);
      expect(player.attackHitbox?.width).toBe(16);
      expect(player.attackHitbox?.height).toBe(16);
      expect(player.attackHitbox?.owner).toBe('PLAYER');
      expect(player.attackHitbox?.knockback.x).toBeGreaterThan(0);
    });

    it('should place attack hitbox correctly for all 4 facing directions', () => {
      // UP
      player.facing = 'UP';
      player.attack();
      expect(player.attackHitbox?.x).toBe(player.x);
      expect(player.attackHitbox?.y).toBe(player.y - 16);
      expect(player.attackHitbox?.knockback).toEqual({ x: 0, y: -1 });

      // Reset to ARMED
      player.update(0.3);

      // DOWN
      player.facing = 'DOWN';
      player.attack();
      expect(player.attackHitbox?.x).toBe(player.x);
      expect(player.attackHitbox?.y).toBe(player.y + player.height);
      expect(player.attackHitbox?.knockback).toEqual({ x: 0, y: 1 });

      player.update(0.3);

      // LEFT
      player.facing = 'LEFT';
      player.attack();
      expect(player.attackHitbox?.x).toBe(player.x - 16);
      expect(player.attackHitbox?.y).toBe(player.y);
      expect(player.attackHitbox?.knockback).toEqual({ x: -1, y: 0 });

      player.update(0.3);

      // RIGHT
      player.facing = 'RIGHT';
      player.attack();
      expect(player.attackHitbox?.x).toBe(player.x + player.width);
      expect(player.attackHitbox?.y).toBe(player.y);
      expect(player.attackHitbox?.knockback).toEqual({ x: 1, y: 0 });
    });

    it('should cycle through 5 attack frames (0, 1, 2, 3, 4) and return to ARMED', () => {
      player.attack(); // duration = 0.25s (250ms), 0.05s per frame
      expect(player.state).toBe('ATTACKING');
      expect(player.attackFrame).toBe(0);

      player.update(0.05);
      expect(player.attackFrame).toBe(1);

      player.update(0.05);
      expect(player.attackFrame).toBe(2);

      player.update(0.05);
      expect(player.attackFrame).toBe(3);

      player.update(0.05);
      expect(player.attackFrame).toBe(4);

      // Final tick concludes attack
      player.update(0.06);
      expect(player.state).toBe('ARMED');
      expect(player.attackFrame).toBe(0);
      expect(player.attackHitbox).toBeNull();
    });

    it('should prevent attacking again while already attacking', () => {
      player.attack();
      expect(player.state).toBe('ATTACKING');

      const secondAttack = player.attack();
      expect(secondAttack).toBe(false);
      expect(player.state).toBe('ATTACKING');
    });
  });

  describe('Destructible Obstacle Interaction', () => {
    let tree: DestructibleObstacle;
    let gate: DestructibleObstacle;
    let boulder: DestructibleObstacle;

    beforeEach(() => {
      player.x = 32;
      player.y = 32;
      player.facing = 'RIGHT';
      player.pullSword(0.05);
      player.update(0.05);

      // Tree placed directly right of player at (3, 2) in grid -> pixel (48, 32)
      tree = new DestructibleObstacle({
        id: 'test_tree',
        gridX: 3,
        gridY: 2,
        type: 'TREE', // requires sword, LV 2
      });

      // Gate placed directly right of player at (48, 32)
      gate = new DestructibleObstacle({
        id: 'test_gate',
        gridX: 3,
        gridY: 2,
        type: 'WOOD_GATE', // requires sword, LV 1
      });

      boulder = new DestructibleObstacle({
        id: 'test_boulder',
        gridX: 3,
        gridY: 2,
        type: 'BOULDER', // requires sword, LV 3, hp 2
      });
    });

    it('should fail to cut LV 2 tree when player is LV 1 with sword', () => {
      player.attack();
      const result = player.hitObstacle(tree);

      expect(result).not.toBeNull();
      expect(result?.destroyed).toBe(false);
      expect(result?.damageDealt).toBe(0);
      expect(tree.isDestroyed).toBe(false);
    });

    it('should cut and destroy LV 2 tree when player has leveled up to LV 2', () => {
      player.gainExp(100); // Level up to LV 2
      expect(player.lv).toBe(2);

      player.attack();
      const result = player.hitObstacle(tree);

      expect(result).not.toBeNull();
      expect(result?.destroyed).toBe(true);
      expect(result?.damageDealt).toBe(1);
      expect(tree.isDestroyed).toBe(true);
      expect(tree.isSolid()).toBe(false);
    });

    it('should cut wood gate in 1 hit at LV 1 with sword', () => {
      player.attack();
      const result = player.hitObstacle(gate);

      expect(result).not.toBeNull();
      expect(result?.destroyed).toBe(true);
      expect(gate.isDestroyed).toBe(true);
    });

    it('should require 2 hits for LV 3 player to break boulder', () => {
      player.gainExp(200); // Level up to LV 3
      expect(player.lv).toBe(3);

      // First attack
      player.attack();
      const hit1 = player.hitObstacle(boulder);
      expect(hit1?.destroyed).toBe(false);
      expect(boulder.hp).toBe(1);
      expect(boulder.isDestroyed).toBe(false);

      player.update(0.3); // Reset attack

      // Second attack
      player.attack();
      const hit2 = player.hitObstacle(boulder);
      expect(hit2?.destroyed).toBe(true);
      expect(boulder.hp).toBe(0);
      expect(boulder.isDestroyed).toBe(true);
    });

    it('should only damage an obstacle once per attack swing across multiple consecutive update frames', () => {
      player.gainExp(200); // Level up to LV 3
      expect(player.lv).toBe(3);

      // Trigger first attack
      player.attack();
      expect(player.state).toBe('ATTACKING');

      // Update 10 consecutive frames during this single swing
      for (let f = 0; f < 10; f++) {
        player.update(0.016, undefined, undefined, [boulder]);
      }

      // Boulder should only have taken 1 damage, remaining at 1 HP and intact
      expect(boulder.hp).toBe(1);
      expect(boulder.isDestroyed).toBe(false);

      // Finish the rest of the attack duration to return to ARMED
      player.update(0.2);
      expect(player.state).toBe('ARMED');

      // Trigger second separate attack
      player.attack();
      for (let f = 0; f < 10; f++) {
        player.update(0.016, undefined, undefined, [boulder]);
      }

      // Now boulder has received its second hit and is destroyed!
      expect(boulder.hp).toBe(0);
      expect(boulder.isDestroyed).toBe(true);
    });

    it('should return null when obstacle is out of attack range', () => {
      const farTree = new DestructibleObstacle({
        id: 'far_tree',
        gridX: 10,
        gridY: 10,
        type: 'TREE',
      });

      player.attack();
      const result = player.hitObstacle(farTree);
      expect(result).toBeNull();
      expect(farTree.isDestroyed).toBe(false);
    });
  });

  describe('Damage, Knockback, i-Frames & Defeat', () => {
    it('should reduce HP, apply knockback, and enter HURT state with i-frames', () => {
      player.takeDamage(6, 90, 100);

      expect(player.hp).toBe(14);
      expect(player.state).toBe('HURT');
      expect(player.invulnerableTime).toBeGreaterThan(0);
      // Knockback should push player away from damage source (fromX=90 is to the left of player.x=100)
      expect(player.vx).toBeGreaterThan(0);
    });

    it('should ignore incoming damage during invulnerability frames', () => {
      player.takeDamage(5);
      expect(player.hp).toBe(15);
      expect(player.invulnerableTime).toBeGreaterThan(0);

      // Second hit while invulnerable
      player.takeDamage(10);
      expect(player.hp).toBe(15); // Still 15!
    });

    it('should recover from HURT state to previous armed state when stun expires', () => {
      player.pullSword(0.01);
      player.update(0.01);
      expect(player.state).toBe('ARMED');

      player.takeDamage(4);
      expect(player.state).toBe('HURT');

      // Update past hurt stun duration
      player.update(0.4);
      expect(player.state).toBe('ARMED');
    });

    it('should enter DEFEAT state when HP reaches 0', () => {
      player.takeDamage(20);

      expect(player.hp).toBe(0);
      expect(player.state).toBe('DEFEAT');
      expect(player.vx).toBe(0);
      expect(player.vy).toBe(0);
    });

    it('should disallow attacking and movement when in DEFEAT state', () => {
      player.pullSword(0.01);
      player.update(0.01);
      player.takeDamage(25);
      expect(player.state).toBe('DEFEAT');

      const attacked = player.attack();
      expect(attacked).toBe(false);

      player.update(0.1);
      expect(player.vx).toBe(0);
      expect(player.vy).toBe(0);
    });
  });

  describe('Leveling & EXP System', () => {
    it('should accumulate EXP and level up at threshold', () => {
      const step1 = player.gainExp(40);
      expect(step1.leveledUp).toBe(false);
      expect(step1.newLv).toBe(1);
      expect(player.exp).toBe(40);
      expect(player.lv).toBe(1);

      // Reaching 100 EXP triggers LV 2
      const step2 = player.gainExp(60);
      expect(step2.leveledUp).toBe(true);
      expect(step2.newLv).toBe(2);
      expect(player.lv).toBe(2);
      expect(player.maxHp).toBeGreaterThan(20);
    });

    it('should handle multi-level exp gain', () => {
      const step = player.gainExp(250);
      expect(step.leveledUp).toBe(true);
      expect(step.newLv).toBe(3);
      expect(player.lv).toBe(3);
    });
  });

  describe('Movement & Collision Handling', () => {
    it('should have 85 px/s base walk speed in UNARMED state and 70 px/s in ARMED state', () => {
      const unarmedPlayer = new Player();
      expect(unarmedPlayer.state).toBe('UNARMED');
      expect(unarmedPlayer.speed).toBe(85);

      unarmedPlayer.pullSword(0.01);
      unarmedPlayer.update(0.01);
      expect(unarmedPlayer.state).toBe('ARMED');
      expect(unarmedPlayer.speed).toBe(70);
    });

    it('should update movement and facing from InputManager', () => {
      const input = new InputManager(null);
      // Simulate holding Right
      input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));

      player.update(0.1, undefined, input);
      expect(player.facing).toBe('RIGHT');
      expect(player.vx).toBeGreaterThan(0);
      expect(player.x).toBeGreaterThan(100);
    });

    it('should normalize diagonal movement velocity', () => {
      const input = new InputManager(null);
      input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyS', key: 's' }));

      player.update(0.1, undefined, input);
      const totalSpeed = Math.hypot(player.vx, player.vy);
      expect(totalSpeed).toBeCloseTo(player.speed, 1);
    });

    it('should increase speed when sprint key is held', () => {
      const normalInput = new InputManager(null);
      normalInput.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      player.update(0.1, undefined, normalInput);
      const normalVx = player.vx;

      const sprintPlayer = new Player({ x: 100, y: 100 });
      const sprintInput = new InputManager(null);
      sprintInput.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
      sprintInput.handleKeyDown(new KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift' }));
      sprintPlayer.update(0.1, undefined, sprintInput);

      expect(sprintPlayer.vx).toBeGreaterThan(normalVx);
    });

    it('should stop at solid Tilemap boundaries', () => {
      // Create a 5x5 tilemap where column 1 is empty and column 2 is solid cliff wall
      const map = new Tilemap(5, 5, TILES.FLOOR_CLIFF);
      for (let y = 0; y < 5; y++) {
        map.setTile(2, y, createTile('WALL_CLIFF'));
      }

      // Player at pixel (16, 16) -> grid (1, 1). Facing right towards solid wall at grid X = 2 (pixel 32)
      const testPlayer = new Player({ x: 16, y: 16 });
      const input = new InputManager(null);
      input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));

      // Update several frames moving right
      for (let i = 0; i < 10; i++) {
        testPlayer.update(0.05, map, input);
      }

      // Player right edge should not penetrate solid wall at pixel 32
      expect(testPlayer.x + testPlayer.width).toBeLessThanOrEqual(32);
    });

    it('should block movement against intact obstacle and allow through once destroyed', () => {
      const obstacle = new DestructibleObstacle({
        id: 'blocking_gate',
        gridX: 2,
        gridY: 1,
        type: 'WOOD_GATE',
      });

      const testPlayer = new Player({ x: 16, y: 16 });
      const input = new InputManager(null);
      input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));

      // Move right towards obstacle at (32, 16)
      for (let i = 0; i < 10; i++) {
        testPlayer.update(0.05, undefined, input, [obstacle]);
      }
      expect(testPlayer.x + testPlayer.width).toBeLessThanOrEqual(32);

      // Now destroy the obstacle
      obstacle.hit(1, 1, true);
      expect(obstacle.isDestroyed).toBe(true);

      // Move right again
      for (let i = 0; i < 10; i++) {
        testPlayer.update(0.05, undefined, input, [obstacle]);
      }
      expect(testPlayer.x).toBeGreaterThan(16);
    });
  });

  describe('Rendering', () => {
    it('should render in all player states without errors', () => {
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
        // 1. UNARMED
        player.render(renderer);

        // 2. SWORD_PULL
        player.pullSword(1.0);
        player.render(renderer);

        // 3. ARMED
        player.update(1.0);
        player.render(renderer);

        // 4. ATTACKING
        player.attack();
        player.render(renderer);

        // 5. HURT
        player.takeDamage(5);
        player.render(renderer);

        // 6. DEFEAT
        player.takeDamage(50);
        player.render(renderer);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});

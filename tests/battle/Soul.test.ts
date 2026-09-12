import { describe, it, expect, beforeEach } from 'vitest';
import { Soul } from '../../src/battle/Soul';
import { BattleBox } from '../../src/battle/BattleBox';
import { InputManager } from '../../src/core/InputManager';

describe('Soul', () => {
  let soul: Soul;
  let box: BattleBox;
  let input: InputManager;

  beforeEach(() => {
    // Standard battle box: x: 68, y: 120, width: 120, height: 70
    box = new BattleBox(68, 120, 120, 70);
    soul = new Soul(128, 155, 8); // centered at 128, 155 with size 8
    input = new InputManager(null);
  });

  it('initializes with correct position, size, and defaults', () => {
    expect(soul.x).toBe(128);
    expect(soul.y).toBe(155);
    expect(soul.size).toBe(8);
    expect(soul.iFrames).toBe(0);
    expect(soul.isInvulnerable).toBe(false);
  });

  it('moves horizontally and vertically based on InputManager', () => {
    // Mock input pressing right
    const eventRight = new KeyboardEvent('keydown', { code: 'ArrowRight' });
    input.handleKeyDown(eventRight);

    const startX = soul.x;
    soul.update(0.1, input, box);

    expect(soul.x).toBeGreaterThan(startX);
    expect(soul.y).toBe(155);

    // Release right, press down
    input.handleKeyUp(eventRight);
    const eventDown = new KeyboardEvent('keydown', { code: 'ArrowDown' });
    input.handleKeyDown(eventDown);

    const currentX = soul.x;
    const startY = soul.y;
    soul.update(0.1, input, box);

    expect(soul.x).toBe(currentX);
    expect(soul.y).toBeGreaterThan(startY);
  });

  it('normalizes diagonal movement speed', () => {
    // Single axis movement distance with dt=0.2 to avoid boundary clamping
    const eventRight = new KeyboardEvent('keydown', { code: 'ArrowRight' });
    input.handleKeyDown(eventRight);
    soul.update(0.2, input, box);
    const singleAxisDistance = soul.x - 128;

    // Reset soul and press both Right and Down
    soul.setPosition(128, 155);
    const eventDown = new KeyboardEvent('keydown', { code: 'ArrowDown' });
    input.handleKeyDown(eventDown);

    soul.update(0.2, input, box);
    const dx = soul.x - 128;
    const dy = soul.y - 155;
    const totalDistance = Math.hypot(dx, dy);

    expect(totalDistance).toBeCloseTo(singleAxisDistance, 1);
    expect(dx).toBeCloseTo(dy, 1);
  });

  it('sprints when cancel key is held down', () => {
    // Normal speed
    const eventRight = new KeyboardEvent('keydown', { code: 'ArrowRight' });
    input.handleKeyDown(eventRight);
    soul.update(0.1, input, box);
    const normalDistance = soul.x - 128;

    // Reset with Cancel (X/Shift) held
    soul.setPosition(128, 155);
    const eventCancel = new KeyboardEvent('keydown', { code: 'KeyX' });
    input.handleKeyDown(eventCancel);

    soul.update(0.1, input, box);
    const sprintDistance = soul.x - 128;

    expect(sprintDistance).toBeGreaterThan(normalDistance);
  });

  it('clamps strictly within BattleBox boundaries', () => {
    // Box bounds: x: 68, y: 120, w: 120, h: 70
    // Box border is 2px, so inner area is [70, 186] horizontally and [122, 188] vertically
    // For a soul with size 8 (halfSize 4), center bounds are [74, 182] and [126, 184]
    
    // Attempt to move way past left wall
    soul.setPosition(0, 155);
    soul.clampToBounds(box);
    expect(soul.x).toBeGreaterThanOrEqual(68 + 2 + soul.size / 2);

    // Attempt to move way past right wall
    soul.setPosition(300, 155);
    soul.clampToBounds(box);
    expect(soul.x).toBeLessThanOrEqual(68 + 120 - 2 - soul.size / 2);

    // Attempt to move way past top wall
    soul.setPosition(128, 0);
    soul.clampToBounds(box);
    expect(soul.y).toBeGreaterThanOrEqual(120 + 2 + soul.size / 2);

    // Attempt to move way past bottom wall
    soul.setPosition(128, 300);
    soul.clampToBounds(box);
    expect(soul.y).toBeLessThanOrEqual(120 + 70 - 2 - soul.size / 2);
  });

  it('manages damage, iFrames, and invulnerability state', () => {
    // Initial hit
    const hit1 = soul.takeDamage(1.0);
    expect(hit1).toBe(true);
    expect(soul.iFrames).toBe(1.0);
    expect(soul.isInvulnerable).toBe(true);

    // Attempt hit during iFrames
    const hit2 = soul.takeDamage(1.0);
    expect(hit2).toBe(false);
    expect(soul.iFrames).toBe(1.0);

    // Update time partially
    soul.update(0.4, input, box);
    expect(soul.iFrames).toBeCloseTo(0.6, 2);
    expect(soul.isInvulnerable).toBe(true);

    // Update time past remaining iFrames
    soul.update(0.7, input, box);
    expect(soul.iFrames).toBe(0);
    expect(soul.isInvulnerable).toBe(false);

    // Now can take damage again
    const hit3 = soul.takeDamage(0.8);
    expect(hit3).toBe(true);
    expect(soul.iFrames).toBe(0.8);
  });

  it('returns correct bounding box and center point for collision detection', () => {
    soul.setPosition(100, 140);
    const bounds = soul.getBounds();
    expect(bounds.x).toBe(96);
    expect(bounds.y).toBe(136);
    expect(bounds.width).toBe(8);
    expect(bounds.height).toBe(8);

    const center = soul.getCenter();
    expect(center.x).toBe(100);
    expect(center.y).toBe(140);
  });
});

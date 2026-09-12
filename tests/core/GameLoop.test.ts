import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../../src/core/GameLoop';

describe('GameLoop', () => {
  let loop: GameLoop;

  beforeEach(() => {
    loop = new GameLoop();
  });

  it('should initialize with isRunning as false', () => {
    expect(loop.isRunning).toBe(false);
  });

  it('should toggle isRunning when start() and stop() are called', () => {
    loop.start();
    expect(loop.isRunning).toBe(true);

    loop.stop();
    expect(loop.isRunning).toBe(false);
  });

  it('should invoke update and render callbacks during step/tick', () => {
    const updateSpy = vi.fn();
    const renderSpy = vi.fn();

    loop.setUpdateCallback(updateSpy);
    loop.setRenderCallback(renderSpy);

    loop.start();

    // Call manual tick with simulated timestamps
    loop.tick(1000);
    loop.tick(1016); // ~16ms delta

    expect(updateSpy).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();

    const dt = updateSpy.mock.calls[0][0];
    expect(typeof dt).toBe('number');
    expect(dt).toBeGreaterThanOrEqual(0);
  });

  it('should not invoke callbacks if loop is stopped', () => {
    const updateSpy = vi.fn();
    const renderSpy = vi.fn();

    loop.setUpdateCallback(updateSpy);
    loop.setRenderCallback(renderSpy);

    loop.tick(1000);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('should clamp delta time to avoid large jumps after tab pause', () => {
    const updateSpy = vi.fn();
    loop.setUpdateCallback(updateSpy);

    loop.start();
    loop.tick(1000);
    // Simulate a 5-second tab pause
    loop.tick(6000);

    // Delta time should be clamped (e.g. max 0.25s)
    const dt = updateSpy.mock.calls[1][0];
    expect(dt).toBeLessThanOrEqual(0.25);
    expect(dt).toBeGreaterThan(0);
  });
});

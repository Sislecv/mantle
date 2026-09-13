import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../../src/core/InputManager';

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
  });

  afterEach(() => {
    input.reset();
  });

  it('should detect key down for directional inputs (arrows and WASD)', () => {
    expect(input.isDown('up')).toBe(false);
    
    // Simulate ArrowUp keydown
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    expect(input.isDown('up')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', key: 'ArrowUp' }));
    expect(input.isDown('up')).toBe(false);

    // Simulate KeyW keydown
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }));
    expect(input.isDown('up')).toBe(true);

    // Down, Left, Right
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's' }));
    expect(input.isDown('down')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }));
    expect(input.isDown('left')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }));
    expect(input.isDown('right')).toBe(true);
  });

  it('should support action mappings (Z, J, Enter)', () => {
    expect(input.isDown('action')).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' }));
    expect(input.isDown('action')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z' }));
    expect(input.isDown('action')).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j' }));
    expect(input.isDown('action')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', key: 'j' }));
    expect(input.isDown('action')).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
    expect(input.isDown('action')).toBe(true);
  });

  it('should support cancel/sprint mappings (X, K) and menu mappings (C, L)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', key: 'x' }));
    expect(input.isDown('cancel')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX', key: 'x' }));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', key: 'k' }));
    expect(input.isDown('cancel')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' }));
    expect(input.isDown('menu')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC', key: 'c' }));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', key: 'l' }));
    expect(input.isDown('menu')).toBe(true);
  });

  it('should correctly report isJustPressed and update across frames', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' }));
    
    // Just pressed should be true on first frame
    expect(input.isJustPressed('action')).toBe(true);
    expect(input.isDown('action')).toBe(true);

    // After updating frame state, isJustPressed becomes false, but isDown remains true
    input.update();
    expect(input.isJustPressed('action')).toBe(false);
    expect(input.isDown('action')).toBe(true);

    // When key is released, both are false
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z' }));
    input.update();
    expect(input.isJustPressed('action')).toBe(false);
    expect(input.isDown('action')).toBe(false);
  });

  it('should clear all states when reset() is called', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    expect(input.isDown('action')).toBe(true);
    expect(input.isDown('up')).toBe(true);

    input.reset();
    expect(input.isDown('action')).toBe(false);
    expect(input.isDown('up')).toBe(false);
    expect(input.isJustPressed('action')).toBe(false);
    expect(input.isJustPressed('up')).toBe(false);
  });

  it('should reset input state when window loses focus (blur event)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' }));
    expect(input.isDown('action')).toBe(true);

    window.dispatchEvent(new Event('blur'));
    expect(input.isDown('action')).toBe(false);
    expect(input.isJustPressed('action')).toBe(false);
  });

  it('should seamlessly process virtual gamepad inputs', () => {
    expect(input.isDown('action')).toBe(false);
    expect(input.isJustPressed('action')).toBe(false);

    // Virtual action down
    input.setVirtualKey('action', true);
    expect(input.isDown('action')).toBe(true);
    expect(input.isJustPressed('action')).toBe(true);

    // Next frame update
    input.update();
    expect(input.isDown('action')).toBe(true);
    expect(input.isJustPressed('action')).toBe(false);

    // Virtual action released
    input.setVirtualKey('action', false);
    expect(input.isDown('action')).toBe(false);
  });
});

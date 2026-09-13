import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from '../../src/core/InputManager';
import { VirtualGamepad } from '../../src/ui/VirtualGamepad';

describe('VirtualGamepad', () => {
  let input: InputManager;
  let gamepad: VirtualGamepad;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = new InputManager();
    gamepad = new VirtualGamepad(input);
  });

  it('initializes and creates DOM elements in document body', () => {
    gamepad.mount(document.body);
    const container = document.querySelector('.virtual-gamepad-container');
    expect(container).not.toBeNull();

    const dpad = document.querySelector('.dpad-container');
    expect(dpad).not.toBeNull();

    const btnA = document.querySelector('.vbtn-a');
    expect(btnA).not.toBeNull();

    const btnB = document.querySelector('.vbtn-b');
    expect(btnB).not.toBeNull();
  });

  it('triggers input manager when virtual buttons are pressed and released', () => {
    gamepad.mount(document.body);
    const btnA = document.querySelector('.vbtn-a') as HTMLElement;

    btnA.dispatchEvent(new Event('touchstart'));
    expect(input.isDown('action')).toBe(true);

    btnA.dispatchEvent(new Event('touchend'));
    expect(input.isDown('action')).toBe(false);
  });

  it('correctly handles unmounting and cleanup', () => {
    gamepad.mount(document.body);
    gamepad.unmount();
    const container = document.querySelector('.virtual-gamepad-container');
    expect(container).toBeNull();
  });
});

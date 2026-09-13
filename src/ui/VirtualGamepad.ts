/**
 * VirtualGamepad.ts
 * Authentic retro NES / "Odd Controller" style on-screen touch controls for mobile devices.
 * Integrates directly with InputManager to handle D-Pad movement and A/B/MENU actions with haptics.
 */

import { InputManager } from '../core/InputManager';

export class VirtualGamepad {
  private input: InputManager;
  private container: HTMLElement | null = null;
  private boundElements: { el: HTMLElement; event: string; fn: EventListener }[] = [];

  constructor(input: InputManager) {
    this.input = input;
  }

  /**
   * Mounts the gamepad into the designated DOM parent.
   */
  public mount(parent: HTMLElement): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'virtual-gamepad-container';
    this.container.innerHTML = `
      <div class="dpad-container">
        <button class="dpad-btn dpad-up" data-action="up" aria-label="Up">▲</button>
        <button class="dpad-btn dpad-left" data-action="left" aria-label="Left">◀</button>
        <div class="dpad-center"></div>
        <button class="dpad-btn dpad-right" data-action="right" aria-label="Right">▶</button>
        <button class="dpad-btn dpad-down" data-action="down" aria-label="Down">▼</button>
      </div>

      <div class="middle-buttons-container">
        <button class="vbtn-menu" data-action="menu" aria-label="Menu">MENU</button>
      </div>

      <div class="action-buttons-container">
        <button class="vbtn vbtn-b" data-action="cancel" aria-label="B / Cancel">B</button>
        <button class="vbtn vbtn-a" data-action="action" aria-label="A / Attack">A</button>
      </div>
    `;

    parent.appendChild(this.container);
    this.bindEvents();
  }

  /**
   * Unmounts the gamepad and cleans up event listeners.
   */
  public unmount(): void {
    if (!this.container) return;

    for (const b of this.boundElements) {
      b.el.removeEventListener(b.event, b.fn);
    }
    this.boundElements = [];

    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  private bindEvents(): void {
    if (!this.container) return;

    const buttons = this.container.querySelectorAll<HTMLElement>('[data-action]');

    buttons.forEach((btn) => {
      const action = btn.getAttribute('data-action');
      if (!action) return;

      const triggerDown = (e: Event) => {
        if (e.cancelable) e.preventDefault();
        btn.classList.add('active');
        this.input.setVirtualKey(action, true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore unsupported haptic permissions
          }
        }
      };

      const triggerUp = (e: Event) => {
        if (e.cancelable) e.preventDefault();
        btn.classList.remove('active');
        this.input.setVirtualKey(action, false);
      };

      const events: [string, (e: Event) => void][] = [
        ['touchstart', triggerDown],
        ['touchend', triggerUp],
        ['touchcancel', triggerUp],
        ['mousedown', triggerDown],
        ['mouseup', triggerUp],
        ['mouseleave', triggerUp],
      ];

      for (const [evtName, handler] of events) {
        btn.addEventListener(evtName, handler as EventListener, { passive: false });
        this.boundElements.push({ el: btn, event: evtName, fn: handler as EventListener });
      }
    });
  }
}

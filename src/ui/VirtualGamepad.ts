/**
 * VirtualGamepad.ts
 * Authentic retro NES / "Odd Controller" style on-screen touch controls for mobile devices.
 * Integrates directly with InputManager to handle D-Pad movement and A/B/MENU actions with haptics.
 */

import { InputManager } from '../core/InputManager';
import { SaveManager } from '../core/SaveManager';
import { Chapter1Story } from '../scenes/Chapter1Story';
import { ChiptuneSynth } from '../audio/ChiptuneSynth';

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
      <div class="gamepad-top-toolbar">
        <div class="toolbar-group">
          <button class="top-util-btn" data-cmd="save" title="Save game to browser">💾 SAVE</button>
          <button class="top-util-btn" data-cmd="load" title="Load game from browser">📂 LOAD</button>
          <button class="top-util-btn" data-cmd="export" title="Export save to JSON file">📥 EXPORT</button>
          <button class="top-util-btn" data-cmd="import" title="Upload save from JSON file">📤 IMPORT</button>
        </div>
        <div class="toolbar-group">
          <button class="top-util-btn" data-cmd="restart" title="Restart chapter">↺ RESTART</button>
          <button class="top-util-btn" data-cmd="sound" title="Toggle Sound">🔊 SOUND</button>
          <button class="top-util-btn" data-cmd="fullscreen" title="Toggle Fullscreen">⛶ FULLSCREEN</button>
        </div>
        <input type="file" id="gamepad-save-file-input" accept=".json" style="display:none" />
      </div>

      <div class="gamepad-main-row">
        <!-- Left 8-Bit D-PAD -->
        <div class="dpad-container">
          <button class="dpad-btn dpad-up" data-action="up" aria-label="Up">▲</button>
          <button class="dpad-btn dpad-left" data-action="left" aria-label="Left">◀</button>
          <div class="dpad-center"></div>
          <button class="dpad-btn dpad-right" data-action="right" aria-label="Right">▶</button>
          <button class="dpad-btn dpad-down" data-action="down" aria-label="Down">▼</button>
        </div>

        <!-- Center Menu Button -->
        <div class="middle-buttons-container">
          <button class="vbtn-menu vbtn-c" data-action="menu" aria-label="Menu (C)">
            <span class="vbtn-main-label">C</span>
            <span class="vbtn-sub-label">MENU</span>
          </button>
        </div>

        <!-- Right Deltarune Action Cluster (Z: Action/Attack, X: Run/Cancel) -->
        <div class="action-buttons-container">
          <button class="vbtn vbtn-b vbtn-x" data-action="cancel" aria-label="X / Run / Cancel">
            <span class="vbtn-main-label">X</span>
            <span class="vbtn-sub-label">RUN</span>
          </button>
          <button class="vbtn vbtn-a vbtn-z" data-action="action" aria-label="Z / Attack / Confirm">
            <span class="vbtn-main-label">Z</span>
            <span class="vbtn-sub-label">ACT</span>
          </button>
        </div>
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

    // Command buttons (save, load, export, import, restart, sound, fullscreen)
    const fileInput = this.container.querySelector<HTMLInputElement>('#gamepad-save-file-input');
    if (fileInput) {
      const fileChangeHandler = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const app = (window as unknown as { __mantleApp?: { story: Chapter1Story; synth: ChiptuneSynth } }).__mantleApp;
          if (app) {
            const ok = await SaveManager.importSaveFromFile(file, app.story);
            app.story.showNotification(ok ? 'SAVE IMPORTED!' : 'INVALID SAVE FILE');
            app.synth.playSfx(ok ? 'CONFIRM' : 'HURT');
          }
        }
        target.value = '';
      };
      fileInput.addEventListener('change', fileChangeHandler);
      this.boundElements.push({ el: fileInput, event: 'change', fn: fileChangeHandler as EventListener });
    }

    const cmdButtons = this.container.querySelectorAll<HTMLElement>('[data-cmd]');
    cmdButtons.forEach((btn) => {
      const cmd = btn.getAttribute('data-cmd');
      const clickHandler = (e: Event) => {
        e.preventDefault();
        const app = (window as unknown as { __mantleApp?: { story: Chapter1Story; synth: ChiptuneSynth } }).__mantleApp;
        if (!app) return;

        if (cmd === 'save') {
          const ok = SaveManager.saveToLocal(app.story);
          app.story.showNotification(ok ? 'PROGRESS SAVED!' : 'SAVE FAILED');
          app.synth.playSfx('SELECT');
        } else if (cmd === 'load') {
          const ok = SaveManager.loadFromLocal(app.story);
          app.story.showNotification(ok ? 'PROGRESS LOADED!' : 'NO SAVE FOUND');
          app.synth.playSfx(ok ? 'CONFIRM' : 'HURT');
        } else if (cmd === 'export') {
          SaveManager.exportSaveToFile(app.story);
          app.story.showNotification('FILE EXPORTED!');
          app.synth.playSfx('SELECT');
        } else if (cmd === 'import') {
          fileInput?.click();
        } else if (cmd === 'restart') {
          app.story.restart();
          app.story.showNotification('CHAPTER RESTARTED');
        } else if (cmd === 'sound') {
          const isMuted = app.synth.toggleMute();
          btn.textContent = isMuted ? '🔇 MUTED' : '🔊 SOUND';
        } else if (cmd === 'fullscreen') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        }
      };
      btn.addEventListener('click', clickHandler);
      this.boundElements.push({ el: btn, event: 'click', fn: clickHandler });
    });
  }
}

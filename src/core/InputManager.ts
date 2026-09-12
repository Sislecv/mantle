/**
 * Mantle Chapter 1 - Input Manager
 * Manages keyboard input mapping, frame-based press states, and directional queries.
 */

export type InputAction = 'up' | 'down' | 'left' | 'right' | 'action' | 'cancel' | 'menu' | string;

export class InputManager {
  private currentKeys: Set<string> = new Set();
  private previousKeys: Set<string> = new Set();
  private actionBindings: Map<string, string[]> = new Map();
  private target: EventTarget | null = null;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private blurHandler: () => void;

  constructor(target?: EventTarget | null) {
    this.initDefaultBindings();

    this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    this.blurHandler = () => this.reset();

    const eventTarget = target !== undefined ? target : (typeof window !== 'undefined' ? window : null);
    if (eventTarget) {
      this.attach(eventTarget);
    }
  }

  private initDefaultBindings(): void {
    this.actionBindings.set('up', ['ArrowUp', 'KeyW', 'w', 'W']);
    this.actionBindings.set('down', ['ArrowDown', 'KeyS', 's', 'S']);
    this.actionBindings.set('left', ['ArrowLeft', 'KeyA', 'a', 'A']);
    this.actionBindings.set('right', ['ArrowRight', 'KeyD', 'd', 'D']);
    this.actionBindings.set('action', ['KeyZ', 'z', 'Z', 'KeyJ', 'j', 'J', 'Enter', 'Space']);
    this.actionBindings.set('cancel', ['KeyX', 'x', 'X', 'KeyK', 'k', 'K', 'ShiftLeft', 'ShiftRight', 'Shift']);
    this.actionBindings.set('menu', ['KeyC', 'c', 'C', 'KeyL', 'l', 'L', 'Escape']);
  }

  public attach(target: EventTarget): void {
    this.detach();
    this.target = target;
    this.target.addEventListener('keydown', this.keyDownHandler as EventListener);
    this.target.addEventListener('keyup', this.keyUpHandler as EventListener);
    this.target.addEventListener('blur', this.blurHandler as EventListener);
  }

  public detach(): void {
    if (this.target) {
      this.target.removeEventListener('keydown', this.keyDownHandler as EventListener);
      this.target.removeEventListener('keyup', this.keyUpHandler as EventListener);
      this.target.removeEventListener('blur', this.blurHandler as EventListener);
      this.target = null;
    }
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (e.code) this.currentKeys.add(e.code);
    if (e.key) this.currentKeys.add(e.key);
  }

  public handleKeyUp(e: KeyboardEvent): void {
    if (e.code) this.currentKeys.delete(e.code);
    if (e.key) this.currentKeys.delete(e.key);
  }

  /**
   * Bind custom keys to an action.
   */
  public bind(action: string, keys: string[]): void {
    this.actionBindings.set(action, keys);
  }

  /**
   * Checks if an action is currently held down.
   */
  public isDown(action: string): boolean {
    const keys = this.actionBindings.get(action) || [action];
    for (const key of keys) {
      if (this.currentKeys.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if an action was just pressed on the current frame.
   */
  public isJustPressed(action: string): boolean {
    const keys = this.actionBindings.get(action) || [action];
    for (const key of keys) {
      if (this.currentKeys.has(key) && !this.previousKeys.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Called once at the end of each game tick to advance frame input state.
   */
  public update(): void {
    this.previousKeys = new Set(this.currentKeys);
  }

  /**
   * Reset all held and pressed keys.
   */
  public reset(): void {
    this.currentKeys.clear();
    this.previousKeys.clear();
  }
}

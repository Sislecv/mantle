/**
 * Mantle Chapter 1 - Game Loop
 * Provides accurate delta-time frame execution, decoupling update and render ticks,
 * with requestAnimationFrame synchronization and delta clamping.
 */

export class GameLoop {
  private _isRunning: boolean = false;
  private rafId: number | null = null;
  private lastTime: number = 0;
  private maxDt: number = 0.25;

  private onUpdate: ((dt: number) => void) | null = null;
  private onRender: ((dt: number) => void) | null = null;

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public setUpdateCallback(fn: (dt: number) => void): void {
    this.onUpdate = fn;
  }

  public setRenderCallback(fn: (dt: number) => void): void {
    this.onRender = fn;
  }

  public start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this.lastTime = 0;

    if (typeof requestAnimationFrame === 'function') {
      const loop = (timestamp: number) => {
        if (!this._isRunning) return;
        this.tick(timestamp);
        if (this._isRunning) {
          this.rafId = requestAnimationFrame(loop);
        }
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }

  public stop(): void {
    this._isRunning = false;
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public tick(currentTime?: number): void {
    if (!this._isRunning) return;

    const now = currentTime !== undefined
      ? currentTime
      : (typeof performance !== 'undefined' ? performance.now() : Date.now());

    let dt: number;
    if (this.lastTime === 0) {
      // First frame delta default (approx 16.6ms at 60fps)
      dt = 1 / 60;
    } else {
      dt = (now - this.lastTime) / 1000;
    }

    if (dt < 0) dt = 0;
    if (dt > this.maxDt) dt = this.maxDt;

    this.lastTime = now;

    if (this.onUpdate) {
      this.onUpdate(dt);
    }
    if (this.onRender) {
      this.onRender(dt);
    }
  }
}

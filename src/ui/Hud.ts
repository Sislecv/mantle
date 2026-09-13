/**
 * Hud.ts
 * Authentic Chapter 3 "Mantle" / "The Legend of Tenna" Top HUD.
 * Replicates the classic NES Zelda / Deltarune Sword Route status bar:
 * - Left: HP bar with health ratio
 * - Center: MAX energy / charge gauge
 * - Right: 4 diagonal purple sword charge icons
 */

import { Renderer } from '../core/Renderer';
import { NES_COLORS } from '../core/Constants';

export interface HudState {
  hp: number;
  maxHp: number;
  hasSword: boolean;
  swordCharges?: number;
  maxSwordCharges?: number;
  lv?: number;
  roomName?: string;
  keys?: number;
}

export class Hud {
  public readonly height = 20;

  /**
   * Calculates clamped HP ratio [0, 1].
   */
  public getHpRatio(state: HudState): number {
    if (state.maxHp <= 0) return 0;
    return Math.max(0, Math.min(1, state.hp / state.maxHp));
  }

  /**
   * Renders the authentic Chapter 3 Mantle HUD to the top of the canvas.
   */
  public render(renderer: Renderer, state: HudState): void {
    // 1. Dark status bar background
    renderer.drawRect(0, 0, 256, this.height, '#000000', true);
    // Subtle bottom border
    renderer.drawRect(0, this.height - 1, 256, 1, '#1A1828', true);

    // 2. HP Label and Bar (Left)
    renderer.drawText('HP', 6, 6, {
      font: '8px monospace',
      color: NES_COLORS.WHITE,
      align: 'left',
    });

    const hpBarX = 22;
    const hpBarY = 6;
    const hpBarW = 46;
    const hpBarH = 6;
    const ratio = this.getHpRatio(state);

    // Gauge background and border
    renderer.drawRect(hpBarX, hpBarY, hpBarW, hpBarH, '#201828', true);
    renderer.drawRect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2, '#504860', false);

    // Gauge fill (White / Pale lavender, low HP changes to rose)
    const fillW = Math.floor(hpBarW * ratio);
    if (fillW > 0) {
      const fillColor = ratio < 0.25 ? '#FF4466' : '#FFFFFF';
      renderer.drawRect(hpBarX, hpBarY, fillW, hpBarH, fillColor, true);
    }

    // 3. MAX Label and Charge Bar (Center)
    const maxX = 76;
    renderer.drawText('MAX', maxX, 6, {
      font: '8px monospace',
      color: NES_COLORS.WHITE,
      align: 'left',
    });

    const maxBarX = maxX + 22;
    const maxBarW = 46;
    renderer.drawRect(maxBarX, hpBarY, maxBarW, hpBarH, '#201828', true);
    renderer.drawRect(maxBarX - 1, hpBarY - 1, maxBarW + 2, hpBarH + 2, '#504860', false);

    // If player has sword, MAX gauge fills with pale blue / lavender energy
    if (state.hasSword) {
      renderer.drawRect(maxBarX, hpBarY, maxBarW, hpBarH, '#D0C8FF', true);
    }

    // 4. Sword Icons (Right: 4 diagonal swords)
    const swordStartX = 156;
    const maxSwords = state.maxSwordCharges ?? 4;
    const activeSwords = state.hasSword ? (state.swordCharges ?? 4) : 0;

    for (let i = 0; i < maxSwords; i++) {
      const sx = swordStartX + i * 11;
      const sy = 4;
      const isLit = i < activeSwords;
      this.drawSwordIcon(renderer, sx, sy, isLit);
    }

    // 5. Room label or Keys badge (Far right)
    if (state.keys !== undefined && state.keys > 0) {
      renderer.drawText(`K:${state.keys}`, 215, 6, {
        font: '8px monospace',
        color: NES_COLORS.GOLD_ACCENT,
        align: 'left',
      });
    } else if (state.lv !== undefined) {
      renderer.drawText(`LV${state.lv}`, 218, 6, {
        font: '8px monospace',
        color: NES_COLORS.GRAY_LIGHT,
        align: 'left',
      });
    }
  }

  /**
   * Draws an authentic 8-bit diagonal sword icon.
   */
  private drawSwordIcon(renderer: Renderer, x: number, y: number, isLit: boolean): void {
    const bladeColor = isLit ? '#9B59B6' : '#2A2038'; // Purple blade
    const edgeColor = isLit ? '#D2B4DE' : '#1E1628';
    const hiltColor = isLit ? '#F1C40F' : '#3E3418'; // Gold hilt

    // Diagonal blade
    renderer.drawRect(x + 5, y + 1, 2, 2, edgeColor, true);
    renderer.drawRect(x + 4, y + 2, 2, 2, bladeColor, true);
    renderer.drawRect(x + 3, y + 3, 2, 2, bladeColor, true);
    renderer.drawRect(x + 2, y + 4, 2, 2, bladeColor, true);
    renderer.drawRect(x + 1, y + 5, 2, 2, bladeColor, true);

    // Crossguard & Hilt
    renderer.drawRect(x, y + 6, 2, 2, hiltColor, true);
    renderer.drawRect(x + 2, y + 6, 2, 2, hiltColor, true);
    renderer.drawRect(x, y + 8, 2, 2, hiltColor, true);
  }
}

/**
 * SpriteLoader.ts
 * Unified 8-Bit Sprite Asset Manager and Pixel-Perfect Renderer.
 * Manages caching, multi-frame slicing, sprite orientation flipping, and resilient fallback rendering.
 */

export interface SpriteInfo {
  key: string;
  url: string;
  width: number;
  height: number;
  image?: HTMLImageElement;
  loaded: boolean;
  fallbackColor: string;
}

export interface SpriteDrawOptions {
  flipX?: boolean;
  flipY?: boolean;
  frameIndex?: number;
  frameWidth?: number;
  frameHeight?: number;
  frameY?: number;
  flashWhite?: boolean;
  opacity?: number;
}

export class SpriteLoader {
  private static sprites: Map<string, SpriteInfo> = new Map();
  private static isInitialized = false;

  public static clear(): void {
    this.sprites.clear();
    this.isInitialized = false;
  }

  public static register(
    key: string,
    url: string,
    width: number,
    height: number,
    fallbackColor = '#FFFFFF'
  ): void {
    const info: SpriteInfo = {
      key,
      url,
      width,
      height,
      loaded: false,
      fallbackColor,
    };

    if (typeof Image !== 'undefined') {
      try {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          info.loaded = true;
          info.image = img;
        };
        img.onerror = () => {
          info.loaded = false;
        };
        info.image = img;
      } catch {
        info.loaded = false;
      }
    }

    this.sprites.set(key, info);
  }

  public static has(key: string): boolean {
    return this.sprites.has(key);
  }

  public static getSpriteInfo(key: string): SpriteInfo | undefined {
    return this.sprites.get(key);
  }

  /**
   * Initializes the core Deltarune Chapter 1 8-bit asset catalog.
   */
  public static initCoreSprites(): void {
    if (this.isInitialized) return;

    // Kris 8-bit official sprites
    this.register('kris_walk', './assets/png/Kris_overworld_8bit.png', 16, 16, '#241738');
    this.register('kris_attack', './assets/png/Kris_overworld_8bit_attack.png', 16, 16, '#241738');
    this.register('kris_pose', './assets/png/Kris_overworld_8bit_pose.png', 17, 16, '#241738');
    this.register('kris_hurt', './assets/png/Kris_overworld_8bit_hurt.png', 16, 16, '#241738');
    this.register('kris_defeat', './assets/png/Kris_overworld_8bit_defeat.png', 16, 16, '#241738');

    // Susie & Ralsei 8-bit heroes
    this.register('susie', './assets/png/Susie_HERO_AXE.png', 16, 16, '#9F2B68');
    this.register('susie_sheet', './assets/png/Susie_HERO_AXE_sheet.png', 144, 64, '#9F2B68');
    this.register('ralsei', './assets/png/Ralsei_HERO_SCARF.png', 16, 16, '#2ECC71');

    // Chapter 3 Official Board Demake Sprites
    this.register('ch3_susie_down_0', './assets/png/ch3/susie_down_0.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_down_1', './assets/png/ch3/susie_down_1.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_left_0', './assets/png/ch3/susie_left_0.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_left_1', './assets/png/ch3/susie_left_1.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_right_0', './assets/png/ch3/susie_right_0.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_right_1', './assets/png/ch3/susie_right_1.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_up_0', './assets/png/ch3/susie_up_0.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_up_1', './assets/png/ch3/susie_up_1.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_hurt', './assets/png/ch3/susie_hurt.png', 16, 16, '#9F2B68');
    this.register('ch3_susie_dead', './assets/png/ch3/susie_dead.png', 16, 16, '#9F2B68');

    this.register('ch3_kris_down_0', './assets/png/ch3/kris_down_0.png', 16, 16, '#241738');
    this.register('ch3_kris_left_0', './assets/png/ch3/kris_left_0.png', 16, 16, '#241738');
    this.register('ch3_kris_left_1', './assets/png/ch3/kris_left_1.png', 16, 16, '#241738');
    this.register('ch3_kris_up_0', './assets/png/ch3/kris_up_0.png', 16, 16, '#241738');
    this.register('ch3_kris_up_1', './assets/png/ch3/kris_up_1.png', 16, 16, '#241738');
    this.register('ch3_kris_strike_left_0', './assets/png/ch3/kris_strike_left_0.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_left_1', './assets/png/ch3/kris_strike_left_1.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_left_2', './assets/png/ch3/kris_strike_left_2.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_right_0', './assets/png/ch3/kris_strike_right_0.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_right_1', './assets/png/ch3/kris_strike_right_1.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_right_2', './assets/png/ch3/kris_strike_right_2.png', 32, 16, '#241738');
    this.register('ch3_kris_strike_up_0', './assets/png/ch3/kris_strike_up_0.png', 16, 32, '#241738');
    this.register('ch3_kris_hurt', './assets/png/ch3/kris_hurt.png', 16, 16, '#241738');
    this.register('ch3_kris_dead', './assets/png/ch3/kris_dead.png', 16, 16, '#241738');

    this.register('ch3_ralsei_down_0', './assets/png/ch3/ralsei_down_0.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_down_1', './assets/png/ch3/ralsei_down_1.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_right_0', './assets/png/ch3/ralsei_right_0.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_right_1', './assets/png/ch3/ralsei_right_1.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_up_0', './assets/png/ch3/ralsei_up_0.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_up_1', './assets/png/ch3/ralsei_up_1.png', 16, 16, '#2ECC71');
    this.register('ch3_ralsei_dead', './assets/png/ch3/ralsei_dead.png', 16, 16, '#2ECC71');

    this.register('ch3_lancer_left', './assets/png/ch3/lancer_left.png', 16, 16, '#2980B9');
    this.register('ch3_lancer_right', './assets/png/ch3/lancer_right.png', 16, 16, '#2980B9');
    this.register('ch3_lancer_spin_0', './assets/png/ch3/lancer_spin_0.png', 16, 16, '#2980B9');
    this.register('ch3_lancer_spin_1', './assets/png/ch3/lancer_spin_1.png', 16, 16, '#2980B9');

    this.register('ch3_rouxls', './assets/png/ch3/rouxls.png', 32, 32, '#1F4E79');
    this.register('ch3_rudinn', './assets/png/ch3/rudinn.png', 16, 16, '#2ECC71');
    this.register('ch3_heart', './assets/png/ch3/heart.png', 7, 7, '#E74C3C');
    this.register('ch3_controller', './assets/png/ch3/controller.png', 16, 16, '#888888');
    this.register('ch3_healthbar', './assets/png/ch3/healthbar.png', 46, 15, '#FFFFFF');
    this.register('ch3_game_title', './assets/png/ch3/game_title.png', 150, 40, '#FFFFFF');

    // Enemies & Bosses
    this.register('lancer', './assets/png/Lancer_overworld_8bit_spin.png', 20, 20, '#2980B9');
    this.register('rudinn', './assets/png/Rudinn_8bit.png', 16, 16, '#2ECC71');
    this.register('hathy', './assets/png/Hathy_8bit.png', 16, 16, '#E74C3C');
    this.register('k_round', './assets/png/K_Round_8bit.png', 24, 32, '#D62828');
    this.register('king', './assets/png/King_8bit.png', 32, 32, '#1F4E79');
    this.register('eram', './assets/png/Eram_ShadowMantle_Boss.png', 22, 22, '#2C3E50');
    this.register('white_cloak', './assets/png/White_Cloak.png', 16, 16, '#FFFFFF');

    // 8-bit Portraits for Dialogue
    this.register('portrait_susie', './assets/png/Susie_face_8bit.png', 32, 32, '#9F2B68');
    this.register('portrait_ralsei', './assets/png/Ralsei_face_8bit.png', 32, 32, '#2ECC71');
    this.register('portrait_lancer', './assets/png/Lancer_face_8bit.png', 32, 32, '#2980B9');
    this.register('portrait_king', './assets/png/King_face_8bit.png', 32, 32, '#1F4E79');

    this.isInitialized = true;
  }

  /**
   * Draws a sprite to a 2D canvas context with options.
   */
  public static draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: SpriteDrawOptions = {}
  ): void {
    const info = this.sprites.get(key);

    ctx.save();

    if (options.opacity !== undefined) {
      ctx.globalAlpha = options.opacity;
    }

    const drawX = Math.floor(x);
    const drawY = Math.floor(y);

    // If loaded and image is ready
    if (info && info.loaded && info.image) {
      const img = info.image;
      const flipX = options.flipX ?? false;
      const flipY = options.flipY ?? false;

      ctx.translate(drawX + (flipX ? width : 0), drawY + (flipY ? height : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

      if (options.flashWhite) {
        ctx.filter = 'brightness(200%) contrast(200%)';
      }

      const frameWidth = options.frameWidth ?? (info ? info.width : img.width);
      const frameHeight = options.frameHeight ?? (info ? info.height : img.height);
      const frameIdx = options.frameIndex ?? 0;
      const frameY = options.frameY ?? 0;
      const sx = frameIdx * frameWidth;
      const sy = frameY * frameHeight;

      ctx.drawImage(
        img,
        sx,
        sy,
        Math.max(1, Math.min(frameWidth, img.width - sx)),
        Math.max(1, Math.min(frameHeight, img.height - sy)),
        0,
        0,
        width,
        height
      );
    } else {
      // Fallback pixel rendering
      const fallback = info ? info.fallbackColor : '#FFFFFF';
      ctx.fillStyle = options.flashWhite ? '#FFFFFF' : fallback;
      ctx.fillRect(drawX, drawY, width, height);
    }

    ctx.restore();
  }
}

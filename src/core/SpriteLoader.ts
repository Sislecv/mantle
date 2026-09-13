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
    this.register('susie', './assets/png/Susie_HERO_AXE.png', 16, 24, '#9F2B68');
    this.register('susie_sheet', './assets/png/Susie_HERO_AXE_sheet.png', 144, 64, '#9F2B68');
    this.register('ralsei', './assets/png/Ralsei_HERO_SCARF.png', 16, 24, '#2ECC71');

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

      const frameWidth = options.frameWidth ?? img.width;
      const frameHeight = options.frameHeight ?? img.height;
      const frameIdx = options.frameIndex ?? 0;
      const sx = frameIdx * frameWidth;
      const sy = 0;

      ctx.drawImage(
        img,
        sx,
        sy,
        Math.min(frameWidth, img.width),
        Math.min(frameHeight, img.height),
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

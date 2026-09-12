/**
 * Mantle Chapter 1 - Tilemap Engine
 * Manages grid layout, collision detection, trigger queries, and procedural NES rendering.
 */

import { TILE_SIZE, NES_COLORS } from '../core/Constants';
import { Renderer } from '../core/Renderer';
import { Tile, TILES, createTile } from './Tile';

export class Tilemap {
  public readonly width: number;
  public readonly height: number;
  public readonly tileSize: number = TILE_SIZE;
  public readonly pixelWidth: number;
  public readonly pixelHeight: number;

  private tiles: (Tile | null)[];

  constructor(width = 16, height = 15, defaultTile: Tile = TILES.EMPTY) {
    this.width = width;
    this.height = height;
    this.pixelWidth = width * this.tileSize;
    this.pixelHeight = height * this.tileSize;

    this.tiles = new Array(width * height);
    for (let i = 0; i < this.tiles.length; i++) {
      this.tiles[i] = { ...defaultTile };
    }
  }

  private getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  public isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public setTile(x: number, y: number, tile: Tile): void {
    if (!this.isInBounds(x, y)) {
      return;
    }
    this.tiles[this.getIndex(x, y)] = { ...tile };
  }

  public getTile(x: number, y: number): Tile | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    return this.tiles[this.getIndex(x, y)] ?? null;
  }

  /**
   * Returns whether a given grid cell is solid.
   * Out-of-bounds cells are treated as solid boundaries.
   */
  public isSolid(gridX: number, gridY: number): boolean {
    if (!this.isInBounds(gridX, gridY)) {
      return true;
    }
    const tile = this.getTile(gridX, gridY);
    return tile ? tile.solid : true;
  }

  /**
   * Returns whether a given pixel coordinate touches a solid tile.
   * Negative or out-of-map pixel coordinates are treated as solid boundaries.
   */
  public isSolidAtPixel(pixelX: number, pixelY: number): boolean {
    if (pixelX < 0 || pixelX >= this.pixelWidth || pixelY < 0 || pixelY >= this.pixelHeight) {
      return true;
    }
    const gridX = Math.floor(pixelX / this.tileSize);
    const gridY = Math.floor(pixelY / this.tileSize);
    return this.isSolid(gridX, gridY);
  }

  /**
   * Retrieves any trigger ID bound to the tile at (gridX, gridY).
   */
  public getTrigger(gridX: number, gridY: number): string | null {
    if (!this.isInBounds(gridX, gridY)) {
      return null;
    }
    const tile = this.getTile(gridX, gridY);
    return tile?.triggerId ?? null;
  }

  /**
   * Renders the visible region of the tilemap using retro NES aesthetics.
   */
  public render(renderer: Renderer, cameraX = 0, cameraY = 0): void {
    const startCol = Math.max(0, Math.floor(cameraX / this.tileSize));
    const endCol = Math.min(this.width, Math.ceil((cameraX + renderer.width) / this.tileSize));
    const startRow = Math.max(0, Math.floor(cameraY / this.tileSize));
    const endRow = Math.min(this.height, Math.ceil((cameraY + renderer.height) / this.tileSize));

    const s = this.tileSize;

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = this.getTile(x, y);
        if (!tile) continue;

        const drawX = x * s - cameraX;
        const drawY = y * s - cameraY;

        this.renderProceduralTile(renderer, tile, drawX, drawY, s, x, y);
      }
    }
  }

  /**
   * Procedural retro NES tile renderer when external sprites are not bound.
   */
  private renderProceduralTile(
    renderer: Renderer,
    tile: Tile,
    x: number,
    y: number,
    s: number,
    gridX: number,
    gridY: number
  ): void {
    switch (tile.type) {
      case 'EMPTY':
        renderer.drawRect(x, y, s, s, NES_COLORS.BLACK);
        break;

      case 'FLOOR_CLIFF':
        renderer.drawRect(x, y, s, s, tile.color || NES_COLORS.DARK_FLOOR);
        // Subtle cliff rock speckles
        if ((gridX + gridY) % 3 === 0) {
          renderer.drawRect(x + 3, y + 4, 2, 2, '#231D38');
          renderer.drawRect(x + 11, y + 10, 2, 2, '#231D38');
        }
        break;

      case 'FLOOR_CHECKER_LIGHT':
        renderer.drawRect(x, y, s, s, tile.color || '#281B44');
        renderer.drawRect(x + 1, y + 1, s - 2, s - 2, '#312254');
        break;

      case 'FLOOR_CHECKER_DARK':
        renderer.drawRect(x, y, s, s, tile.color || '#180E2B');
        break;

      case 'WALL_CLIFF':
        renderer.drawRect(x, y, s, s, tile.color || NES_COLORS.DARK_CLIFF);
        // Top highlight rim
        renderer.drawRect(x, y, s, 2, '#4F3B78');
        // Bottom shadow rim
        renderer.drawRect(x, y + s - 2, s, 2, '#0B0813');
        // Center rock crag
        renderer.drawRect(x + 6, y + 5, 4, 6, '#150F22');
        break;

      case 'WALL_CASTLE':
        renderer.drawRect(x, y, s, s, tile.color || '#26243E');
        // Castle brick pattern
        renderer.drawRect(x, y + 7, s, 1, '#141224');
        renderer.drawRect(x, y + 15, s, 1, '#141224');
        if (gridY % 2 === 0) {
          renderer.drawRect(x + 7, y, 1, 7, '#141224');
          renderer.drawRect(x + 15, y + 8, 1, 7, '#141224');
        } else {
          renderer.drawRect(x + 15, y, 1, 7, '#141224');
          renderer.drawRect(x + 7, y + 8, 1, 7, '#141224');
        }
        // Top edge light highlight
        renderer.drawRect(x, y, s, 1, '#3B3860');
        break;

      case 'SLIDE_SLOPE':
        renderer.drawRect(x, y, s, s, tile.color || '#342352');
        // Slide directional chevron (pointing down)
        renderer.drawRect(x + 4, y + 4, 8, 2, '#5E4391');
        renderer.drawRect(x + 6, y + 7, 4, 2, '#5E4391');
        renderer.drawRect(x + 7, y + 10, 2, 2, '#5E4391');
        break;

      case 'WATER':
        renderer.drawRect(x, y, s, s, tile.color || '#162C5B');
        // Water wave ripples
        renderer.drawRect(x + 2, y + 4, 5, 1, '#2D5AA0');
        renderer.drawRect(x + 9, y + 11, 5, 1, '#2D5AA0');
        break;

      case 'SPURT_SPIKES':
        renderer.drawRect(x, y, s, s, NES_COLORS.DARK_FLOOR);
        // Triangle spike silhouettes
        renderer.drawRect(x + 3, y + 8, 3, 6, tile.color || '#8A1B38');
        renderer.drawRect(x + 4, y + 4, 1, 4, '#FFFFFF');
        renderer.drawRect(x + 9, y + 8, 3, 6, tile.color || '#8A1B38');
        renderer.drawRect(x + 10, y + 4, 1, 4, '#FFFFFF');
        break;

      default:
        renderer.drawRect(x, y, s, s, tile.color || NES_COLORS.BLACK);
        break;
    }

    // Optional symbol overlay
    if (tile.symbol && tile.type !== 'SLIDE_SLOPE' && tile.type !== 'SPURT_SPIKES') {
      renderer.drawText(tile.symbol, x + 4, y + 4, {
        color: NES_COLORS.WHITE,
        size: 8,
      });
    }
  }
}

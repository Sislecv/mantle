/**
 * Mantle Chapter 1 - Core Constants
 * Standard NES Resolution & Grid Specifications
 */

export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 240;
export const TILE_SIZE = 16;
export const SCALE = 4;

export const TARGET_FPS = 60;
export const FIXED_TIMESTEP = 1 / TARGET_FPS;

/**
 * NES Classic Master Palette Colors used across Mantle Chapter 1
 */
export const NES_COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GRAY_LIGHT: '#BDBDBD',
  GRAY_DARK: '#424242',
  
  // Deltarune SOUL & Kris Accents
  SOUL_RED: '#E40058',
  SOUL_GLOW: '#FFAFC7',
  KRIS_BLUE: '#3873FF',
  KRIS_CYAN: '#00D8FF',
  KRIS_CAPE: '#EC407A',
  
  // Susie & Dark World Colors
  SUSIE_PURPLE: '#8F389A',
  SUSIE_MAGENTA: '#D60072',
  RALSEI_GREEN: '#00A844',
  RALSEI_PINK: '#FF6492',

  // Dark World Palette
  DARK_BG: '#0B0813',
  DARK_CLIFF: '#201830',
  DARK_FLOOR: '#131124',
  DARK_ACCENT: '#4F3B78',
  GOLD_ACCENT: '#F8B800',
} as const;

/**
 * Mantle Chapter 1 - Tile System
 * Defines tile types, properties (solidity, colors, triggers), and factory functions.
 */

import { NES_COLORS } from '../core/Constants';

export type TileType =
  | 'EMPTY'
  | 'FLOOR_CLIFF'
  | 'FLOOR_CHECKER_LIGHT'
  | 'FLOOR_CHECKER_DARK'
  | 'WALL_CLIFF'
  | 'WALL_CASTLE'
  | 'SLIDE_SLOPE'
  | 'WATER'
  | 'SPURT_SPIKES';

export interface Tile {
  type: TileType;
  solid: boolean;
  color?: string;
  symbol?: string;
  triggerId?: string;
  damage?: number;
  slippery?: boolean;
}

/**
 * Standard preset definitions for Chapter 1 tiles with NES aesthetics
 */
export const TILES: Record<TileType, Readonly<Tile>> = {
  EMPTY: {
    type: 'EMPTY',
    solid: false,
    color: NES_COLORS.BLACK,
  },
  FLOOR_CLIFF: {
    type: 'FLOOR_CLIFF',
    solid: false,
    color: NES_COLORS.DARK_FLOOR,
  },
  FLOOR_CHECKER_LIGHT: {
    type: 'FLOOR_CHECKER_LIGHT',
    solid: false,
    color: '#281B44',
  },
  FLOOR_CHECKER_DARK: {
    type: 'FLOOR_CHECKER_DARK',
    solid: false,
    color: '#180E2B',
  },
  WALL_CLIFF: {
    type: 'WALL_CLIFF',
    solid: true,
    color: NES_COLORS.DARK_CLIFF,
  },
  WALL_CASTLE: {
    type: 'WALL_CASTLE',
    solid: true,
    color: '#26243E',
  },
  SLIDE_SLOPE: {
    type: 'SLIDE_SLOPE',
    solid: false,
    slippery: true,
    color: '#342352',
    symbol: '▼',
  },
  WATER: {
    type: 'WATER',
    solid: true,
    color: '#162C5B',
    symbol: '~',
  },
  SPURT_SPIKES: {
    type: 'SPURT_SPIKES',
    solid: false,
    damage: 10,
    color: '#8A1B38',
    symbol: '▲',
  },
};

/**
 * Creates a tile based on a type template with optional property overrides.
 */
export function createTile(type: TileType, overrides?: Partial<Tile>): Tile {
  return {
    ...TILES[type],
    ...overrides,
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Puzzle } from '../../src/puzzles/Puzzle';
import { SuitPlatePuzzle } from '../../src/puzzles/SuitPlatePuzzle';
import { BoxPushPuzzle, RouxlsKaardPuzzle } from '../../src/puzzles/BoxPushPuzzle';
import { Player } from '../../src/entities/Player';
import { Tilemap } from '../../src/map/Tilemap';
import { TILES, createTile } from '../../src/map/Tile';
import { ChiptuneSynth } from '../../src/audio/ChiptuneSynth';
import { Renderer } from '../../src/core/Renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../src/core/Constants';

describe('Chapter 1 Puzzles System', () => {
  describe('Puzzle Base Class', () => {
    class MockPuzzle extends Puzzle {
      public checkSolution(): boolean {
        return this.isSolved;
      }
      public render(_renderer: Renderer, _cameraX = 0, _cameraY = 0): void {
        // Mock render
      }
    }

    it('should initialize with default unsolved state and trigger onSolveCallback', () => {
      const onSolve = vi.fn();
      const puzzle = new MockPuzzle({ id: 'mock_1', onSolveCallback: onSolve });

      expect(puzzle.id).toBe('mock_1');
      expect(puzzle.isSolved).toBe(false);
      expect(puzzle.checkSolution()).toBe(false);

      puzzle.solve();
      expect(puzzle.isSolved).toBe(true);
      expect(puzzle.checkSolution()).toBe(true);
      expect(onSolve).toHaveBeenCalledTimes(1);

      // Subsequent solve calls should be idempotent
      puzzle.solve();
      expect(onSolve).toHaveBeenCalledTimes(1);
    });

    it('should reset properly back to unsolved state', () => {
      const puzzle = new MockPuzzle({ id: 'mock_2' });
      puzzle.solve();
      expect(puzzle.isSolved).toBe(true);

      puzzle.reset();
      expect(puzzle.isSolved).toBe(false);
    });

    it('should play solved chime when ChiptuneSynth audio is provided', () => {
      const mockAudio = {
        playSfx: vi.fn(),
        playBlip: vi.fn(),
      } as unknown as ChiptuneSynth;

      const puzzle = new MockPuzzle({ id: 'mock_3', audio: mockAudio });
      puzzle.solve();

      expect(mockAudio.playSfx).toHaveBeenCalledWith('LEVEL_UP');
    });
  });

  describe('SuitPlatePuzzle (Deltarune Card Suits)', () => {
    let mockAudio: ChiptuneSynth;
    let puzzle: SuitPlatePuzzle;

    beforeEach(() => {
      mockAudio = {
        playSfx: vi.fn(),
        playBlip: vi.fn(),
      } as unknown as ChiptuneSynth;

      puzzle = new SuitPlatePuzzle({
        id: 'suit_puzzle_1',
        targetSequence: ['SPADE', 'HEART', 'DIAMOND'],
        plates: [
          { suit: 'SPADE', gridX: 2, gridY: 2 },
          { suit: 'HEART', gridX: 4, gridY: 2 },
          { suit: 'DIAMOND', gridX: 6, gridY: 2 },
          { suit: 'CLUB', gridX: 8, gridY: 2 },
        ],
        audio: mockAudio,
      });
    });

    it('should initialize plates with unpressed states and step 0', () => {
      expect(puzzle.currentStep).toBe(0);
      expect(puzzle.isSolved).toBe(false);
      expect(puzzle.plates.length).toBe(4);
      expect(puzzle.plates.every((p) => !p.isPressed)).toBe(true);
    });

    it('should advance step and solve when stepped on in correct sequence', () => {
      const onSolve = vi.fn();
      puzzle.onSolveCallback = onSolve;

      // Step 1: SPADE
      const step1 = puzzle.stepOnPlate('SPADE');
      expect(step1).toBe(true);
      expect(puzzle.currentStep).toBe(1);
      expect(puzzle.plates.find((p) => p.suit === 'SPADE')?.isPressed).toBe(true);
      expect(puzzle.isSolved).toBe(false);
      expect(mockAudio.playSfx).toHaveBeenCalledWith('SELECT');

      // Step 2: HEART
      const step2 = puzzle.stepOnPlate('HEART');
      expect(step2).toBe(true);
      expect(puzzle.currentStep).toBe(2);
      expect(puzzle.plates.find((p) => p.suit === 'HEART')?.isPressed).toBe(true);
      expect(puzzle.isSolved).toBe(false);

      // Step 3: DIAMOND (final in sequence)
      const step3 = puzzle.stepOnPlate('DIAMOND');
      expect(step3).toBe(true);
      expect(puzzle.currentStep).toBe(3);
      expect(puzzle.isSolved).toBe(true);
      expect(onSolve).toHaveBeenCalledTimes(1);
      expect(mockAudio.playSfx).toHaveBeenCalledWith('LEVEL_UP');
    });

    it('should reset currentStep and unpress plates upon incorrect step', () => {
      // Step 1: Correct (SPADE)
      puzzle.stepOnPlate('SPADE');
      expect(puzzle.currentStep).toBe(1);
      expect(puzzle.plates.find((p) => p.suit === 'SPADE')?.isPressed).toBe(true);

      // Step 2: Incorrect (CLUB instead of HEART)
      const step2 = puzzle.stepOnPlate('CLUB');
      expect(step2).toBe(false);
      expect(puzzle.currentStep).toBe(0);
      expect(puzzle.plates.every((p) => !p.isPressed)).toBe(true);
      expect(puzzle.isSolved).toBe(false);
      expect(mockAudio.playSfx).toHaveBeenCalledWith('HURT');
    });

    it('should detect player walking onto plates via update(player)', () => {
      const player = new Player({ x: 0, y: 0 }); // starts far away

      puzzle.update(player);
      expect(puzzle.currentStep).toBe(0);

      // Move player onto SPADE plate at grid (2, 2) -> pixel (32, 32)
      player.x = 32;
      player.y = 32;
      puzzle.update(player);
      expect(puzzle.currentStep).toBe(1);

      // Staying on the same plate should not trigger repeatedly
      puzzle.update(player);
      expect(puzzle.currentStep).toBe(1);

      // Move onto HEART plate at grid (4, 2) -> pixel (64, 32)
      player.x = 64;
      player.y = 32;
      puzzle.update(player);
      expect(puzzle.currentStep).toBe(2);

      // Move onto DIAMOND plate at grid (6, 2) -> pixel (96, 32)
      player.x = 96;
      player.y = 32;
      puzzle.update(player);
      expect(puzzle.currentStep).toBe(3);
      expect(puzzle.isSolved).toBe(true);
    });

    it('should unlock linked obstacle or barrier upon solve', () => {
      puzzle.barrierDisabled = false;
      puzzle.solve();
      expect(puzzle.isSolved).toBe(true);
      expect(puzzle.barrierDisabled).toBe(true);
    });

    it('should render plates with suit symbols without throwing', () => {
      const canvas = document.createElement('canvas');
      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
      const renderer = new Renderer(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(() => puzzle.render(renderer)).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('BoxPushPuzzle (Crate & Pressure Plate Mechanics)', () => {
    let tilemap: Tilemap;
    let puzzle: BoxPushPuzzle;
    let mockAudio: ChiptuneSynth;

    beforeEach(() => {
      mockAudio = {
        playSfx: vi.fn(),
        playBlip: vi.fn(),
      } as unknown as ChiptuneSynth;

      // 10x10 empty floor tilemap
      tilemap = new Tilemap(10, 10, TILES.FLOOR_CLIFF);

      // Solid wall at grid (5, 3)
      tilemap.setTile(5, 3, createTile('WALL_CLIFF'));

      puzzle = new BoxPushPuzzle({
        id: 'box_puzzle_1',
        crates: [
          { id: 'crate_1', gridX: 3, gridY: 3 },
          { id: 'crate_2', gridX: 3, gridY: 5 },
        ],
        plates: [
          { id: 'plate_1', gridX: 4, gridY: 3 },
          { id: 'plate_2', gridX: 4, gridY: 5 },
        ],
        audio: mockAudio,
      });
    });

    it('should initialize crates and plates at specified grid coordinates', () => {
      expect(puzzle.crates.length).toBe(2);
      expect(puzzle.plates.length).toBe(2);
      expect(puzzle.crates[0].gridX).toBe(3);
      expect(puzzle.crates[0].gridY).toBe(3);
      expect(puzzle.crates[0].x).toBe(48); // 3 * 16
      expect(puzzle.crates[0].y).toBe(48);
      expect(puzzle.plates.every((p) => !p.isPressed)).toBe(true);
      expect(puzzle.isSolved).toBe(false);
    });

    it('should push crate 1 tile when player moves into it and destination is open', () => {
      const player = new Player({ x: 32, y: 48, facing: 'RIGHT' });
      player.vx = 80;

      // Player collides into crate_1 at (48, 48) pushing RIGHT
      const pushed = puzzle.pushCrate('crate_1', 1, 0, tilemap);
      expect(pushed).toBe(true);

      const crate = puzzle.getCrate('crate_1');
      expect(crate?.gridX).toBe(4);
      expect(crate?.gridY).toBe(3);
      expect(crate?.x).toBe(64);
      expect(mockAudio.playSfx).toHaveBeenCalledWith('SELECT');
    });

    it('should block crate pushing when destination tile is a solid wall', () => {
      // Move crate_1 to grid (4, 3)
      puzzle.pushCrate('crate_1', 1, 0, tilemap);
      expect(puzzle.getCrate('crate_1')?.gridX).toBe(4);

      // Now pushing RIGHT again would target (5, 3) which is a solid wall!
      const pushed = puzzle.pushCrate('crate_1', 1, 0, tilemap);
      expect(pushed).toBe(false);
      expect(puzzle.getCrate('crate_1')?.gridX).toBe(4);
    });

    it('should block crate pushing when destination tile is occupied by another crate', () => {
      // Position crate_2 directly below crate_1 at (3, 4)
      const crate2 = puzzle.getCrate('crate_2');
      if (crate2) {
        crate2.gridY = 4;
        crate2.y = 64;
      }

      // Try pushing crate_1 down into crate_2
      const pushed = puzzle.pushCrate('crate_1', 0, 1, tilemap);
      expect(pushed).toBe(false);
      expect(puzzle.getCrate('crate_1')?.gridY).toBe(3);
    });

    it('should activate plate when crate is on top, and solve when all plates pressed', () => {
      const onSolve = vi.fn();
      puzzle.onSolveCallback = onSolve;

      // Push crate 1 onto plate 1 at (4, 3)
      puzzle.pushCrate('crate_1', 1, 0, tilemap);
      expect(puzzle.getPlate('plate_1')?.isPressed).toBe(true);
      expect(puzzle.getPlate('plate_2')?.isPressed).toBe(false);
      expect(puzzle.isSolved).toBe(false);

      // Push crate 2 onto plate 2 at (4, 5)
      puzzle.pushCrate('crate_2', 1, 0, tilemap);
      expect(puzzle.getPlate('plate_2')?.isPressed).toBe(true);

      // Both plates now pressed -> solved!
      expect(puzzle.isSolved).toBe(true);
      expect(onSolve).toHaveBeenCalledTimes(1);
      expect(mockAudio.playSfx).toHaveBeenCalledWith('LEVEL_UP');
    });

    it('should support player update interaction via bounding box collision', () => {
      // Player moving RIGHT into crate_1
      const player = new Player({ x: 34, y: 48, facing: 'RIGHT' });
      player.vx = 80;

      puzzle.update(player, tilemap);

      expect(puzzle.getCrate('crate_1')?.gridX).toBe(4);
      expect(puzzle.getPlate('plate_1')?.isPressed).toBe(true);
    });

    it('should render crates and plates without errors', () => {
      const canvas = document.createElement('canvas');
      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
      const renderer = new Renderer(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(() => puzzle.render(renderer)).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('RouxlsKaardPuzzle (Kaard Comedic Spoof)', () => {
    it('should initialize with hilarious 1-tile distance preset and dialogue lines', () => {
      const spoof = new RouxlsKaardPuzzle();

      expect(spoof.id).toBe('rouxls_kaard_puzzle');
      expect(spoof.crates.length).toBe(1);
      expect(spoof.plates.length).toBe(1);

      // Crate is literally 1 tile away from the target plate!
      const crate = spoof.crates[0];
      const plate = spoof.plates[0];
      const distanceTiles = Math.abs(crate.gridX - plate.gridX) + Math.abs(crate.gridY - plate.gridY);
      expect(distanceTiles).toBe(1);

      // Comedic dialogue lines
      const dialogue = spoof.getDialogue();
      expect(dialogue.length).toBeGreaterThan(0);
      expect(dialogue.some((line) => line.includes('GOD') || line.includes('WORMS') || line.includes('MINE PUZZLE'))).toBe(true);
    });

    it('should immediately solve on single push and provide defeat reaction dialogue', () => {
      const spoof = new RouxlsKaardPuzzle();
      const onSolve = vi.fn();
      spoof.onSolveCallback = onSolve;

      expect(spoof.isSolved).toBe(false);

      // Crate is at (5, 5), plate at (6, 5). Push right:
      const pushed = spoof.pushCrate(spoof.crates[0].id, 1, 0);
      expect(pushed).toBe(true);
      expect(spoof.isSolved).toBe(true);
      expect(onSolve).toHaveBeenCalled();

      const solveDialogue = spoof.getSolveDialogue();
      expect(solveDialogue.length).toBeGreaterThan(0);
    });
  });
});

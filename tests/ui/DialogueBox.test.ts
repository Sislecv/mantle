import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DialogueBox, DialogueLine } from '../../src/ui/DialogueBox';
import { ChiptuneSynth } from '../../src/audio/ChiptuneSynth';
import { Renderer } from '../../src/core/Renderer';

describe('DialogueBox', () => {
  let mockSynth: ChiptuneSynth;
  let dialogueBox: DialogueBox;

  beforeEach(() => {
    mockSynth = {
      isAvailable: true,
      isMuted: vi.fn().mockReturnValue(false),
      setMuted: vi.fn(),
      playBlip: vi.fn(),
      playSfx: vi.fn(),
    } as unknown as ChiptuneSynth;

    dialogueBox = new DialogueBox(mockSynth);
  });

  describe('isOpen Toggling & Visibility', () => {
    it('initializes in closed state', () => {
      expect(dialogueBox.isOpen).toBe(false);
      expect(dialogueBox.currentLine).toBeNull();
    });

    it('opens when showDialogue is invoked', () => {
      dialogueBox.showDialogue([
        { speaker: 'KRIS', text: '...' }
      ]);
      expect(dialogueBox.isOpen).toBe(true);
      expect(dialogueBox.currentLine?.speaker).toBe('KRIS');
    });

    it('closes and invokes onComplete when dialogue ends', () => {
      const onComplete = vi.fn();
      dialogueBox.showDialogue(
        [{ speaker: 'KRIS', text: 'Hello' }],
        onComplete
      );

      expect(dialogueBox.isOpen).toBe(true);

      // Advance once to skip typewriter reveal to end
      dialogueBox.advance();
      expect(dialogueBox.isOpen).toBe(true);
      expect(onComplete).not.toHaveBeenCalled();

      // Advance again to close dialogue
      dialogueBox.advance();
      expect(dialogueBox.isOpen).toBe(false);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('can be manually closed', () => {
      dialogueBox.showDialogue([{ text: 'test' }]);
      expect(dialogueBox.isOpen).toBe(true);
      dialogueBox.close();
      expect(dialogueBox.isOpen).toBe(false);
      expect(dialogueBox.currentLine).toBeNull();
    });
  });

  describe('Dialogue Queue & Multi-line Advancing', () => {
    it('progresses through multiple dialogue lines in order', () => {
      const lines: DialogueLine[] = [
        { speaker: 'SUSIE', text: 'Hey, Kris.' },
        { speaker: 'RALSEI', text: 'Nice to meet you!' },
        { speaker: 'LANCER', text: 'Ho ho ho!' },
      ];

      dialogueBox.showDialogue(lines);
      expect(dialogueBox.currentLineIndex).toBe(0);
      expect(dialogueBox.currentLine?.speaker).toBe('SUSIE');

      // Line 1: skip to end
      dialogueBox.advance();
      expect(dialogueBox.currentLineIndex).toBe(0);

      // Line 1 -> Line 2
      dialogueBox.advance();
      expect(dialogueBox.currentLineIndex).toBe(1);
      expect(dialogueBox.currentLine?.speaker).toBe('RALSEI');
      expect(mockSynth.playSfx).toHaveBeenCalledWith('CONFIRM');

      // Line 2: skip to end
      dialogueBox.advance();
      expect(dialogueBox.currentLineIndex).toBe(1);

      // Line 2 -> Line 3
      dialogueBox.advance();
      expect(dialogueBox.currentLineIndex).toBe(2);
      expect(dialogueBox.currentLine?.speaker).toBe('LANCER');

      // Line 3: skip to end
      dialogueBox.advance();
      // Line 3: finish & close
      dialogueBox.advance();
      expect(dialogueBox.isOpen).toBe(false);
    });

    it('does nothing when advance() is called on a closed dialogue box', () => {
      dialogueBox.advance();
      expect(dialogueBox.isOpen).toBe(false);
      expect(mockSynth.playSfx).not.toHaveBeenCalled();
    });
  });

  describe('Choices Handling & Callbacks', () => {
    it('allows navigating and confirming choices', () => {
      const onChoice = vi.fn();
      const lines: DialogueLine[] = [
        {
          speaker: 'SUSIE',
          text: 'Are we gonna smash something?',
          choices: ['YES', 'NO'],
          onChoice,
        },
      ];

      dialogueBox.showDialogue(lines);
      // Skip text typing to reveal choices
      dialogueBox.advance();
      expect(dialogueBox.selectedChoiceIndex).toBe(0);

      // Change choice selection to index 1 ('NO')
      dialogueBox.selectChoice(1);
      expect(dialogueBox.selectedChoiceIndex).toBe(1);
      expect(mockSynth.playSfx).toHaveBeenCalledWith('SELECT');

      // Confirm selection
      dialogueBox.advance();
      expect(onChoice).toHaveBeenCalledWith(1);
      expect(mockSynth.playSfx).toHaveBeenCalledWith('CONFIRM');
      expect(dialogueBox.isOpen).toBe(false);
    });

    it('clamps or bounds choice selection', () => {
      dialogueBox.showDialogue([
        {
          text: 'Choose',
          choices: ['A', 'B', 'C'],
        },
      ]);
      dialogueBox.advance(); // finish typing

      dialogueBox.selectChoice(-1);
      expect(dialogueBox.selectedChoiceIndex).toBe(0);

      dialogueBox.selectChoice(5);
      expect(dialogueBox.selectedChoiceIndex).toBe(2);
    });
  });

  describe('Audio Integration on Update', () => {
    it('triggers playBlip with speaker when characters are printed', () => {
      dialogueBox.showDialogue([
        { speaker: 'SUSIE', text: 'Hey' },
      ]);

      // Before update, no blips
      expect(mockSynth.playBlip).not.toHaveBeenCalled();

      // Update enough time to print 'H'
      dialogueBox.update(0.04);
      expect(mockSynth.playBlip).toHaveBeenCalledWith('SUSIE');
    });

    it('does not trigger playBlip on spaces/whitespace', () => {
      dialogueBox.showDialogue([
        { speaker: 'KRIS', text: 'A B' },
      ]);
      dialogueBox.update(0.04); // prints 'A'
      expect(mockSynth.playBlip).toHaveBeenCalledTimes(1);

      dialogueBox.update(0.04); // prints ' '
      // Should not trigger blip on space
      expect(mockSynth.playBlip).toHaveBeenCalledTimes(1);
    });
  });

  describe('NES 256x240 Layout & Rendering', () => {
    it('has standard NES 256x240 layout coordinates', () => {
      expect(dialogueBox.x).toBe(8);
      expect(dialogueBox.y).toBe(160);
      expect(dialogueBox.width).toBe(240);
      expect(dialogueBox.height).toBe(72);
    });

    function createMockRenderer(): Renderer {
      const canvas = document.createElement('canvas');
      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        imageSmoothingEnabled: true,
        fillStyle: '',
        strokeStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
      return new Renderer(canvas, 256, 240);
    }

    it('renders box background, borders, and text without error', () => {
      const renderer = createMockRenderer();

      const drawRectSpy = vi.spyOn(renderer, 'drawRect');
      const drawTextSpy = vi.spyOn(renderer, 'drawText');

      dialogueBox.showDialogue([
        {
          speaker: 'SUSIE',
          portrait: 'Susie',
          text: 'Let us go!',
          choices: ['OK', 'WAIT'],
        },
      ]);
      dialogueBox.advance(); // reveal choices

      dialogueBox.render(renderer);

      expect(drawRectSpy).toHaveBeenCalled();
      expect(drawTextSpy).toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      const renderer = createMockRenderer();
      const drawRectSpy = vi.spyOn(renderer, 'drawRect');

      dialogueBox.render(renderer);
      expect(drawRectSpy).not.toHaveBeenCalled();
    });
  });
});

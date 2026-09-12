import { describe, it, expect, beforeEach } from 'vitest';
import { Typewriter } from '../../src/ui/Typewriter';

describe('Typewriter', () => {
  let typewriter: Typewriter;

  beforeEach(() => {
    typewriter = new Typewriter();
  });

  describe('Initialization and defaults', () => {
    it('initializes with expected default properties', () => {
      expect(typewriter.fullText).toBe('');
      expect(typewriter.displayedText).toBe('');
      expect(typewriter.isFinished).toBe(true);
      expect(typewriter.charIndex).toBe(0);
      expect(typewriter.timer).toBe(0);
      expect(typewriter.charDelay).toBeCloseTo(0.03, 3);
    });

    it('sets new text and resets state', () => {
      typewriter.setText('Hello world');
      expect(typewriter.fullText).toBe('Hello world');
      expect(typewriter.displayedText).toBe('');
      expect(typewriter.isFinished).toBe(false);
      expect(typewriter.charIndex).toBe(0);
      expect(typewriter.timer).toBe(0);
    });

    it('handles setting empty string', () => {
      typewriter.setText('');
      expect(typewriter.fullText).toBe('');
      expect(typewriter.displayedText).toBe('');
      expect(typewriter.isFinished).toBe(true);
    });
  });

  describe('Progressive text reveal on update(dt)', () => {
    it('reveals characters sequentially based on charDelay', () => {
      typewriter.setText('Kris');
      expect(typewriter.displayedText).toBe('');

      // Update less than charDelay
      const res1 = typewriter.update(0.01);
      expect(res1.charPrinted).toBe(false);
      expect(typewriter.displayedText).toBe('');
      expect(typewriter.charIndex).toBe(0);

      // Advance past charDelay (0.01 + 0.02 = 0.03)
      const res2 = typewriter.update(0.02);
      expect(res2.charPrinted).toBe(true);
      expect(res2.newChar).toBe('K');
      expect(typewriter.displayedText).toBe('K');
      expect(typewriter.charIndex).toBe(1);

      // Advance next char
      const res3 = typewriter.update(0.03);
      expect(res3.charPrinted).toBe(true);
      expect(res3.newChar).toBe('r');
      expect(typewriter.displayedText).toBe('Kr');
      expect(typewriter.charIndex).toBe(2);

      // Finish remainder
      typewriter.update(0.03); // 'i'
      typewriter.update(0.03); // 's'
      expect(typewriter.displayedText).toBe('Kris');
      expect(typewriter.isFinished).toBe(true);

      // Updating after finished does not print new characters
      const resPost = typewriter.update(0.05);
      expect(resPost.charPrinted).toBe(false);
      expect(typewriter.displayedText).toBe('Kris');
    });
  });

  describe('Punctuation pause handling', () => {
    it('applies an extra pause after punctuation characters (, . ! ?)', () => {
      typewriter.setText('Hi! Go.');
      // Print 'H'
      typewriter.update(0.03);
      expect(typewriter.displayedText).toBe('H');

      // Print 'i'
      typewriter.update(0.03);
      expect(typewriter.displayedText).toBe('Hi');

      // Print '!'
      const exclRes = typewriter.update(0.03);
      expect(exclRes.charPrinted).toBe(true);
      expect(exclRes.newChar).toBe('!');
      expect(typewriter.displayedText).toBe('Hi!');

      // A regular 0.03 update right after '!' should NOT print space because of the punctuation pause
      const pauseRes = typewriter.update(0.03);
      expect(pauseRes.charPrinted).toBe(false);
      expect(typewriter.displayedText).toBe('Hi!');

      // Once the full pause elapsed (~0.25s), next character will print
      const resumeRes = typewriter.update(0.3);
      expect(resumeRes.charPrinted).toBe(true);
      expect(typewriter.displayedText.startsWith('Hi! ')).toBe(true);
    });

    it('pauses appropriately on commas', () => {
      typewriter.setText('A, B');
      typewriter.update(0.03); // 'A'
      typewriter.update(0.03); // ','

      expect(typewriter.displayedText).toBe('A,');
      // Should pause after comma
      const quickUpdate = typewriter.update(0.03);
      expect(quickUpdate.charPrinted).toBe(false);

      // After comma pause (~0.15s), prints next character
      const resume = typewriter.update(0.15);
      expect(resume.charPrinted).toBe(true);
    });
  });

  describe('skipToEnd()', () => {
    it('reveals all text immediately and marks isFinished = true', () => {
      typewriter.setText('The power of fluffy boys shines within you.');
      typewriter.update(0.03); // partial reveal
      expect(typewriter.isFinished).toBe(false);
      expect(typewriter.displayedText.length).toBeLessThan('The power of fluffy boys shines within you.'.length);

      typewriter.skipToEnd();
      expect(typewriter.isFinished).toBe(true);
      expect(typewriter.displayedText).toBe('The power of fluffy boys shines within you.');
      expect(typewriter.charIndex).toBe('The power of fluffy boys shines within you.'.length);
    });
  });

  describe('Tag stripping and parsing', () => {
    it('strips color, shake, and speed tags from displayedText', () => {
      const formatted = '[color=yellow]Yellow[/color] and [color=red][shake]Red Shake[/shake][/color] and [speed=slow]Slow[/speed]';
      typewriter.setText(formatted);

      expect(typewriter.fullText).toBe(formatted);

      typewriter.skipToEnd();
      expect(typewriter.displayedText).toBe('Yellow and Red Shake and Slow');
    });

    it('stores parsed formatting metadata per character', () => {
      typewriter.setText('[color=red]Hi[/color] [shake]Up[/shake]');
      const formattedChars = typewriter.getFormattedCharacters();

      // Check 'H'
      expect(formattedChars[0].char).toBe('H');
      expect(formattedChars[0].color).toBe('red');
      expect(formattedChars[0].shake).toBe(false);

      // Check 'i'
      expect(formattedChars[1].char).toBe('i');
      expect(formattedChars[1].color).toBe('red');

      // Check ' '
      expect(formattedChars[2].char).toBe(' ');
      expect(formattedChars[2].color).toBeUndefined();

      // Check 'U'
      expect(formattedChars[3].char).toBe('U');
      expect(formattedChars[3].shake).toBe(true);

      // Check 'p'
      expect(formattedChars[4].char).toBe('p');
      expect(formattedChars[4].shake).toBe(true);
    });

    it('adjusts typing speed with [speed=slow]', () => {
      typewriter.setText('[speed=slow]A[/speed]B');
      // 'A' has slow speed (~0.08s), so 0.03s is not enough
      const r1 = typewriter.update(0.03);
      expect(r1.charPrinted).toBe(false);

      // 0.06s more brings total to 0.09s >= slow delay
      const r2 = typewriter.update(0.06);
      expect(r2.charPrinted).toBe(true);
      expect(r2.newChar).toBe('A');
    });
  });

  describe('reset()', () => {
    it('resets the typewriter to the beginning of current text', () => {
      typewriter.setText('Reset test');
      typewriter.skipToEnd();
      expect(typewriter.isFinished).toBe(true);
      expect(typewriter.displayedText).toBe('Reset test');

      typewriter.reset();
      expect(typewriter.isFinished).toBe(false);
      expect(typewriter.displayedText).toBe('');
      expect(typewriter.charIndex).toBe(0);
      expect(typewriter.timer).toBe(0);
    });
  });
});

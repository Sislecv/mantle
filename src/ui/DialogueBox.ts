/**
 * Mantle Chapter 1 - NES Dialogue Box System
 * Standard NES 256x240 bottom layout (x=8, y=160, width=240, height=72).
 * Supports portraits, multi-line typewriter text, audio blips, and branching choices.
 */

import { NES_COLORS } from '../core/Constants';
import { Renderer } from '../core/Renderer';
import { ChiptuneSynth } from '../audio/ChiptuneSynth';
import { Typewriter, FormattedChar } from './Typewriter';

export interface DialogueLine {
  speaker?: string;
  text: string;
  portrait?: string;
  choices?: string[];
  onChoice?: (index: number) => void;
}

export class DialogueBox {
  public readonly x: number = 8;
  public readonly y: number = 160;
  public readonly width: number = 240;
  public readonly height: number = 72;

  public isOpen: boolean = false;
  public currentLineIndex: number = 0;
  public selectedChoiceIndex: number = 0;
  public typewriter: Typewriter;

  private lines: DialogueLine[] = [];
  private onCompleteCallback?: () => void;
  private synth: ChiptuneSynth;
  private shakeTimer: number = 0;

  constructor(synth?: ChiptuneSynth) {
    this.synth = synth ?? new ChiptuneSynth();
    this.typewriter = new Typewriter();
  }

  public get currentLine(): DialogueLine | null {
    if (!this.isOpen || this.currentLineIndex >= this.lines.length) {
      return null;
    }
    return this.lines[this.currentLineIndex];
  }

  /**
   * Initializes and displays a sequence of dialogue lines.
   */
  public showDialogue(lines: DialogueLine[], onComplete?: () => void): void {
    if (lines.length === 0) {
      this.close();
      onComplete?.();
      return;
    }

    this.lines = lines;
    this.currentLineIndex = 0;
    this.selectedChoiceIndex = 0;
    this.onCompleteCallback = onComplete;
    this.isOpen = true;
    this.shakeTimer = 0;

    this.typewriter.setText(lines[0].text);
  }

  /**
   * Advances dialogue:
   * - If text is actively typing, skips revelation to end of current page.
   * - If text is finished and choices are present, confirms currently selected choice.
   * - If text is finished and no choices, advances to next line or completes dialogue.
   */
  public advance(): void {
    if (!this.isOpen || !this.currentLine) return;

    if (!this.typewriter.isFinished) {
      this.typewriter.skipToEnd();
      return;
    }

    // Handle choice confirmation
    if (this.currentLine.choices && this.currentLine.choices.length > 0) {
      const choiceIdx = this.selectedChoiceIndex;
      this.synth.playSfx('CONFIRM');
      const callback = this.currentLine.onChoice;
      if (callback) {
        callback(choiceIdx);
      }
      this.goToNextLine();
      return;
    }

    // Normal line progression
    this.synth.playSfx('CONFIRM');
    this.goToNextLine();
  }

  private goToNextLine(): void {
    this.currentLineIndex++;
    if (this.currentLineIndex < this.lines.length) {
      this.selectedChoiceIndex = 0;
      this.typewriter.setText(this.lines[this.currentLineIndex].text);
    } else {
      this.close();
    }
  }

  /**
   * Selects an active choice option and triggers retro selection audio.
   */
  public selectChoice(index: number): void {
    if (!this.isOpen || !this.currentLine?.choices || this.currentLine.choices.length === 0) {
      return;
    }

    const maxIdx = this.currentLine.choices.length - 1;
    const clamped = Math.max(0, Math.min(index, maxIdx));

    this.selectedChoiceIndex = clamped;
    this.synth.playSfx('SELECT');
  }

  /**
   * Closes dialogue box and invokes completion callback.
   */
  public close(): void {
    this.isOpen = false;
    this.lines = [];
    this.currentLineIndex = 0;
    this.selectedChoiceIndex = 0;

    const cb = this.onCompleteCallback;
    this.onCompleteCallback = undefined;
    if (cb) {
      cb();
    }
  }

  /**
   * Updates typewriter timer and plays voice blip when a character is printed.
   */
  public update(dt: number): void {
    if (!this.isOpen || !this.currentLine) return;

    this.shakeTimer += dt;
    const result = this.typewriter.update(dt);

    if (result.charPrinted && result.newChar && result.newChar.trim().length > 0) {
      this.synth.playBlip(this.currentLine.speaker);
    }
  }

  /**
   * Renders NES double-bordered dialogue box, portrait frame, formatted text, and choices.
   */
  public render(renderer: Renderer): void {
    if (!this.isOpen || !this.currentLine) return;

    // 1. Black dialogue box background
    renderer.drawRect(this.x, this.y, this.width, this.height, NES_COLORS.BLACK, true);

    // 2. Double border: Outer white, inner dark cliff
    renderer.drawRect(this.x, this.y, this.width, this.height, NES_COLORS.WHITE, false);
    renderer.drawRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4, NES_COLORS.DARK_CLIFF, false);

    // 3. Left portrait area (if portrait specified)
    let textStartX = this.x + 10;
    const maxCharsPerLine = this.currentLine.portrait ? 26 : 34;

    if (this.currentLine.portrait) {
      const portraitBoxX = this.x + 6;
      const portraitBoxY = this.y + 6;
      const portraitSize = 36;

      // Portrait frame
      renderer.drawRect(portraitBoxX, portraitBoxY, portraitSize, portraitSize, NES_COLORS.DARK_BG, true);
      renderer.drawRect(portraitBoxX, portraitBoxY, portraitSize, portraitSize, NES_COLORS.WHITE, false);

      // Portrait label / monogram
      const pName = this.currentLine.portrait.toUpperCase();
      renderer.drawText(pName.slice(0, 4), portraitBoxX + 4, portraitBoxY + 14, {
        color: NES_COLORS.SOUL_GLOW,
        size: 8,
      });

      textStartX = this.x + 48;
    }

    // 4. Render Typewriter Formatted Characters
    const formattedChars = this.typewriter.getFormattedCharacters();
    const visibleCount = this.typewriter.charIndex;

    let cursorCol = 0;
    let cursorLine = 0;
    const charWidth = 6;
    const lineHeight = 12;

    for (let i = 0; i < visibleCount && i < formattedChars.length; i++) {
      const fc: FormattedChar = formattedChars[i];

      if (fc.char === '\n' || cursorCol >= maxCharsPerLine) {
        cursorCol = 0;
        cursorLine++;
        if (fc.char === '\n') continue;
      }

      let drawX = textStartX + cursorCol * charWidth;
      let drawY = this.y + 8 + cursorLine * lineHeight;

      // Shake effect calculation
      if (fc.shake) {
        const shakeOffset = Math.sin(this.shakeTimer * 35 + i * 2) > 0 ? 1 : -1;
        drawX += shakeOffset;
        drawY += shakeOffset;
      }

      // Color mapping
      let color: string = NES_COLORS.WHITE;
      if (fc.color) {
        const cLower = fc.color.toLowerCase();
        if (cLower === 'yellow') color = NES_COLORS.GOLD_ACCENT;
        else if (cLower === 'red') color = NES_COLORS.SOUL_RED;
        else if (cLower === 'blue') color = NES_COLORS.KRIS_BLUE;
        else if (cLower === 'green') color = NES_COLORS.RALSEI_GREEN;
        else if (cLower === 'purple') color = NES_COLORS.SUSIE_PURPLE;
        else color = fc.color;
      }

      renderer.drawText(fc.char, drawX, drawY, { color, size: 8 });
      cursorCol++;
    }

    // 5. Choices rendering (when typewriter is finished)
    if (this.typewriter.isFinished && this.currentLine.choices && this.currentLine.choices.length > 0) {
      const choiceY = this.y + this.height - 18;
      let choiceX = textStartX;

      this.currentLine.choices.forEach((choice, idx) => {
        const isSelected = idx === this.selectedChoiceIndex;
        const prefix = isSelected ? '▶ ' : '  ';
        const color = isSelected ? NES_COLORS.SOUL_RED : NES_COLORS.WHITE;

        renderer.drawText(`${prefix}${choice}`, choiceX, choiceY, { color, size: 8 });
        choiceX += (choice.length + 3) * charWidth + 12;
      });
    }
  }
}

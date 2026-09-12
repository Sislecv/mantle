/**
 * Mantle Chapter 1 - Typewriter Text Formatter
 * Parses retro formatting tags ([color], [shake], [speed]), handles progressive
 * text revelation with punctuation pauses, and formats retro dialogue strings.
 */

export interface FormattedChar {
  char: string;
  color?: string;
  shake: boolean;
  speedDelay?: number;
}

export interface TypewriterUpdateResult {
  charPrinted: boolean;
  newChar?: string;
}

export class Typewriter {
  public fullText: string = '';
  public displayedText: string = '';
  public isFinished: boolean = true;
  public charIndex: number = 0;
  public timer: number = 0;
  public charDelay: number = 0.03; // Default ~30ms per character

  private pauseTimer: number = 0;
  private parsedChars: FormattedChar[] = [];
  private _plainText: string = '';

  constructor(charDelay: number = 0.03) {
    this.charDelay = charDelay;
  }

  public get plainText(): string {
    return this._plainText;
  }

  public setText(text: string): void {
    this.fullText = text;
    this.parsedChars = this.parseText(text);
    this._plainText = this.parsedChars.map((c) => c.char).join('');
    this.reset();
  }

  public reset(): void {
    this.charIndex = 0;
    this.displayedText = '';
    this.timer = 0;
    this.pauseTimer = 0;
    this.isFinished = this.parsedChars.length === 0;
  }

  public skipToEnd(): void {
    this.charIndex = this.parsedChars.length;
    this.displayedText = this._plainText;
    this.isFinished = true;
    this.timer = 0;
    this.pauseTimer = 0;
  }

  public update(dt: number): TypewriterUpdateResult {
    if (this.isFinished || this.charIndex >= this.parsedChars.length) {
      this.isFinished = true;
      return { charPrinted: false };
    }

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer > 0) {
        return { charPrinted: false };
      }
      const overflow = -this.pauseTimer;
      this.pauseTimer = 0;
      this.timer += overflow;
    } else {
      this.timer += dt;
    }

    const targetChar = this.parsedChars[this.charIndex];
    const requiredDelay = targetChar.speedDelay ?? this.charDelay;

    if (this.timer >= requiredDelay) {
      this.timer -= requiredDelay;
      const newChar = targetChar.char;
      this.charIndex++;
      this.displayedText = this._plainText.slice(0, this.charIndex);

      if (newChar === ',') {
        this.pauseTimer = 0.12;
      } else if (newChar === '.' || newChar === '!' || newChar === '?') {
        this.pauseTimer = 0.22;
      }

      if (this.charIndex >= this.parsedChars.length) {
        this.isFinished = true;
      }

      return { charPrinted: true, newChar };
    }

    return { charPrinted: false };
  }

  public getFormattedCharacters(): FormattedChar[] {
    return this.parsedChars;
  }

  private parseText(raw: string): FormattedChar[] {
    const chars: FormattedChar[] = [];
    const colorStack: string[] = [];
    let shakeCount = 0;
    const speedStack: number[] = [];

    let i = 0;
    while (i < raw.length) {
      if (raw[i] === '[') {
        const closeBracket = raw.indexOf(']', i);
        if (closeBracket !== -1) {
          const tagContent = raw.substring(i + 1, closeBracket).trim();
          let isTag = false;

          if (tagContent.toLowerCase().startsWith('color=')) {
            const colorVal = tagContent.substring(6).trim();
            colorStack.push(colorVal);
            isTag = true;
          } else if (tagContent.toLowerCase() === '/color') {
            colorStack.pop();
            isTag = true;
          } else if (tagContent.toLowerCase() === 'shake') {
            shakeCount++;
            isTag = true;
          } else if (tagContent.toLowerCase() === '/shake') {
            shakeCount = Math.max(0, shakeCount - 1);
            isTag = true;
          } else if (tagContent.toLowerCase().startsWith('speed=')) {
            const speedVal = tagContent.substring(6).trim().toLowerCase();
            let delay = 0.03;
            if (speedVal === 'slow') delay = 0.08;
            else if (speedVal === 'fast') delay = 0.015;
            else if (speedVal === 'normal') delay = 0.03;
            else if (!isNaN(Number(speedVal))) delay = Number(speedVal);
            speedStack.push(delay);
            isTag = true;
          } else if (tagContent.toLowerCase() === '/speed') {
            speedStack.pop();
            isTag = true;
          }

          if (isTag) {
            i = closeBracket + 1;
            continue;
          }
        }
      }

      const char = raw[i];
      chars.push({
        char,
        color: colorStack.length > 0 ? colorStack[colorStack.length - 1] : undefined,
        shake: shakeCount > 0,
        speedDelay: speedStack.length > 0 ? speedStack[speedStack.length - 1] : undefined,
      });
      i++;
    }

    return chars;
  }
}

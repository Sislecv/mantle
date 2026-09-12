/**
 * Mantle Chapter 1 - Boss Battle Engine
 * 8-bit SOUL battle state machine with timing attack reticle, ACT/MERCY mechanics, and party system.
 */

import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { ChiptuneSynth } from '../audio/ChiptuneSynth';
import { NES_COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../core/Constants';
import { BattleBox } from './BattleBox';
import { Soul } from './Soul';
import { Bullet } from './Bullet';
import { BossConfig } from './BossPatterns';
export type { BossConfig, BossAct } from './BossPatterns';

export type BattleState =
  | 'MENU'
  | 'SUBMENU'
  | 'PLAYER_ATTACK'
  | 'ENEMY_ATTACK'
  | 'VICTORY'
  | 'GAME_OVER';

export type MenuCommand = 'FIGHT' | 'ACT' | 'ITEM' | 'SPARE';
export type BattleEndResult = 'SPARE' | 'DEFEAT' | 'FLEE';

export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  color: string;
}

export interface BattleItem {
  name: string;
  description: string;
  healAmount: number;
}

export class BattleEngine {
  public static readonly MENU_COMMANDS: MenuCommand[] = ['FIGHT', 'ACT', 'ITEM', 'SPARE'];

  public state: BattleState = 'MENU';
  public currentBoss: BossConfig | null = null;
  public party: PartyMember[] = [];
  public items: BattleItem[] = [];

  public selectedMenuIndex: number = 0;
  public selectedSubmenuIndex: number = 0;
  public battleResult: BattleEndResult | null = null;

  public box: BattleBox;
  public soul: Soul;
  public activeBullets: Bullet[] = [];

  // Timing Gauge (FIGHT)
  public reticleX: number = 0;
  public reticleSpeed: number = 180;
  public reticleDirection: number = 1;
  public reticleStopped: boolean = false;
  public attackTimer: number = 0;
  public attackDamageDealt: number = 0;

  // Enemy Phase
  public waveTimer: number = 0;
  public waveDuration: number = 6.0;
  public currentPatternIndex: number = 0;

  // Dialogue & Messages
  public dialogueText: string = '';
  public messageTimer: number = 0;

  // End Phase Callbacks & Timers
  public onBattleEnd?: (result: BattleEndResult) => void;
  public victoryTimer: number = 0;

  private synth: ChiptuneSynth | null;

  constructor(synth?: ChiptuneSynth | null) {
    this.box = new BattleBox();
    this.soul = new Soul();
    this.synth = synth !== undefined ? synth : null;
    this.initDefaultParty();
    this.initDefaultItems();
  }

  private initDefaultParty(): void {
    this.party = [
      { name: 'Kris', hp: 20, maxHp: 20, color: NES_COLORS.KRIS_CYAN },
      { name: 'Susie', hp: 30, maxHp: 30, color: NES_COLORS.SUSIE_MAGENTA },
      { name: 'Ralsei', hp: 20, maxHp: 20, color: NES_COLORS.RALSEI_PINK },
    ];
  }

  private initDefaultItems(): void {
    this.items = [
      { name: 'Dark Candy', description: 'Restores 20 HP.', healAmount: 20 },
      { name: 'Rouxles Tea', description: 'Restores 15 HP.', healAmount: 15 },
    ];
  }

  public get selectedMenuAction(): MenuCommand {
    return BattleEngine.MENU_COMMANDS[this.selectedMenuIndex];
  }

  /**
   * Starts a new battle encounter.
   */
  public startBattle(bossConfig: BossConfig, onEnd?: (result: BattleEndResult) => void): void {
    this.currentBoss = bossConfig;
    this.onBattleEnd = onEnd;
    this.state = 'MENU';
    this.selectedMenuIndex = 0;
    this.selectedSubmenuIndex = 0;
    this.battleResult = null;
    this.activeBullets = [];
    this.currentPatternIndex = 0;
    this.box.resetToDefault();
    this.box.snapToTarget();
    this.soul.setPosition(
      this.box.x + this.box.width / 2,
      this.box.y + this.box.height / 2
    );
    this.dialogueText = `* ${bossConfig.name} attacks!`;
  }

  /**
   * Calculates fight damage based on pixel distance from the target center.
   */
  public calculateFightDamage(offset: number): number {
    const gaugeWidth = this.box.width - 20;
    const maxOffset = gaugeWidth / 2;
    const closeness = Math.max(0, 1 - Math.abs(offset) / maxOffset);
    // Perfect center yields 40 damage, outer bounds minimum 8 damage
    return Math.round(8 + 32 * (closeness * closeness));
  }

  /**
   * Starts the player FIGHT reticle minigame.
   */
  public startPlayerAttackPhase(): void {
    this.state = 'PLAYER_ATTACK';
    this.reticleX = this.box.x + 10;
    this.reticleSpeed = 180;
    this.reticleDirection = 1;
    this.reticleStopped = false;
    this.attackTimer = 0;
    this.attackDamageDealt = 0;
  }

  /**
   * Starts the enemy bullet wave phase.
   */
  public startEnemyAttackPhase(): void {
    if (!this.currentBoss) return;

    this.state = 'ENEMY_ATTACK';
    this.waveTimer = this.waveDuration;
    this.soul.iFrames = 0;
    this.box.resetToDefault();
    this.soul.setPosition(
      this.box.x + this.box.width / 2,
      this.box.y + this.box.height / 2
    );

    if (this.currentBoss.patterns.length > 0) {
      const patternFn = this.currentBoss.patterns[
        this.currentPatternIndex % this.currentBoss.patterns.length
      ];
      this.currentPatternIndex++;
      this.activeBullets = patternFn(this.box);
    } else {
      this.activeBullets = [];
    }
  }

  /**
   * Main game loop update logic.
   */
  public update(dt: number, input: InputManager): void {
    this.box.update(dt);

    switch (this.state) {
      case 'MENU':
        this.updateMenuState(input);
        break;

      case 'SUBMENU':
        this.updateSubmenuState(input);
        break;

      case 'PLAYER_ATTACK':
        this.updatePlayerAttackState(dt, input);
        break;

      case 'ENEMY_ATTACK':
        this.updateEnemyAttackState(dt, input);
        break;

      case 'VICTORY':
        this.updateVictoryState(dt, input);
        break;

      case 'GAME_OVER':
        // Game over state
        break;
    }
  }

  private updateMenuState(input: InputManager): void {
    if (input.isJustPressed('left')) {
      this.selectedMenuIndex =
        (this.selectedMenuIndex - 1 + BattleEngine.MENU_COMMANDS.length) %
        BattleEngine.MENU_COMMANDS.length;
      this.synth?.playSfx('SELECT');
    } else if (input.isJustPressed('right')) {
      this.selectedMenuIndex =
        (this.selectedMenuIndex + 1) % BattleEngine.MENU_COMMANDS.length;
      this.synth?.playSfx('SELECT');
    }

    if (input.isJustPressed('action')) {
      this.synth?.playSfx('CONFIRM');
      const action = this.selectedMenuAction;

      switch (action) {
        case 'FIGHT':
          this.startPlayerAttackPhase();
          break;

        case 'ACT':
        case 'ITEM':
          this.state = 'SUBMENU';
          this.selectedSubmenuIndex = 0;
          break;

        case 'SPARE':
          this.handleSpareAction();
          break;
      }
    }
  }

  private handleSpareAction(): void {
    if (!this.currentBoss) return;

    if (this.currentBoss.mercy >= this.currentBoss.maxMercy) {
      this.state = 'VICTORY';
      this.battleResult = 'SPARE';
      this.victoryTimer = 1.2;
      this.synth?.playSfx('LEVEL_UP');
    } else {
      this.dialogueText = `* ${this.currentBoss.name} was not spared.`;
      this.startEnemyAttackPhase();
    }
  }

  private updateSubmenuState(input: InputManager): void {
    const isActMenu = this.selectedMenuAction === 'ACT';
    const totalOptions = isActMenu
      ? (this.currentBoss?.acts.length ?? 0)
      : this.items.length;

    if (input.isJustPressed('cancel')) {
      this.state = 'MENU';
      this.synth?.playSfx('SELECT');
      return;
    }

    if (totalOptions > 0) {
      if (input.isJustPressed('up')) {
        this.selectedSubmenuIndex =
          (this.selectedSubmenuIndex - 1 + totalOptions) % totalOptions;
        this.synth?.playSfx('SELECT');
      } else if (input.isJustPressed('down')) {
        this.selectedSubmenuIndex =
          (this.selectedSubmenuIndex + 1) % totalOptions;
        this.synth?.playSfx('SELECT');
      }
    }

    if (input.isJustPressed('action')) {
      this.synth?.playSfx('CONFIRM');

      if (isActMenu && this.currentBoss) {
        const act = this.currentBoss.acts[this.selectedSubmenuIndex];
        if (act) {
          this.currentBoss.mercy = Math.min(
            this.currentBoss.maxMercy,
            this.currentBoss.mercy + act.mercyGain
          );
          this.dialogueText = act.dialogue;
          this.startEnemyAttackPhase();
        }
      } else if (!isActMenu && this.items.length > 0) {
        const item = this.items[this.selectedSubmenuIndex];
        if (item) {
          // Heal Kris
          this.party[0].hp = Math.min(this.party[0].maxHp, this.party[0].hp + item.healAmount);
          this.dialogueText = `Used ${item.name}! Recovered ${item.healAmount} HP.`;
          this.startEnemyAttackPhase();
        }
      }
    }
  }

  private updatePlayerAttackState(dt: number, input: InputManager): void {
    const gaugeLeft = this.box.x + 10;
    const gaugeRight = this.box.x + this.box.width - 10;
    const targetCenter = (gaugeLeft + gaugeRight) / 2;

    if (!this.reticleStopped) {
      this.reticleX += this.reticleSpeed * this.reticleDirection * dt;
      if (this.reticleX >= gaugeRight) {
        this.reticleX = gaugeRight;
        this.reticleDirection = -1;
      } else if (this.reticleX <= gaugeLeft) {
        this.reticleX = gaugeLeft;
        this.reticleDirection = 1;
      }

      if (input.isJustPressed('action')) {
        this.reticleStopped = true;
        const offset = this.reticleX - targetCenter;
        this.attackDamageDealt = this.calculateFightDamage(offset);

        if (this.currentBoss) {
          this.currentBoss.hp = Math.max(0, this.currentBoss.hp - this.attackDamageDealt);
          if (this.currentBoss.hp <= 0) {
            this.state = 'VICTORY';
            this.battleResult = 'DEFEAT';
            this.victoryTimer = 1.2;
            this.synth?.playSfx('LEVEL_UP');
            return;
          }
        }

        this.synth?.playSfx('SWORD_SLASH');
        this.attackTimer = 0.6; // brief pause to display damage
      }
    } else {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.startEnemyAttackPhase();
      }
    }
  }

  private updateEnemyAttackState(dt: number, input: InputManager): void {
    this.soul.update(dt, input, this.box);

    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      const bullet = this.activeBullets[i];
      bullet.update(dt, this.soul);

      if (!bullet.active) {
        this.activeBullets.splice(i, 1);
        continue;
      }

      if (bullet.checkCollision(this.soul)) {
        if (this.soul.takeDamage(1.0)) {
          // Kris takes bullet damage
          this.party[0].hp = Math.max(0, this.party[0].hp - bullet.damage);
          this.synth?.playSfx('HURT');

          if (this.party[0].hp <= 0) {
            this.state = 'GAME_OVER';
            return;
          }
        }
      }
    }

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.activeBullets = [];
      this.box.resetToDefault();
      this.selectedMenuIndex = 0;
      this.selectedSubmenuIndex = 0;
      this.state = 'MENU';
    }
  }

  private updateVictoryState(dt: number, input: InputManager): void {
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
    }

    if (this.victoryTimer <= 0 || input.isJustPressed('action')) {
      if (this.onBattleEnd && this.battleResult) {
        this.onBattleEnd(this.battleResult);
      }
    }
  }

  /**
   * Renders the complete battle scene.
   */
  public render(renderer: Renderer): void {
    // Clear screen with Dark World BG
    renderer.clear(NES_COLORS.DARK_BG);

    // 1. Render Boss Entity & Status at top
    this.renderBossHeader(renderer);

    // 2. Render Battle Box Arena
    this.box.render(renderer);

    // 3. Render State-specific Contents inside or on Box
    switch (this.state) {
      case 'MENU':
        this.renderMenu(renderer);
        break;

      case 'SUBMENU':
        this.renderSubmenu(renderer);
        break;

      case 'PLAYER_ATTACK':
        this.renderPlayerAttack(renderer);
        break;

      case 'ENEMY_ATTACK':
        this.renderEnemyAttack(renderer);
        break;

      case 'VICTORY':
        this.renderVictory(renderer);
        break;

      case 'GAME_OVER':
        this.renderGameOver(renderer);
        break;
    }

    // 4. Render Party Members Status at bottom
    this.renderPartyStatus(renderer);
  }

  private renderBossHeader(renderer: Renderer): void {
    if (!this.currentBoss) return;

    // Boss Name
    renderer.drawText(this.currentBoss.name, 20, 16, {
      color: NES_COLORS.WHITE,
      size: 8,
    });

    // Boss HP Bar
    const hpBarX = 100;
    const hpBarY = 16;
    const hpBarW = 70;
    const hpBarH = 6;
    const hpRatio = this.currentBoss.maxHp > 0
      ? Math.max(0, Math.min(1, this.currentBoss.hp / this.currentBoss.maxHp))
      : 0;

    renderer.drawRect(hpBarX, hpBarY, hpBarW, hpBarH, NES_COLORS.GRAY_DARK, true);
    renderer.drawRect(hpBarX, hpBarY, Math.floor(hpBarW * hpRatio), hpBarH, NES_COLORS.RALSEI_GREEN, true);

    // Mercy Bar
    const mercyBarX = 180;
    const mercyRatio = this.currentBoss.maxMercy > 0
      ? Math.max(0, Math.min(1, this.currentBoss.mercy / this.currentBoss.maxMercy))
      : 0;

    renderer.drawRect(mercyBarX, hpBarY, 50, hpBarH, NES_COLORS.GRAY_DARK, true);
    renderer.drawRect(mercyBarX, hpBarY, Math.floor(50 * mercyRatio), hpBarH, NES_COLORS.GOLD_ACCENT, true);

    // Stylized Boss Figure Primitives
    const bossCenterX = CANVAS_WIDTH / 2;
    const bossCenterY = 65;
    renderer.drawRect(bossCenterX - 16, bossCenterY - 16, 32, 32, NES_COLORS.DARK_ACCENT, true);
    renderer.drawRect(bossCenterX - 12, bossCenterY - 12, 24, 24, NES_COLORS.WHITE, false);
  }

  private renderMenu(renderer: Renderer): void {
    // Dialogue inside box
    renderer.drawText(this.dialogueText, this.box.x + 8, this.box.y + 8, {
      color: NES_COLORS.WHITE,
      size: 8,
    });

    // 4 Commands below box
    const startX = 24;
    const commandSpacing = 54;
    const y = this.box.y + this.box.height + 10;

    for (let i = 0; i < BattleEngine.MENU_COMMANDS.length; i++) {
      const cmd = BattleEngine.MENU_COMMANDS[i];
      const isSelected = i === this.selectedMenuIndex;
      const x = startX + i * commandSpacing;

      if (isSelected) {
        // Red SOUL icon beside selected command
        renderer.drawRect(x - 8, y + 2, 4, 4, NES_COLORS.SOUL_RED, true);
      }

      renderer.drawText(cmd, x, y, {
        color: isSelected ? NES_COLORS.GOLD_ACCENT : NES_COLORS.WHITE,
        size: 8,
      });
    }
  }

  private renderSubmenu(renderer: Renderer): void {
    const isActMenu = this.selectedMenuAction === 'ACT';
    const options = isActMenu
      ? (this.currentBoss?.acts ?? []).map((a) => a.name)
      : this.items.map((it) => it.name);

    for (let i = 0; i < options.length; i++) {
      const isSelected = i === this.selectedSubmenuIndex;
      const optY = this.box.y + 8 + i * 14;

      if (isSelected) {
        renderer.drawRect(this.box.x + 8, optY + 2, 4, 4, NES_COLORS.SOUL_RED, true);
      }

      renderer.drawText(options[i], this.box.x + 18, optY, {
        color: isSelected ? NES_COLORS.GOLD_ACCENT : NES_COLORS.WHITE,
        size: 8,
      });
    }
  }

  private renderPlayerAttack(renderer: Renderer): void {
    const gaugeLeft = this.box.x + 10;
    const gaugeRight = this.box.x + this.box.width - 10;
    const gaugeWidth = gaugeRight - gaugeLeft;
    const gaugeY = this.box.y + this.box.height / 2 - 4;

    // Gauge track
    renderer.drawRect(gaugeLeft, gaugeY, gaugeWidth, 8, NES_COLORS.GRAY_DARK, true);
    // Sweet spot target in center
    const targetCenter = (gaugeLeft + gaugeRight) / 2;
    renderer.drawRect(targetCenter - 4, gaugeY, 8, 8, NES_COLORS.GOLD_ACCENT, true);

    // Reticle line
    renderer.drawRect(Math.floor(this.reticleX) - 1, gaugeY - 2, 3, 12, NES_COLORS.WHITE, true);

    // If damage dealt, show damage pop-up
    if (this.reticleStopped && this.attackDamageDealt > 0) {
      renderer.drawText(
        `${this.attackDamageDealt}`,
        CANVAS_WIDTH / 2 - 8,
        this.box.y - 14,
        { color: NES_COLORS.SOUL_RED, size: 8 }
      );
    }
  }

  private renderEnemyAttack(renderer: Renderer): void {
    this.soul.render(renderer);
    for (const bullet of this.activeBullets) {
      bullet.render(renderer);
    }
  }

  private renderVictory(renderer: Renderer): void {
    const text = this.battleResult === 'SPARE' ? 'YOU WON!' : 'VICTORY!';
    renderer.drawText(text, this.box.x + 16, this.box.y + 16, {
      color: NES_COLORS.GOLD_ACCENT,
      size: 8,
    });
    renderer.drawText(
      this.battleResult === 'SPARE' ? '* The foe was spared.' : '* Foe was defeated.',
      this.box.x + 16,
      this.box.y + 30,
      { color: NES_COLORS.WHITE, size: 8 }
    );
  }

  private renderGameOver(renderer: Renderer): void {
    renderer.drawText('THE FUTURE RESTS WITH YOU', this.box.x + 6, this.box.y + 24, {
      color: NES_COLORS.SOUL_RED,
      size: 8,
    });
  }

  private renderPartyStatus(renderer: Renderer): void {
    const startX = 20;
    const memberSpacing = 76;
    const y = CANVAS_HEIGHT - 24;

    for (let i = 0; i < this.party.length; i++) {
      const member = this.party[i];
      const x = startX + i * memberSpacing;

      // Member Name
      renderer.drawText(member.name, x, y, {
        color: member.color,
        size: 8,
      });

      // HP text
      renderer.drawText(`HP ${member.hp}/${member.maxHp}`, x, y + 10, {
        color: NES_COLORS.WHITE,
        size: 8,
      });
    }
  }
}

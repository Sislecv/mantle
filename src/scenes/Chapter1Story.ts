/**
 * Mantle Chapter 1 - Story Director & Walkthrough Orchestrator
 * Coordinates the full playable walkthrough across the 5 Dark World zones:
 * Dark Cliffs, Castle Town, Field of Hopes and Dreams, Scarlet Forest, and Card Castle.
 * Seamlessly manages overworld exploration, party dynamics, puzzles, boss encounters, and epilogue.
 */

import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { ChiptuneSynth } from '../audio/ChiptuneSynth';
import { ZoneManager, ZONE_IDS } from '../map/ZoneManager';
import { Player } from '../entities/Player';
import { Follower } from '../entities/Follower';
import { DialogueBox } from '../ui/DialogueBox';
import { BattleEngine, BattleEndResult } from '../battle/BattleEngine';
import {
  LANCER_BOSS_CONFIG,
  K_ROUND_BOSS_CONFIG,
  KING_BOSS_CONFIG,
} from '../battle/BossPatterns';
import { SuitPlatePuzzle } from '../puzzles/SuitPlatePuzzle';
import { BoxPushPuzzle, RouxlsKaardPuzzle } from '../puzzles/BoxPushPuzzle';
import { NES_COLORS, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../core/Constants';
import { Hud } from '../ui/Hud';
import { SpriteLoader } from '../core/SpriteLoader';

export type StoryMode = 'OVERWORLD' | 'BATTLE' | 'DIALOGUE' | 'EPILOGUE';

export type StoryStage =
  | 'PROLOGUE'
  | 'MET_SUSIE'
  | 'SWORD_PULLED'
  | 'RALSEI_JOINED'
  | 'LANCER_BATTLE'
  | 'LANCER_DEFEATED'
  | 'FIELD_EXPLORATION'
  | 'SUIT_PUZZLE_SOLVED'
  | 'BOX_PUZZLE_SOLVED'
  | 'K_ROUND_BATTLE'
  | 'K_ROUND_DEFEATED'
  | 'ROUXLS_PUZZLE'
  | 'ROUXLS_SOLVED'
  | 'KING_BATTLE'
  | 'KING_DEFEATED'
  | 'FOUNTAIN_EPILOGUE'
  | 'COMPLETED';

export interface Chapter1StoryOptions {
  renderer?: Renderer;
  synth?: ChiptuneSynth;
  input?: InputManager;
}

export class Chapter1Story {
  public zoneManager: ZoneManager;
  public player: Player;
  public susieFollower: Follower;
  public ralseiFollower: Follower;
  public battleEngine: BattleEngine;
  public dialogueBox: DialogueBox;
  public hud: Hud;
  public synth: ChiptuneSynth;
  public input: InputManager | null;

  public suitPuzzle: SuitPlatePuzzle;
  public boxPuzzle: BoxPushPuzzle;
  public rouxlsPuzzle: RouxlsKaardPuzzle;

  public mode: StoryMode = 'OVERWORLD';
  public stage: StoryStage = 'PROLOGUE';

  public greatDoorOpened: boolean = false;
  public fieldSpikesDeactivated: boolean = false;
  public fieldGateLowered: boolean = false;
  public castleGateOpened: boolean = false;
  public isFountainSealed: boolean = false;
  public whiteoutAlpha: number = 0;
  public epilogueText: string = '';

  constructor(options?: Chapter1StoryOptions) {
    this.synth = options?.synth ?? new ChiptuneSynth();
    this.input = options?.input ?? null;
    this.zoneManager = new ZoneManager();

    this.player = new Player({
      x: this.zoneManager.playerSpawnX * TILE_SIZE,
      y: this.zoneManager.playerSpawnY * TILE_SIZE,
      state: 'UNARMED',
      hasSword: false,
    });

    this.susieFollower = new Follower({
      name: 'SUSIE',
      x: this.player.x,
      y: this.player.y,
      leader: null,
      trailDistance: 16,
    });

    this.ralseiFollower = new Follower({
      name: 'RALSEI',
      x: this.player.x,
      y: this.player.y,
      leader: null,
      trailDistance: 16,
    });

    this.dialogueBox = new DialogueBox(this.synth);
    this.battleEngine = new BattleEngine(this.synth);
    this.hud = new Hud();

    SpriteLoader.initCoreSprites();

    this.suitPuzzle = new SuitPlatePuzzle({
      id: 'field_suit_puzzle',
      targetSequence: ['SPADE', 'HEART', 'DIAMOND'],
      plates: [
        { suit: 'SPADE', gridX: 2, gridY: 4 },
        { suit: 'HEART', gridX: 4, gridY: 4 },
        { suit: 'DIAMOND', gridX: 6, gridY: 4 },
        { suit: 'CLUB', gridX: 8, gridY: 4 },
      ],
      audio: this.synth,
      onSolveCallback: () => {
        this.fieldSpikesDeactivated = true;
        this.stage = 'SUIT_PUZZLE_SOLVED';
      },
    });

    this.boxPuzzle = new BoxPushPuzzle({
      id: 'field_box_puzzle',
      crates: [{ id: 'field_crate_1', gridX: 3, gridY: 5 }],
      plates: [{ id: 'field_plate_1', gridX: 4, gridY: 5 }],
      audio: this.synth,
      onSolveCallback: () => {
        this.fieldGateLowered = true;
        this.stage = 'BOX_PUZZLE_SOLVED';
      },
    });

    this.rouxlsPuzzle = new RouxlsKaardPuzzle(this.synth);
    this.rouxlsPuzzle.onSolveCallback = () => {
      this.castleGateOpened = true;
      this.stage = 'ROUXLS_SOLVED';
    };
  }

  public get isSusieInParty(): boolean {
    return this.susieFollower.leader !== null;
  }

  public get isRalseiInParty(): boolean {
    return this.ralseiFollower.leader !== null;
  }

  /**
   * Triggers Susie introductory dialogue encounter in Prologue.
   */
  public triggerSusieDialogue(): void {
    this.mode = 'DIALOGUE';
    this.dialogueBox.showDialogue(
      [
        {
          speaker: 'SUSIE',
          text: 'Kris?! Where the hell are we?! Let\'s get moving.',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
        this.stage = 'MET_SUSIE';
      }
    );
  }

  /**
   * Initiates Kris pulling the Hero Sword from the pedestal.
   */
  public interactSwordPedestal(): void {
    if (this.player.hasSword) return;
    this.synth.playSfx('SWORD_PULL');
    this.player.pullSword(1.0);
  }

  /**
   * Triggers encounter with Prince Ralsei in Castle Town.
   */
  public meetRalsei(): void {
    this.mode = 'DIALOGUE';
    this.ralseiFollower.setLeader(this.player);
    this.dialogueBox.showDialogue(
      [
        {
          speaker: 'RALSEI',
          text: '* Once upon a time, a LEGEND was whispered among shadows...\n* It was the Legend of Delta Rune.',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
        this.stage = 'RALSEI_JOINED';
      }
    );
  }

  /**
   * Transitions into Field of Hopes and Dreams with full trio conga line.
   */
  public enterField(): void {
    this.zoneManager.loadZone(ZONE_IDS.FIELD);
    this.player.x = this.zoneManager.playerSpawnX * TILE_SIZE;
    this.player.y = this.zoneManager.playerSpawnY * TILE_SIZE;

    this.susieFollower.setLeader(this.player);
    this.ralseiFollower.setLeader(this.susieFollower);
    this.susieFollower.x = this.player.x - 16;
    this.susieFollower.y = this.player.y;
    this.ralseiFollower.x = this.player.x - 32;
    this.ralseiFollower.y = this.player.y;

    this.stage = 'FIELD_EXPLORATION';
  }

  /**
   * Transitions into Card Castle.
   */
  public enterCastle(): void {
    this.zoneManager.loadZone(ZONE_IDS.CASTLE);
    this.player.x = this.zoneManager.playerSpawnX * TILE_SIZE;
    this.player.y = this.zoneManager.playerSpawnY * TILE_SIZE;
  }

  /**
   * Initiates Rouxls Kaard comedic puzzle encounter.
   */
  public startRouxlsPuzzle(): void {
    this.stage = 'ROUXLS_PUZZLE';
    this.mode = 'DIALOGUE';
    const lines = this.rouxlsPuzzle.getDialogue();
    this.dialogueBox.showDialogue(
      lines.map((text) => ({ speaker: 'ROUXLS', text })),
      () => {
        this.mode = 'OVERWORLD';
      }
    );
  }

  /**
   * Starts first boss encounter: Lancer.
   */
  public startLancerBattle(): void {
    this.mode = 'BATTLE';
    this.stage = 'LANCER_BATTLE';
    this.battleEngine.startBattle(LANCER_BOSS_CONFIG, (result) => {
      this.onLancerBattleEnd(result);
    });
  }

  private onLancerBattleEnd(_result: BattleEndResult): void {
    this.greatDoorOpened = true;
    this.stage = 'LANCER_DEFEATED';
    this.mode = 'DIALOGUE';
    this.dialogueBox.showDialogue(
      [
        {
          speaker: 'LANCER',
          text: 'Ho ho ho! You haven\'t seen the last of me!',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
      }
    );
  }

  /**
   * Starts mini-boss encounter: K. Round.
   */
  public startKRoundBattle(): void {
    this.mode = 'BATTLE';
    this.stage = 'K_ROUND_BATTLE';
    this.battleEngine.startBattle(K_ROUND_BOSS_CONFIG, (result) => {
      this.onKRoundBattleEnd(result);
    });
  }

  private onKRoundBattleEnd(_result: BattleEndResult): void {
    this.stage = 'K_ROUND_DEFEATED';
    this.mode = 'OVERWORLD';
  }

  /**
   * Starts final boss encounter: Chaos King.
   */
  public startKingBattle(): void {
    this.mode = 'BATTLE';
    this.stage = 'KING_BATTLE';
    this.battleEngine.startBattle(KING_BOSS_CONFIG, (result) => {
      this.onKingBattleEnd(result);
    });
  }

  private onKingBattleEnd(_result: BattleEndResult): void {
    this.stage = 'KING_DEFEATED';
    this.mode = 'OVERWORLD';
  }

  /**
   * Seals the Dark Fountain epilogue.
   */
  public sealDarkFountain(): void {
    this.mode = 'EPILOGUE';
    this.stage = 'FOUNTAIN_EPILOGUE';
    this.isFountainSealed = true;
    this.whiteoutAlpha = 0;
    this.synth.playSfx('LEVEL_UP');
    this.epilogueText = 'You sealed the Dark Fountain and saved the world!';
  }

  /**
   * Restarts the walkthrough back to Prologue state.
   */
  public restart(): void {
    this.zoneManager.loadZone(ZONE_IDS.CLIFFS);
    this.player = new Player({
      x: this.zoneManager.playerSpawnX * TILE_SIZE,
      y: this.zoneManager.playerSpawnY * TILE_SIZE,
      state: 'UNARMED',
      hasSword: false,
    });
    this.susieFollower.setLeader(null);
    this.ralseiFollower.setLeader(null);
    this.susieFollower.breadcrumbs = [];
    this.ralseiFollower.breadcrumbs = [];
    this.mode = 'OVERWORLD';
    this.stage = 'PROLOGUE';
    this.isFountainSealed = false;
    this.whiteoutAlpha = 0;
    this.epilogueText = '';
    this.greatDoorOpened = false;
    this.fieldSpikesDeactivated = false;
    this.fieldGateLowered = false;
    this.castleGateOpened = false;
    this.suitPuzzle.reset();
    this.boxPuzzle.reset();
    this.rouxlsPuzzle.reset();
  }

  /**
   * Main story tick update.
   */
  public update(dt: number, inputOverride?: InputManager): void {
    const activeInput = inputOverride ?? this.input ?? undefined;

    // 1. Epilogue Phase
    if (this.mode === 'EPILOGUE') {
      if (this.whiteoutAlpha < 1) {
        this.whiteoutAlpha = Math.min(1, this.whiteoutAlpha + dt * 0.8);
      }
      if (activeInput && activeInput.isJustPressed('action')) {
        this.restart();
      }
      return;
    }

    // 2. Battle Phase
    if (this.mode === 'BATTLE') {
      if (activeInput) {
        this.battleEngine.update(dt, activeInput);
      }
      return;
    }

    // 3. Dialogue Phase
    if (this.dialogueBox.isOpen) {
      this.dialogueBox.update(dt);
      if (activeInput?.isJustPressed('action')) {
        this.dialogueBox.advance();
      }
      return;
    }

    // 4. Overworld Phase
    const currentZone = this.zoneManager.getCurrentZone();

    this.player.update(dt, currentZone.tilemap, activeInput, currentZone.obstacles);

    // Sync sword state and stage
    if (this.player.state === 'ARMED' && !this.player.hasSword) {
      this.player.hasSword = true;
    }
    if (this.player.hasSword && (this.stage === 'PROLOGUE' || this.stage === 'MET_SUSIE')) {
      this.stage = 'SWORD_PULLED';
      if (this.player.lv < 3) {
        this.player.lv = 3; // unlock high-level obstacle destruction
      }
    }

    // Update active followers
    if (this.isSusieInParty) {
      this.susieFollower.update(dt, currentZone.tilemap, this.player);
    }
    if (this.isRalseiInParty) {
      const leader = this.isSusieInParty ? this.susieFollower : this.player;
      this.ralseiFollower.update(dt, currentZone.tilemap, leader);
    }

    // Zone Interactive Triggers
    const pGridX = Math.floor((this.player.x + 8) / TILE_SIZE);
    const pGridY = Math.floor((this.player.y + 8) / TILE_SIZE);

    if (currentZone.id === ZONE_IDS.CLIFFS) {
      if (this.stage === 'PROLOGUE' && pGridX >= 9 && pGridY >= 6) {
        this.triggerSusieDialogue();
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE_TOWN) {
      if (!this.player.hasSword && pGridX === 8 && pGridY === 7) {
        if (activeInput?.isJustPressed('action')) {
          this.interactSwordPedestal();
        }
      }
      if (this.player.hasSword && !this.isRalseiInParty && pGridX >= 9) {
        this.meetRalsei();
      }
      if (this.stage === 'RALSEI_JOINED' && pGridX >= 12) {
        this.startLancerBattle();
      }
    } else if (currentZone.id === ZONE_IDS.FIELD) {
      this.suitPuzzle.update(this.player);
      this.boxPuzzle.update(this.player, currentZone.tilemap);

      if (
        (this.stage === 'SUIT_PUZZLE_SOLVED' || this.stage === 'BOX_PUZZLE_SOLVED' || this.stage === 'FIELD_EXPLORATION') &&
        pGridX >= 11 &&
        pGridY === 7
      ) {
        this.startKRoundBattle();
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE) {
      if (this.stage === 'K_ROUND_DEFEATED' && pGridX >= 3 && pGridY >= 4) {
        this.startRouxlsPuzzle();
      }
      this.rouxlsPuzzle.update(this.player, currentZone.tilemap);

      if ((this.stage === 'ROUXLS_SOLVED' || this.stage === 'K_ROUND_DEFEATED') && pGridX === 8 && pGridY <= 2) {
        this.startKingBattle();
      }

      if (this.stage === 'KING_DEFEATED' && pGridX === 8 && pGridY <= 1) {
        this.sealDarkFountain();
      }
    }

    // Zone Transitions
    const transition = this.zoneManager.checkTransition(pGridX, pGridY);
    if (transition) {
      let allowTransition = true;
      if (
        currentZone.id === ZONE_IDS.CASTLE_TOWN &&
        transition.targetZoneId === ZONE_IDS.FIELD &&
        !this.greatDoorOpened
      ) {
        allowTransition = false;
      }
      if (allowTransition) {
        this.zoneManager.triggerTransition(
          transition.targetZoneId,
          transition.targetSpawnX,
          transition.targetSpawnY
        );
        this.player.x = transition.targetSpawnX * TILE_SIZE;
        this.player.y = transition.targetSpawnY * TILE_SIZE;

        if (transition.targetZoneId === ZONE_IDS.FIELD && !this.isSusieInParty) {
          this.enterField();
        } else if (transition.targetZoneId === ZONE_IDS.CASTLE) {
          this.enterCastle();
        }
      }
    }
  }

  /**
   * Primary frame render routine.
   */
  public render(renderer: Renderer): void {
    if (this.mode === 'BATTLE') {
      this.battleEngine.render(renderer);
      if (this.dialogueBox.isOpen) {
        this.dialogueBox.render(renderer);
      }
      return;
    }

    if (this.mode === 'EPILOGUE') {
      renderer.clear(NES_COLORS.DARK_BG);

      // Render glowing fountain light beam
      const beamWidth = 32;
      const bx = CANVAS_WIDTH / 2 - beamWidth / 2;
      renderer.drawRect(bx, 0, beamWidth, CANVAS_HEIGHT, '#40C0E0');
      renderer.drawRect(bx + 6, 0, beamWidth - 12, CANVAS_HEIGHT, NES_COLORS.WHITE);

      // Whiteout overlay
      if (this.whiteoutAlpha > 0) {
        renderer.ctx.save();
        renderer.ctx.fillStyle = NES_COLORS.WHITE;
        renderer.ctx.globalAlpha = Math.min(1, this.whiteoutAlpha);
        renderer.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        renderer.ctx.restore();
      }

      if (this.whiteoutAlpha >= 0.5) {
        renderer.drawText(this.epilogueText, CANVAS_WIDTH / 2, 70, {
          color: NES_COLORS.GOLD_ACCENT,
          align: 'center',
          size: 8,
        });
        renderer.drawText('CHAPTER 1 - COMPLETED', CANVAS_WIDTH / 2, 100, {
          color: NES_COLORS.BLACK,
          align: 'center',
          size: 10,
        });
        renderer.drawText('[ Press Z to Restart ]', CANVAS_WIDTH / 2, 130, {
          color: '#404040',
          align: 'center',
          size: 8,
        });
      }
      return;
    }

    // Overworld Rendering
    const currentZone = this.zoneManager.getCurrentZone();
    this.zoneManager.render(renderer);

    // Zone props & puzzle rendering
    if (currentZone.id === ZONE_IDS.CLIFFS) {
      if (!this.isSusieInParty) {
        // Susie NPC waiting at slope base (9, 7)
        if (SpriteLoader.has('ch3_susie_down_0') && SpriteLoader.getSpriteInfo('ch3_susie_down_0')?.loaded) {
          SpriteLoader.draw(renderer.ctx, 'ch3_susie_down_0', 9 * TILE_SIZE, 7 * TILE_SIZE, 16, 16);
        } else if (SpriteLoader.has('susie') && SpriteLoader.getSpriteInfo('susie')?.loaded) {
          SpriteLoader.draw(renderer.ctx, 'susie', 9 * TILE_SIZE, 7 * TILE_SIZE, 16, 16);
        } else {
          renderer.drawRect(9 * TILE_SIZE, 7 * TILE_SIZE, TILE_SIZE, TILE_SIZE, NES_COLORS.SUSIE_MAGENTA);
          renderer.drawText('S', 9 * TILE_SIZE + 4, 7 * TILE_SIZE + 4, {
            color: NES_COLORS.WHITE,
            size: 8,
          });
        }
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE_TOWN) {
      if (!this.player.hasSword) {
        // Glowing Hero Sword on Pedestal
        renderer.drawRect(8 * TILE_SIZE + 6, 7 * TILE_SIZE + 2, 4, 12, NES_COLORS.KRIS_CYAN);
        renderer.drawRect(8 * TILE_SIZE + 3, 7 * TILE_SIZE + 10, 10, 3, NES_COLORS.GOLD_ACCENT);
      }
      if (!this.isRalseiInParty) {
        // Ralsei NPC waiting at (10, 7)
        if (SpriteLoader.has('ralsei') && SpriteLoader.getSpriteInfo('ralsei')?.loaded) {
          SpriteLoader.draw(renderer.ctx, 'ralsei', 10 * TILE_SIZE, 7 * TILE_SIZE - 4, 16, 24);
        } else {
          renderer.drawRect(10 * TILE_SIZE, 7 * TILE_SIZE, TILE_SIZE, TILE_SIZE, NES_COLORS.RALSEI_PINK);
          renderer.drawText('R', 10 * TILE_SIZE + 4, 7 * TILE_SIZE + 4, {
            color: NES_COLORS.WHITE,
            size: 8,
          });
        }
      }
      if (!this.greatDoorOpened) {
        // The Great Door blocking east exit (15, 7)
        renderer.drawRect(15 * TILE_SIZE, 6 * TILE_SIZE, TILE_SIZE, TILE_SIZE * 3, '#3B2B4E');
        renderer.drawRect(15 * TILE_SIZE, 6 * TILE_SIZE, TILE_SIZE, TILE_SIZE * 3, NES_COLORS.GOLD_ACCENT, false);
      }
    } else if (currentZone.id === ZONE_IDS.FIELD) {
      this.suitPuzzle.render(renderer);
      this.boxPuzzle.render(renderer);

      if (!this.fieldSpikesDeactivated) {
        // Electric spike barrier at east path
        renderer.drawRect(14 * TILE_SIZE, 6 * TILE_SIZE, 6, TILE_SIZE * 3, '#FFE040');
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE) {
      this.rouxlsPuzzle.render(renderer);

      // Dark Fountain in throne room
      renderer.drawRect(8 * TILE_SIZE - 4, 0, 24, 24, '#40C0E0');
      renderer.drawRect(8 * TILE_SIZE + 2, 0, 12, 24, NES_COLORS.WHITE);
    }

    // Render Followers in reverse order (Ralsei -> Susie) so leader overlays
    if (this.isRalseiInParty) {
      this.ralseiFollower.render(renderer);
    }
    if (this.isSusieInParty) {
      this.susieFollower.render(renderer);
    }

    // Render Player
    this.player.render(renderer);

    // Render DialogueBox if active
    if (this.dialogueBox.isOpen) {
      this.dialogueBox.render(renderer);
    }

    // Overworld Authentic Chapter 3 Mantle Top HUD
    this.renderHUD(renderer, currentZone.name);
  }

  private renderHUD(renderer: Renderer, zoneName: string): void {
    this.hud.render(renderer, {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      hasSword: this.player.hasSword,
      swordCharges: 4,
      maxSwordCharges: 4,
      lv: this.player.lv,
      roomName: zoneName,
    });
  }
}

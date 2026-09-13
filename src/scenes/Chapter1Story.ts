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
  public notificationText: string = '';
  public notificationTimer: number = 0;
  public transitionCooldown: number = 0;

  public showNotification(text: string, duration = 2.0): void {
    this.notificationText = text;
    this.notificationTimer = duration;
  }

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
        const zone = this.zoneManager.getCurrentZone();
        zone.obstacles
          .filter((o) => o.id.startsWith('field_spike'))
          .forEach((o) => o.destroy());
        this.showNotification('Electric barrier deactivated!', 2.0);
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
        const zone = this.zoneManager.getCurrentZone();
        zone.obstacles
          .filter((o) => o.id.startsWith('field_gate'))
          .forEach((o) => o.destroy());
        this.showNotification('The heavy gate lowered!', 2.0);
      },
    });

    this.rouxlsPuzzle = new RouxlsKaardPuzzle(this.synth);
    this.rouxlsPuzzle.onSolveCallback = () => {
      this.castleGateOpened = true;
      this.stage = 'ROUXLS_SOLVED';
      const castle = this.zoneManager.getCurrentZone();
      const gate = castle.obstacles.find((o) => o.id === 'castle_gate_1');
      if (gate) gate.destroy();

      this.mode = 'DIALOGUE';
      const solveLines = this.rouxlsPuzzle.getSolveDialogue();
      this.dialogueBox.showDialogue(
        solveLines.map((text) => ({ speaker: 'ROUXLS', text })),
        () => {
          this.mode = 'OVERWORLD';
        }
      );
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
          portrait: 'susie',
          text: 'Kris?! Where the hell are we?! Let\'s smash this gate and get moving.',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
        this.stage = 'MET_SUSIE';
        this.synth.playSfx('OBSTACLE_DESTROY');
        const currentZone = this.zoneManager.getCurrentZone();
        currentZone.obstacles
          .filter((o) => o.id.startsWith('cliffs_gate'))
          .forEach((o) => o.destroy());

        this.susieFollower.setLeader(this.player);
        this.susieFollower.x = this.player.x - 16;
        this.susieFollower.y = this.player.y;
        this.susieFollower.breadcrumbs = [];
        this.showNotification('Susie joined the party!', 2.0);
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
          portrait: 'ralsei',
          text: '* Once upon a time, a LEGEND was whispered among shadows...\n* It was the Legend of Delta Rune.',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
        this.stage = 'RALSEI_JOINED';
        this.showNotification('Ralsei joined the party!', 2.0);
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
    this.susieFollower.breadcrumbs = [];
    this.ralseiFollower.x = this.player.x - 32;
    this.ralseiFollower.y = this.player.y;
    this.ralseiFollower.breadcrumbs = [];

    this.stage = 'FIELD_EXPLORATION';
  }

  /**
   * Transitions into Scarlet Forest with party alignment.
   */
  public enterForest(): void {
    this.zoneManager.loadZone(ZONE_IDS.FOREST);
    this.player.x = this.zoneManager.playerSpawnX * TILE_SIZE;
    this.player.y = this.zoneManager.playerSpawnY * TILE_SIZE;

    if (this.isSusieInParty) {
      this.susieFollower.x = this.player.x - 16;
      this.susieFollower.y = this.player.y;
      this.susieFollower.breadcrumbs = [];
    }
    if (this.isRalseiInParty) {
      this.ralseiFollower.x = this.player.x - 32;
      this.ralseiFollower.y = this.player.y;
      this.ralseiFollower.breadcrumbs = [];
    }
  }

  /**
   * Transitions into Card Castle.
   */
  public enterCastle(): void {
    this.zoneManager.loadZone(ZONE_IDS.CASTLE);
    this.player.x = this.zoneManager.playerSpawnX * TILE_SIZE;
    this.player.y = this.zoneManager.playerSpawnY * TILE_SIZE;

    if (this.isSusieInParty) {
      this.susieFollower.x = this.player.x - 16;
      this.susieFollower.y = this.player.y;
      this.susieFollower.breadcrumbs = [];
    }
    if (this.isRalseiInParty) {
      this.ralseiFollower.x = this.player.x - 32;
      this.ralseiFollower.y = this.player.y;
      this.ralseiFollower.breadcrumbs = [];
    }
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
    const town = this.zoneManager.getCurrentZone();
    const boulder = town.obstacles.find((o) => o.id === 'town_boulder');
    if (boulder) boulder.destroy();
    this.synth.playSfx('OBSTACLE_DESTROY');

    this.mode = 'DIALOGUE';
    this.dialogueBox.showDialogue(
      [
        {
          speaker: 'LANCER',
          portrait: 'lancer',
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
   * Scarlet Forest Lancer encounter
   */
  public triggerForestLancer(): void {
    this.stage = 'ROUXLS_PUZZLE';
    this.mode = 'DIALOGUE';
    this.dialogueBox.showDialogue(
      [
        {
          speaker: 'LANCER',
          portrait: 'lancer',
          text: 'Ho ho ho! You survived my checker minion!',
        },
        {
          speaker: 'LANCER',
          portrait: 'lancer',
          text: 'Can you survive... my SUPREME FOREST ROADBLOCK?!',
        },
        {
          speaker: 'SUSIE',
          portrait: 'susie',
          text: 'Lancer, those are literally just three trees in a line.',
        },
        {
          speaker: 'LANCER',
          portrait: 'lancer',
          text: 'And what a magnificent roadblock they make! Ta-ta!',
        },
      ],
      () => {
        this.mode = 'OVERWORLD';
      }
    );
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
    this.transitionCooldown = 0;
    this.greatDoorOpened = false;
    this.fieldSpikesDeactivated = false;
    this.fieldGateLowered = false;
    this.castleGateOpened = false;
    this.suitPuzzle.reset();
    this.boxPuzzle.reset();
    this.rouxlsPuzzle.reset();
  }

  /**
   * Handles user pressing Action (Z) to inspect world props and signs.
   */
  private handleInteraction(pGridX: number, pGridY: number, zoneId: string): void {
    const facingOffset = {
      UP: { x: 0, y: -1 },
      DOWN: { x: 0, y: 1 },
      LEFT: { x: -1, y: 0 },
      RIGHT: { x: 1, y: 0 },
    }[this.player.facing];

    const targetX = pGridX + facingOffset.x;
    const targetY = pGridY + facingOffset.y;

    if (zoneId === ZONE_IDS.CASTLE_TOWN) {
      if ((targetX === 8 && targetY === 7) || (pGridX === 8 && pGridY === 7)) {
        if (!this.player.hasSword) {
          this.interactSwordPedestal();
        }
      }
    } else if (zoneId === ZONE_IDS.FIELD) {
      if ((targetX === 2 && targetY === 6) || (pGridX === 2 && pGridY === 6)) {
        this.mode = 'DIALOGUE';
        this.dialogueBox.showDialogue([
          {
            speaker: 'NARRATOR',
            text: '* [ROYAL PLAQUE] "To unlock the force field, step upon the symbols of fate: SPADE, HEART, DIAMOND."',
          },
        ], () => {
          this.mode = 'OVERWORLD';
        });
      }
    } else if (zoneId === ZONE_IDS.FOREST) {
      if ((targetX === 4 && targetY === 5) || (pGridX === 4 && pGridY === 5)) {
        this.mode = 'DIALOGUE';
        this.dialogueBox.showDialogue([
          {
            speaker: 'NARRATOR',
            text: '* [TREE CARVING] "DARK DUO HQ - EVIL BOYS ONLY! (Signed: Lancer & Susie)"',
          },
          {
            speaker: 'SUSIE',
            portrait: 'susie',
            text: '...Hey, I never agreed to that club name!',
          },
        ], () => {
          this.mode = 'OVERWORLD';
        });
      }
    } else if (zoneId === ZONE_IDS.CASTLE) {
      if ((targetX === 8 && targetY <= 1) || (pGridX === 8 && pGridY <= 1)) {
        if (this.stage === 'KING_DEFEATED') {
          this.sealDarkFountain();
        }
      }
    }
  }

  /**
   * Main story tick update.
   */
  public update(dt: number, inputOverride?: InputManager): void {
    const activeInput = inputOverride ?? this.input ?? undefined;

    if (this.notificationTimer > 0) {
      this.notificationTimer = Math.max(0, this.notificationTimer - dt);
    }
    if (this.transitionCooldown > 0) {
      this.transitionCooldown = Math.max(0, this.transitionCooldown - dt);
    }

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
        this.player.lv = 3;
      }
      this.mode = 'DIALOGUE';
      this.dialogueBox.showDialogue([
        {
          speaker: 'NARRATOR',
          text: '* Kris obtained the WOOD BLADE!\n* Kris is now ARMED! (Press Z to slash obstacles and strike in battle!)',
        },
      ], () => {
        this.mode = 'OVERWORLD';
      });
      return;
    }

    // Update active followers
    if (this.isSusieInParty) {
      this.susieFollower.update(dt, currentZone.tilemap, this.player);
    }
    if (this.isRalseiInParty) {
      const leader = this.isSusieInParty ? this.susieFollower : this.player;
      this.ralseiFollower.update(dt, currentZone.tilemap, leader);
    }

    const pGridX = Math.floor((this.player.x + 8) / TILE_SIZE);
    const pGridY = Math.floor((this.player.y + 8) / TILE_SIZE);

    // Slide Slope Speed Boost in Dark Cliffs
    if (currentZone.id === ZONE_IDS.CLIFFS) {
      const tile = currentZone.tilemap.getTile(pGridX, pGridY);
      if (tile?.type === 'SLIDE_SLOPE') {
        this.player.vx = Math.max(this.player.vx, 120);
      }
    }

    // Universal Inspection Trigger
    if (activeInput?.isJustPressed('action')) {
      this.handleInteraction(pGridX, pGridY, currentZone.id);
      if (this.mode !== 'OVERWORLD') {
        return;
      }
    }

    // Zone Interactive Encounters & Progressions
    if (currentZone.id === ZONE_IDS.CLIFFS) {
      if (this.stage === 'PROLOGUE' && pGridX >= 8) {
        this.triggerSusieDialogue();
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE_TOWN) {
      if (!this.player.hasSword && pGridX >= 9) {
        // Susie reminds Kris to get the sword
        this.player.x = 7 * TILE_SIZE;
        this.mode = 'DIALOGUE';
        this.dialogueBox.showDialogue(
          [
            {
              speaker: 'SUSIE',
              portrait: 'susie',
              text: 'Hey Kris, you blind? There\'s a shiny sword on that pedestal! Go grab it!',
            },
          ],
          () => {
            this.mode = 'OVERWORLD';
          }
        );
      } else if (this.player.hasSword && !this.isRalseiInParty && pGridX >= 9) {
        this.meetRalsei();
      } else if (this.stage === 'RALSEI_JOINED' && pGridX >= 12) {
        this.startLancerBattle();
      }
    } else if (currentZone.id === ZONE_IDS.FIELD) {
      this.suitPuzzle.update(this.player);
      this.boxPuzzle.update(this.player, currentZone.tilemap);

      if (
        (this.stage === 'BOX_PUZZLE_SOLVED' || this.fieldGateLowered) &&
        pGridX >= 11 &&
        pGridY >= 6 &&
        pGridY <= 8
      ) {
        this.startKRoundBattle();
      }
    } else if (currentZone.id === ZONE_IDS.FOREST) {
      if (this.stage === 'K_ROUND_DEFEATED' && pGridX >= 6) {
        this.triggerForestLancer();
      }
    } else if (currentZone.id === ZONE_IDS.CASTLE) {
      if (this.stage === 'ROUXLS_PUZZLE' && pGridX >= 4 && pGridY >= 5) {
        this.startRouxlsPuzzle();
      }
      this.rouxlsPuzzle.update(this.player, currentZone.tilemap);

      if (this.stage === 'ROUXLS_SOLVED' && pGridX >= 7 && pGridX <= 9 && pGridY <= 3) {
        this.startKingBattle();
      }

      if (this.stage === 'KING_DEFEATED' && pGridX === 8 && pGridY <= 1) {
        this.sealDarkFountain();
      }
    }

    // Zone Transitions
    if (this.transitionCooldown <= 0) {
      const transition = this.zoneManager.checkTransition(
        pGridX,
        pGridY,
        this.player.facing,
        this.player.vx
      );
      if (transition) {
        let allowTransition = true;
        if (
          currentZone.id === ZONE_IDS.CASTLE_TOWN &&
          transition.targetZoneId === ZONE_IDS.FIELD &&
          !this.greatDoorOpened
        ) {
          allowTransition = false;
        }
        if (
          currentZone.id === ZONE_IDS.FIELD &&
          transition.targetZoneId === ZONE_IDS.FOREST &&
          this.stage !== 'K_ROUND_DEFEATED' &&
          this.stage !== 'ROUXLS_PUZZLE' &&
          this.stage !== 'ROUXLS_SOLVED' &&
          this.stage !== 'KING_DEFEATED' &&
          this.stage !== 'FOUNTAIN_EPILOGUE'
        ) {
          allowTransition = false;
        }
        if (allowTransition) {
          this.transitionCooldown = 0.5;
          this.zoneManager.triggerTransition(
            transition.targetZoneId,
            transition.targetSpawnX,
            transition.targetSpawnY
          );
          this.player.x = transition.targetSpawnX * TILE_SIZE;
          this.player.y = transition.targetSpawnY * TILE_SIZE;

          if (transition.targetZoneId === ZONE_IDS.FIELD) {
            this.enterField();
          } else if (transition.targetZoneId === ZONE_IDS.FOREST) {
            this.enterForest();
          } else if (transition.targetZoneId === ZONE_IDS.CASTLE) {
            this.enterCastle();
          }
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
        // The Great Door blocking east exit (15, 6..8)
        renderer.drawRect(15 * TILE_SIZE, 6 * TILE_SIZE, TILE_SIZE, TILE_SIZE * 3, '#3B2B4E');
        renderer.drawRect(15 * TILE_SIZE, 6 * TILE_SIZE, TILE_SIZE, TILE_SIZE * 3, NES_COLORS.GOLD_ACCENT, false);
      }
    } else if (currentZone.id === ZONE_IDS.FIELD) {
      this.suitPuzzle.render(renderer);
      this.boxPuzzle.render(renderer);
    } else if (currentZone.id === ZONE_IDS.CASTLE) {
      this.rouxlsPuzzle.render(renderer);

      // Rouxls Kaard NPC standing before gate if not yet solved
      if (!this.castleGateOpened) {
        if (SpriteLoader.has('ch3_rouxls') && SpriteLoader.getSpriteInfo('ch3_rouxls')?.loaded) {
          SpriteLoader.draw(renderer.ctx, 'ch3_rouxls', 8 * TILE_SIZE, 5 * TILE_SIZE, 16, 16);
        } else {
          renderer.drawRect(8 * TILE_SIZE, 5 * TILE_SIZE, 16, 16, '#2980B9');
          renderer.drawText('RK', 8 * TILE_SIZE + 1, 5 * TILE_SIZE + 4, { color: NES_COLORS.WHITE, size: 7 });
        }
      }

      // Chaos King on throne before Dark Fountain
      if (this.stage !== 'KING_DEFEATED' && this.stage !== 'FOUNTAIN_EPILOGUE' && this.stage !== 'COMPLETED') {
        if (SpriteLoader.has('ch3_king') && SpriteLoader.getSpriteInfo('ch3_king')?.loaded) {
          SpriteLoader.draw(renderer.ctx, 'ch3_king', 8 * TILE_SIZE - 8, 2 * TILE_SIZE - 4, 32, 32);
        } else {
          renderer.drawRect(8 * TILE_SIZE - 4, 2 * TILE_SIZE, 24, 24, '#1C2833');
          renderer.drawText('KING', 8 * TILE_SIZE - 2, 2 * TILE_SIZE + 8, { color: NES_COLORS.GOLD_ACCENT, size: 6 });
        }
      }

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

    // Save/Notification Toast Banner
    if (this.notificationTimer > 0) {
      const nw = 120;
      const nh = 16;
      const nx = (CANVAS_WIDTH - nw) / 2;
      const ny = 22;
      renderer.ctx.save();
      renderer.drawRect(nx - 2, ny - 2, nw + 4, nh + 4, '#000000');
      renderer.drawRect(nx, ny, nw, nh, '#1B142A');
      renderer.drawText(this.notificationText, CANVAS_WIDTH / 2, ny + 5, {
        color: NES_COLORS.GOLD_ACCENT,
        size: 7,
        align: 'center',
      });
      renderer.ctx.restore();
    }
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

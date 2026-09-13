import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chapter1Story } from '../../src/scenes/Chapter1Story';
import { InputManager } from '../../src/core/InputManager';
import { ChiptuneSynth } from '../../src/audio/ChiptuneSynth';
import { ZONE_IDS } from '../../src/map/ZoneManager';
import { DestructibleObstacle } from '../../src/map/DestructibleObstacle';

describe('Chapter 1 End-to-End Walkthrough Integration Flow', () => {
  let story: Chapter1Story;
  let input: InputManager;
  let mockSynth: ChiptuneSynth;

  beforeEach(() => {
    input = new InputManager(null);
    mockSynth = {
      playSfx: vi.fn(),
      playBlip: vi.fn(),
      setMuted: vi.fn(),
    } as unknown as ChiptuneSynth;

    story = new Chapter1Story({
      synth: mockSynth,
      input,
    });
  });

  describe('1. Prologue / Dark Cliffs (Awakening & Susie Encounter)', () => {
    it('initializes Kris in Cliffs, UNARMED without sword or followers', () => {
      expect(story.zoneManager.getCurrentZone().id).toBe(ZONE_IDS.CLIFFS);
      expect(story.player.state).toBe('UNARMED');
      expect(story.player.hasSword).toBe(false);
      expect(story.isSusieInParty).toBe(false);
      expect(story.isRalseiInParty).toBe(false);
      expect(story.mode).toBe('OVERWORLD');
      expect(story.stage).toBe('PROLOGUE');
    });

    it('triggers Susie dialogue on slope and returns to OVERWORLD when dismissed', () => {
      story.triggerSusieDialogue();

      expect(story.mode).toBe('DIALOGUE');
      expect(story.dialogueBox.isOpen).toBe(true);
      expect(story.dialogueBox.currentLine?.speaker).toBe('SUSIE');
      expect(story.dialogueBox.currentLine?.text).toContain('Kris?! Where the hell are we?!');

      // Dismiss dialogue
      story.dialogueBox.advance(); // typewriter finish
      story.dialogueBox.advance(); // confirm close

      expect(story.dialogueBox.isOpen).toBe(false);
      expect(story.mode).toBe('OVERWORLD');
      expect(story.stage).toBe('MET_SUSIE');
    });
  });

  describe('2. Sword Pulling & Obstacle Cutting', () => {
    it('prevents cutting obstacles when UNARMED, then unlocks 5-frame ARMED attack upon sword pull', () => {
      const obstacle = new DestructibleObstacle({
        id: 'cliffs_gate_test',
        gridX: 12,
        gridY: 7,
        type: 'WOOD_GATE',
        requiredLv: 1,
        requiredSword: true,
      });

      // Try hitting while UNARMED
      story.player.x = (obstacle.gridX - 1) * 16;
      story.player.y = obstacle.gridY * 16;
      story.player.facing = 'RIGHT';

      const attackBefore = story.player.attack();
      expect(attackBefore).toBe(false);
      const hitBefore = story.player.hitObstacle(obstacle);
      expect(hitBefore).toBeNull();
      expect(obstacle.canDestroy(story.player.lv, story.player.hasSword)).toBe(false);
      expect(obstacle.isDestroyed).toBe(false);

      // Interact with sword pedestal
      story.interactSwordPedestal();
      expect(story.player.state).toBe('SWORD_PULL');
      expect(mockSynth.playSfx).toHaveBeenCalledWith('SWORD_PULL');

      // Advance time for sword pull completion
      story.update(1.1);
      expect(story.player.hasSword).toBe(true);
      expect(story.player.state).toBe('ARMED');
      expect(story.stage).toBe('SWORD_PULLED');

      // Now attack and destroy obstacle
      story.player.attack();
      expect(story.player.state).toBe('ATTACKING');
      const hitAfter = story.player.hitObstacle(obstacle);
      expect(hitAfter?.destroyed).toBe(true);
      expect(obstacle.isDestroyed).toBe(true);
    });
  });

  describe('3. Castle Town & Party Assembly', () => {
    it('assembles party with Ralsei in Castle Town and Susie in Field for trio conga line', () => {
      // Meet Ralsei in Castle Town
      story.zoneManager.loadZone(ZONE_IDS.CASTLE_TOWN);
      story.meetRalsei();

      expect(story.dialogueBox.isOpen).toBe(true);
      expect(story.dialogueBox.currentLine?.speaker).toBe('RALSEI');
      expect(story.dialogueBox.currentLine?.text).toContain('Delta Rune');

      story.dialogueBox.advance();
      story.dialogueBox.advance();

      expect(story.isRalseiInParty).toBe(true);
      expect(story.ralseiFollower.leader).toBe(story.player);
      expect(story.isSusieInParty).toBe(false);

      // Enter Field -> Susie joins party
      story.enterField();
      expect(story.zoneManager.getCurrentZone().id).toBe(ZONE_IDS.FIELD);
      expect(story.isSusieInParty).toBe(true);
      expect(story.isRalseiInParty).toBe(true);

      // Verify conga line hierarchy: Kris (player) -> Susie -> Ralsei
      expect(story.susieFollower.leader).toBe(story.player);
      expect(story.ralseiFollower.leader).toBe(story.susieFollower);

      // Move player and verify followers track along breadcrumb path
      story.player.x = 100;
      story.player.y = 100;
      story.player.vx = 80;
      story.player.facing = 'RIGHT';

      for (let i = 0; i < 10; i++) {
        story.player.x += 4;
        story.update(0.05);
      }

      expect(story.susieFollower.breadcrumbs.length).toBeGreaterThan(0);
      expect(story.ralseiFollower.breadcrumbs.length).toBeGreaterThan(0);
    });
  });

  describe('4. Puzzle Progression', () => {
    it('solves Field SuitPlatePuzzle and lowers electric spike barrier', () => {
      story.enterField();
      expect(story.fieldSpikesDeactivated).toBe(false);

      // Step in correct sequence: ♠ -> ♥ -> ♦
      story.suitPuzzle.stepOnPlate('SPADE');
      story.suitPuzzle.stepOnPlate('HEART');
      story.suitPuzzle.stepOnPlate('DIAMOND');

      expect(story.suitPuzzle.isSolved).toBe(true);
      expect(story.fieldSpikesDeactivated).toBe(true);
      expect(story.stage).toBe('SUIT_PUZZLE_SOLVED');
    });

    it('solves Field BoxPushPuzzle and lowers gate', () => {
      story.enterField();
      expect(story.fieldGateLowered).toBe(false);

      story.boxPuzzle.pushCrate('field_crate_1', 1, 0);
      expect(story.boxPuzzle.isSolved).toBe(true);
      expect(story.fieldGateLowered).toBe(true);
      expect(story.stage).toBe('BOX_PUZZLE_SOLVED');
    });

    it('solves Rouxls Kaard comedic 1-tile spoof puzzle in Card Castle', () => {
      story.enterCastle();
      story.startRouxlsPuzzle();

      expect(story.dialogueBox.isOpen).toBe(true);
      expect(story.dialogueBox.currentLine?.speaker).toBe('ROUXLS');
      expect(story.dialogueBox.currentLine?.text).toContain('WORMS');

      story.dialogueBox.advance();
      story.dialogueBox.advance();

      // Push crate 1 tile onto plate
      expect(story.rouxlsPuzzle.isSolved).toBe(false);
      story.rouxlsPuzzle.pushCrate('rouxls_crate', 1, 0);

      expect(story.rouxlsPuzzle.isSolved).toBe(true);
      expect(story.castleGateOpened).toBe(true);
      expect(story.stage).toBe('ROUXLS_SOLVED');
    });
  });

  describe('5. Boss Battles Progression (Lancer -> K. Round -> King)', () => {
    it('seamlessly enters Lancer encounter, wins, and opens The Great Door', () => {
      story.startLancerBattle();

      expect(story.mode).toBe('BATTLE');
      expect(story.battleEngine.currentBoss?.id).toBe('lancer');

      // Spare Lancer to victory
      story.battleEngine.state = 'VICTORY';
      story.battleEngine.battleResult = 'SPARE';
      story.battleEngine.update(1.5, input);

      expect(story.mode).toBe('DIALOGUE');
      expect(story.dialogueBox.currentLine?.speaker).toBe('LANCER');
      expect(story.dialogueBox.currentLine?.text).toContain('Ho ho ho!');

      story.dialogueBox.advance();
      story.dialogueBox.advance();

      expect(story.mode).toBe('OVERWORLD');
      expect(story.greatDoorOpened).toBe(true);
      expect(story.stage).toBe('LANCER_DEFEATED');
    });

    it('enters and completes K. Round mini-boss battle', () => {
      story.startKRoundBattle();

      expect(story.mode).toBe('BATTLE');
      expect(story.battleEngine.currentBoss?.id).toBe('k_round');

      // Win K. Round battle
      story.battleEngine.state = 'VICTORY';
      story.battleEngine.battleResult = 'SPARE';
      story.battleEngine.update(1.5, input);

      expect(story.mode).toBe('OVERWORLD');
      expect(story.stage).toBe('K_ROUND_DEFEATED');
    });

    it('enters and completes Chaos King final boss battle', () => {
      story.startKingBattle();

      expect(story.mode).toBe('BATTLE');
      expect(story.battleEngine.currentBoss?.id).toBe('king');

      // Win King battle
      story.battleEngine.state = 'VICTORY';
      story.battleEngine.battleResult = 'SPARE';
      story.battleEngine.update(1.5, input);

      expect(story.mode).toBe('OVERWORLD');
      expect(story.stage).toBe('KING_DEFEATED');
    });
  });

  describe('6. Fountain Sealing Epilogue', () => {
    it('triggers Dark Fountain sealing epilogue with whiteout transition and victory fanfare', () => {
      story.sealDarkFountain();

      expect(story.mode).toBe('EPILOGUE');
      expect(story.stage).toBe('FOUNTAIN_EPILOGUE');
      expect(story.isFountainSealed).toBe(true);
      expect(mockSynth.playSfx).toHaveBeenCalledWith('LEVEL_UP');
      expect(story.epilogueText).toContain('You sealed the Dark Fountain and saved the world!');

      // Update epilogue transition
      story.update(1.0);
      expect(story.whiteoutAlpha).toBeGreaterThan(0);

      // Verify restart restores initial state
      story.restart();
      expect(story.stage).toBe('PROLOGUE');
      expect(story.mode).toBe('OVERWORLD');
      expect(story.isFountainSealed).toBe(false);
      expect(story.player.hasSword).toBe(false);
    });
  });

  describe('7. BattleEngine onBattleEnd Idempotency', () => {
    it('ensures onBattleEnd is guarded against multiple triggers across multiple frames in VICTORY', () => {
      const onEndSpy = vi.fn();
      story.battleEngine.startBattle(story.battleEngine.currentBoss || {
        id: 'dummy',
        name: 'DUMMY',
        hp: 10,
        maxHp: 10,
        mercy: 0,
        maxMercy: 100,
        acts: [],
        patterns: [],
      }, onEndSpy);

      story.battleEngine.state = 'VICTORY';
      story.battleEngine.battleResult = 'DEFEAT';
      story.battleEngine.victoryTimer = 0;

      // First update triggers callback
      story.battleEngine.update(0.1, input);
      expect(onEndSpy).toHaveBeenCalledTimes(1);

      // Subsequent updates while still in VICTORY must NOT call onBattleEnd again
      story.battleEngine.update(0.1, input);
      story.battleEngine.update(0.5, input);
      expect(onEndSpy).toHaveBeenCalledTimes(1);
    });
  });
});

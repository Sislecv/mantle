import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager, MantleSaveData } from '../../src/core/SaveManager';
import { Chapter1Story } from '../../src/scenes/Chapter1Story';
import { ZONE_IDS } from '../../src/map/ZoneManager';

describe('SaveManager', () => {
  let story: Chapter1Story;

  beforeEach(() => {
    localStorage.clear();
    story = new Chapter1Story();
  });

  it('correctly creates a snapshot of the current story state', () => {
    story.player.x = 80;
    story.player.y = 96;
    story.player.lv = 3;
    story.player.hasSword = true;

    const snapshot = SaveManager.createSnapshot(story);
    expect(snapshot.version).toBe(1);
    expect(snapshot.zoneId).toBe(ZONE_IDS.CLIFFS);
    expect(snapshot.player.x).toBe(80);
    expect(snapshot.player.y).toBe(96);
    expect(snapshot.player.lv).toBe(3);
    expect(snapshot.player.hasSword).toBe(true);
  });

  it('saves and loads from localStorage correctly', () => {
    expect(SaveManager.hasLocalSave()).toBe(false);

    story.player.lv = 5;
    story.player.hasSword = true;
    story.stage = 'SWORD_PULLED';

    const saveOk = SaveManager.saveToLocal(story);
    expect(saveOk).toBe(true);
    expect(SaveManager.hasLocalSave()).toBe(true);

    // Create fresh story instance and restore
    const newStory = new Chapter1Story();
    expect(newStory.stage).toBe('PROLOGUE');

    const loadOk = SaveManager.loadFromLocal(newStory);
    expect(loadOk).toBe(true);
    expect(newStory.stage).toBe('SWORD_PULLED');
    expect(newStory.player.lv).toBe(5);
    expect(newStory.player.hasSword).toBe(true);
  });

  it('applies snapshot with party members safely', () => {
    const fakeSnapshot: MantleSaveData = {
      version: 1,
      timestamp: Date.now(),
      stage: 'FIELD_EXPLORATION',
      zoneId: ZONE_IDS.FIELD,
      player: {
        x: 48,
        y: 64,
        hp: 20,
        maxHp: 20,
        lv: 3,
        exp: 200,
        hasSword: true,
        facing: 'DOWN',
      },
      party: {
        isSusieInParty: true,
        isRalseiInParty: true,
      },
      flags: {
        greatDoorOpened: true,
        fieldSpikesDeactivated: true,
        fieldGateLowered: false,
        castleGateOpened: false,
        isFountainSealed: false,
      },
    };

    const success = SaveManager.applySnapshot(fakeSnapshot, story);
    expect(success).toBe(true);
    expect(story.zoneManager.getCurrentZone().id).toBe(ZONE_IDS.FIELD);
    expect(story.isSusieInParty).toBe(true);
    expect(story.isRalseiInParty).toBe(true);
    expect(story.greatDoorOpened).toBe(true);
    expect(story.fieldSpikesDeactivated).toBe(true);
  });

  it('handles invalid or corrupted snapshots gracefully', () => {
    const corrupted = {} as MantleSaveData;
    const ok = SaveManager.applySnapshot(corrupted, story);
    expect(ok).toBe(false);
  });
});

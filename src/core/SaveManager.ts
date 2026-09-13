/**
 * Mantle Chapter 1 - Save & Load Manager
 * Provides LocalStorage persistence and JSON file Export / Import (upload) loading.
 */

import { Chapter1Story, StoryStage } from '../scenes/Chapter1Story';
import { FacingDirection } from '../entities/Entity';

export interface MantleSaveData {
  version: number;
  timestamp: number;
  stage: StoryStage;
  zoneId: string;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    lv: number;
    exp: number;
    hasSword: boolean;
    facing: FacingDirection;
  };
  party: {
    isSusieInParty: boolean;
    isRalseiInParty: boolean;
  };
  flags: {
    greatDoorOpened: boolean;
    fieldSpikesDeactivated: boolean;
    fieldGateLowered: boolean;
    castleGateOpened: boolean;
    isFountainSealed: boolean;
  };
}

export class SaveManager {
  public static readonly STORAGE_KEY = 'MANTLE_SAVE_DATA_CH1';
  public static readonly CURRENT_VERSION = 1;

  /**
   * Captures the full game state snapshot from Chapter1Story.
   */
  public static createSnapshot(story: Chapter1Story): MantleSaveData {
    return {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      stage: story.stage,
      zoneId: story.zoneManager.getCurrentZone().id,
      player: {
        x: story.player.x,
        y: story.player.y,
        hp: story.player.hp,
        maxHp: story.player.maxHp,
        lv: story.player.lv,
        exp: story.player.exp,
        hasSword: story.player.hasSword,
        facing: story.player.facing,
      },
      party: {
        isSusieInParty: story.isSusieInParty,
        isRalseiInParty: story.isRalseiInParty,
      },
      flags: {
        greatDoorOpened: story.greatDoorOpened,
        fieldSpikesDeactivated: story.fieldSpikesDeactivated,
        fieldGateLowered: story.fieldGateLowered,
        castleGateOpened: story.castleGateOpened,
        isFountainSealed: story.isFountainSealed,
      },
    };
  }

  /**
   * Restores game state onto Chapter1Story from a validated snapshot.
   */
  public static applySnapshot(snapshot: MantleSaveData, story: Chapter1Story): boolean {
    if (!snapshot || !snapshot.zoneId || !snapshot.player) {
      return false;
    }

    try {
      // 1. Restore zone
      story.zoneManager.loadZone(snapshot.zoneId);

      // 2. Restore player
      story.player.x = snapshot.player.x;
      story.player.y = snapshot.player.y;
      story.player.hp = snapshot.player.hp;
      story.player.maxHp = snapshot.player.maxHp;
      story.player.lv = snapshot.player.lv;
      story.player.exp = snapshot.player.exp;
      story.player.hasSword = snapshot.player.hasSword;
      story.player.facing = snapshot.player.facing ?? 'DOWN';
      story.player.state = snapshot.player.hasSword ? 'ARMED' : 'UNARMED';

      // 3. Restore story flags & stage
      story.stage = snapshot.stage;
      story.greatDoorOpened = snapshot.flags?.greatDoorOpened ?? false;
      story.fieldSpikesDeactivated = snapshot.flags?.fieldSpikesDeactivated ?? false;
      story.fieldGateLowered = snapshot.flags?.fieldGateLowered ?? false;
      story.castleGateOpened = snapshot.flags?.castleGateOpened ?? false;
      story.isFountainSealed = snapshot.flags?.isFountainSealed ?? false;

      // 4. Restore party members
      if (snapshot.party?.isSusieInParty) {
        story.susieFollower.setLeader(story.player);
        story.susieFollower.x = story.player.x - 16;
        story.susieFollower.y = story.player.y;
      } else {
        story.susieFollower.setLeader(null);
      }

      if (snapshot.party?.isRalseiInParty) {
        const leader = story.isSusieInParty ? story.susieFollower : story.player;
        story.ralseiFollower.setLeader(leader);
        story.ralseiFollower.x = story.player.x - 32;
        story.ralseiFollower.y = story.player.y;
      } else {
        story.ralseiFollower.setLeader(null);
      }

      story.mode = 'OVERWORLD';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Saves current game progress into LocalStorage.
   */
  public static saveToLocal(story: Chapter1Story): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const snapshot = this.createSnapshot(story);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Loads game progress from LocalStorage.
   */
  public static loadFromLocal(story: Chapter1Story): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw) as MantleSaveData;
      return this.applySnapshot(snapshot, story);
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a valid local save file exists.
   */
  public static hasLocalSave(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Clears saved state in LocalStorage.
   */
  public static clearLocalSave(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Exports save data as a downloadable JSON file.
   */
  public static exportSaveToFile(story: Chapter1Story): void {
    if (typeof document === 'undefined') return;
    const snapshot = this.createSnapshot(story);
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `mantle_save_${story.stage.toLowerCase()}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports save data from an uploaded JSON file and applies it to story.
   */
  public static async importSaveFromFile(file: File, story: Chapter1Story): Promise<boolean> {
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text) as MantleSaveData;
      const success = this.applySnapshot(snapshot, story);
      if (success) {
        // Also sync back to LocalStorage for persistence
        this.saveToLocal(story);
      }
      return success;
    } catch {
      return false;
    }
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleEngine, BossConfig } from '../../src/battle/BattleEngine';
import { BattleBox } from '../../src/battle/BattleBox';
import { Bullet } from '../../src/battle/Bullet';
import { InputManager } from '../../src/core/InputManager';
import { LANCER_BOSS_CONFIG, K_ROUND_BOSS_CONFIG, KING_BOSS_CONFIG } from '../../src/battle/BossPatterns';

describe('BattleEngine', () => {
  let engine: BattleEngine;
  let input: InputManager;
  let mockBoss: BossConfig;

  beforeEach(() => {
    input = new InputManager(null);
    mockBoss = {
      id: 'test_boss',
      name: 'TEST BOSS',
      maxHp: 100,
      hp: 100,
      maxMercy: 100,
      mercy: 0,
      acts: [
        {
          name: 'Check',
          description: 'Look closely at the foe.',
          mercyGain: 0,
          dialogue: 'TEST BOSS looks intimidating.',
        },
        {
          name: 'Compliment',
          description: 'Say something nice.',
          mercyGain: 50,
          dialogue: 'TEST BOSS blushed slightly.',
        },
      ],
      patterns: [
        (_box: BattleBox) => [
          new Bullet({
            x: 128,
            y: 130,
            vx: 0,
            vy: 20,
            radius: 4,
            type: 'SPADE',
            damage: 6,
          }),
        ],
      ],
    };

    engine = new BattleEngine();
  });

  it('initializes battle with boss config and default party stats', () => {
    engine.startBattle(mockBoss);

    expect(engine.state).toBe('MENU');
    expect(engine.currentBoss).toBe(mockBoss);
    expect(engine.party).toEqual([
      { name: 'Kris', hp: 20, maxHp: 20, color: expect.any(String) },
      { name: 'Susie', hp: 30, maxHp: 30, color: expect.any(String) },
      { name: 'Ralsei', hp: 20, maxHp: 20, color: expect.any(String) },
    ]);
    expect(engine.selectedMenuIndex).toBe(0); // FIGHT
  });

  it('navigates main menu commands [FIGHT, ACT, ITEM, SPARE]', () => {
    engine.startBattle(mockBoss);

    // Initial is FIGHT (index 0)
    expect(engine.selectedMenuAction).toBe('FIGHT');

    // Press right -> ACT (index 1)
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('ACT');

    // Press right -> ITEM (index 2)
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('ITEM');

    // Press right -> SPARE (index 3)
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('SPARE');

    // Press left -> ITEM (index 2)
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('ITEM');
  });

  it('transitions to PLAYER_ATTACK on FIGHT and calculates timing bar damage', () => {
    engine.startBattle(mockBoss);

    // Select FIGHT
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    expect(engine.state).toBe('PLAYER_ATTACK');

    // Let the reticle advance
    input.reset();
    engine.update(0.1, input);
    input.update();

    // Stop the reticle at current position
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    // Damage was dealt to boss
    expect(mockBoss.hp).toBeLessThan(100);

    // After attack finishes, transitions to ENEMY_ATTACK
    engine.update(1.0, input);
    expect(engine.state).toBe('ENEMY_ATTACK');
  });

  it('calculates higher damage for closer center hits on timing gauge', () => {
    // Exact center hit
    const engine1 = new BattleEngine();
    const boss1 = { ...mockBoss, hp: 100 };
    engine1.startBattle(boss1);
    const damageCenter = engine1.calculateFightDamage(0); // 0 offset from target

    // Off-center hit
    const damageOffCenter = engine1.calculateFightDamage(40); // 40px offset

    expect(damageCenter).toBeGreaterThan(damageOffCenter);
    expect(damageOffCenter).toBeGreaterThanOrEqual(0);
  });

  it('transitions to SUBMENU on ACT, increases boss Mercy and allows SPARE victory', () => {
    const onEnd = vi.fn();
    engine.startBattle(mockBoss, onEnd);

    // Navigate to ACT
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('ACT');

    // Confirm ACT
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.state).toBe('SUBMENU');

    // Navigate to second act: 'Compliment' (+50 mercy)
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
    engine.update(0.016, input);
    input.update();

    // Confirm 'Compliment'
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    expect(mockBoss.mercy).toBe(50);

    // Dismiss dialogue & advance past enemy attack
    engine.update(1.0, input); // dialog
    engine.update(7.0, input); // enemy attack wave ends
    expect(engine.state).toBe('MENU');

    // Second ACT to reach 100% mercy
    // Navigate to ACT
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('ACT');

    // Open ACT
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.state).toBe('SUBMENU');

    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowDown' })); // choose compliment
    engine.update(0.016, input);
    input.update();

    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' })); // confirm
    engine.update(0.016, input);
    input.update();

    expect(mockBoss.mercy).toBe(100);

    // End dialogue & enemy turn
    engine.update(1.0, input);
    engine.update(7.0, input);
    expect(engine.state).toBe('MENU');

    // Navigate to SPARE
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    engine.update(0.016, input);
    input.update();
    expect(engine.selectedMenuAction).toBe('SPARE');

    // Confirm SPARE
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    expect(engine.state).toBe('VICTORY');
    expect(engine.battleResult).toBe('SPARE');

    // Update to trigger onEnd callback
    engine.update(1.5, input);
    expect(onEnd).toHaveBeenCalledWith('SPARE');
  });

  it('triggers VICTORY when boss HP reaches 0 via FIGHT', () => {
    const onEnd = vi.fn();
    mockBoss.hp = 5; // Low HP so any hit will defeat boss
    engine.startBattle(mockBoss, onEnd);

    // Select FIGHT
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    // Hit reticle
    input.reset();
    input.handleKeyDown(new KeyboardEvent('keydown', { code: 'KeyZ' }));
    engine.update(0.016, input);
    input.update();

    expect(mockBoss.hp).toBe(0);
    expect(engine.state).toBe('VICTORY');
    expect(engine.battleResult).toBe('DEFEAT');

    engine.update(1.5, input);
    expect(onEnd).toHaveBeenCalledWith('DEFEAT');
  });

  it('handles bullet collision and damage to party during ENEMY_ATTACK', () => {
    engine.startBattle(mockBoss);
    engine.startEnemyAttackPhase();

    expect(engine.state).toBe('ENEMY_ATTACK');
    expect(engine.activeBullets.length).toBeGreaterThan(0);

    const initialKrisHp = engine.party[0].hp;

    // Position soul directly on the bullet
    const bullet = engine.activeBullets[0];
    engine.soul.setPosition(bullet.x, bullet.y);

    // Update to process collision
    engine.update(0.016, input);

    expect(engine.party[0].hp).toBeLessThan(initialKrisHp);
    expect(engine.soul.isInvulnerable).toBe(true);
  });

  it('triggers GAME_OVER when Kris HP drops to 0', () => {
    engine.startBattle(mockBoss);
    engine.party[0].hp = 5; // 5 HP left
    engine.startEnemyAttackPhase();

    const bullet = engine.activeBullets[0];
    bullet.damage = 10;
    engine.soul.setPosition(bullet.x, bullet.y);

    engine.update(0.016, input);

    expect(engine.party[0].hp).toBe(0);
    expect(engine.state).toBe('GAME_OVER');
  });

  it('provides boss configs and patterns for LANCER, K_ROUND, and KING', () => {
    const box = new BattleBox(68, 120, 120, 70);

    expect(LANCER_BOSS_CONFIG.id).toBe('lancer');
    expect(LANCER_BOSS_CONFIG.patterns.length).toBeGreaterThan(0);
    const lancerBullets = LANCER_BOSS_CONFIG.patterns[0](box);
    expect(lancerBullets.length).toBeGreaterThan(0);

    expect(K_ROUND_BOSS_CONFIG.id).toBe('k_round');
    expect(K_ROUND_BOSS_CONFIG.patterns.length).toBeGreaterThan(0);
    const kRoundBullets = K_ROUND_BOSS_CONFIG.patterns[0](box);
    expect(kRoundBullets.length).toBeGreaterThan(0);

    expect(KING_BOSS_CONFIG.id).toBe('king');
    expect(KING_BOSS_CONFIG.patterns.length).toBeGreaterThan(0);
    const kingBullets = KING_BOSS_CONFIG.patterns[0](box);
    expect(kingBullets.length).toBeGreaterThan(0);
  });
});

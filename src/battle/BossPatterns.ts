/**
 * Mantle Chapter 1 - Boss Attack Patterns & Entity Configurations
 * Defines Chapter 1 Bosses (Lancer, K. Round, King) and their bullet storm patterns.
 */

import { BattleBox } from './BattleBox';
import { Bullet } from './Bullet';

export interface BossAct {
  name: string;
  description: string;
  mercyGain: number;
  dialogue: string;
}

export interface BossConfig {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  maxMercy: number;
  mercy: number;
  acts: BossAct[];
  patterns: Array<(box: BattleBox) => Bullet[]>;
}

// -------------------------------------------------------------
// LANCER PATTERNS
// -------------------------------------------------------------

/**
 * Lancer Pattern 1: Spinning spade waves that curve toward the center.
 */
export function lancerSpadeWaves(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];
  const count = 14;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  for (let i = 0; i < count; i++) {
    const delay = i * 0.3;
    const angle = (i * Math.PI * 2) / count + (i % 2 === 0 ? 0 : Math.PI / 6);
    const spawnDist = 65;
    const startX = cx + Math.cos(angle) * spawnDist;
    const startY = cy + Math.sin(angle) * spawnDist;

    bullets.push(
      new Bullet({
        x: startX,
        y: startY,
        vx: -Math.cos(angle) * 35,
        vy: -Math.sin(angle) * 35,
        radius: 4,
        type: 'SPADE',
        damage: 5,
        spawnDelay: delay,
        lifetime: 5.0,
        angularVelocity: 2.5,
        customUpdate: (b, dt) => {
          // Centripetal curving effect
          const perpX = -b.vy;
          const perpY = b.vx;
          b.vx += perpX * 0.6 * dt;
          b.vy += perpY * 0.6 * dt;
        },
      })
    );
  }

  return bullets;
}

/**
 * Lancer Pattern 2: Bike charge from left and right sides.
 */
export function lancerBikeCharge(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];
  const rows = [box.y + 16, box.y + box.height / 2, box.y + box.height - 16];

  for (let i = 0; i < 6; i++) {
    const fromLeft = i % 2 === 0;
    const rowY = rows[i % rows.length];
    const spawnX = fromLeft ? box.x - 20 : box.x + box.width + 20;

    bullets.push(
      new Bullet({
        x: spawnX,
        y: rowY,
        vx: fromLeft ? 85 : -85,
        vy: 0,
        width: 14,
        height: 10,
        radius: 6,
        type: 'SPADE',
        damage: 6,
        spawnDelay: i * 0.7,
        lifetime: 3.0,
      })
    );
  }

  return bullets;
}

export const LANCER_BOSS_CONFIG: BossConfig = {
  id: 'lancer',
  name: 'LANCER',
  maxHp: 240,
  hp: 240,
  maxMercy: 100,
  mercy: 0,
  acts: [
    {
      name: 'Check',
      description: 'The Dark Prince who seeks to impress his dad.',
      mercyGain: 0,
      dialogue: 'LANCER laughs mischievously: "Ho ho ho!"',
    },
    {
      name: 'Flatter',
      description: 'Tell Lancer he is a sweet, cool boy.',
      mercyGain: 35,
      dialogue: 'Lancer blushes and does a little wheelie on his bike!',
    },
    {
      name: 'Bake Salsa',
      description: 'Propose making royal salsa together.',
      mercyGain: 40,
      dialogue: 'Lancer drools: "Yum! Only if it is extra spicy!"',
    },
  ],
  patterns: [lancerSpadeWaves, lancerBikeCharge],
};

// -------------------------------------------------------------
// K. ROUND PATTERNS
// -------------------------------------------------------------

/**
 * K. Round Pattern 1: Giant legs stomp bouncing down with shockwave ripples.
 */
export function kRoundLegsStomp(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];
  const cx = box.x + box.width / 2;

  for (let stomp = 0; stomp < 3; stomp++) {
    const stompDelay = stomp * 1.8;
    const stompTargetX = cx + (stomp === 1 ? -28 : stomp === 2 ? 28 : 0);

    // Heavy stomp crown
    bullets.push(
      new Bullet({
        x: stompTargetX,
        y: box.y - 25,
        vx: 0,
        vy: 85,
        type: 'CROWN_STOMP',
        width: 22,
        height: 18,
        radius: 9,
        damage: 8,
        spawnDelay: stompDelay,
        lifetime: 1.6,
        customUpdate: (b) => {
          if (b.y >= box.y + box.height - 18) {
            b.vy = 0;
          }
        },
      })
    );

    // Shockwave ripples radiating outward
    for (const side of [-1, 1]) {
      for (let r = 0; r < 3; r++) {
        bullets.push(
          new Bullet({
            x: stompTargetX,
            y: box.y + box.height - 8,
            vx: side * (40 + r * 20),
            vy: 0,
            type: 'DIAMOND',
            radius: 3,
            damage: 4,
            spawnDelay: stompDelay + 0.6 + r * 0.12,
            lifetime: 1.5,
          })
        );
      }
    }
  }

  return bullets;
}

/**
 * K. Round Pattern 2: Bouncing and rolling mini-checkers across the box floor.
 */
export function kRoundRollingCheckers(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];

  for (let i = 0; i < 8; i++) {
    const startLeft = i % 2 === 0;
    bullets.push(
      new Bullet({
        x: startLeft ? box.x + 6 : box.x + box.width - 6,
        y: box.y + 12,
        vx: startLeft ? 45 : -45,
        vy: 25,
        type: 'DIAMOND',
        radius: 4,
        damage: 5,
        spawnDelay: i * 0.55,
        lifetime: 4.0,
        customUpdate: (b) => {
          if (b.y >= box.y + box.height - 8) {
            b.vy = -Math.abs(b.vy);
          } else if (b.y <= box.y + 6) {
            b.vy = Math.abs(b.vy);
          }
        },
      })
    );
  }

  return bullets;
}

export const K_ROUND_BOSS_CONFIG: BossConfig = {
  id: 'k_round',
  name: 'K. ROUND',
  maxHp: 350,
  hp: 350,
  maxMercy: 100,
  mercy: 0,
  acts: [
    {
      name: 'Check',
      description: 'A simple checker piece endowed with legs and royal crown.',
      mercyGain: 0,
      dialogue: 'K. ROUND stomps proudly, shaking the arena floor.',
    },
    {
      name: 'Bow',
      description: 'Show deep respect to the crowned checker.',
      mercyGain: 35,
      dialogue: 'K. ROUND seems dignified and slightly less hostile.',
    },
    {
      name: 'Warn Crown',
      description: 'Point out that the crown is slipping off its head.',
      mercyGain: 40,
      dialogue: 'K. ROUND fidgets nervously trying to adjust the giant crown!',
    },
  ],
  patterns: [kRoundLegsStomp, kRoundRollingCheckers],
};

// -------------------------------------------------------------
// KING PATTERNS
// -------------------------------------------------------------

/**
 * King Pattern 1: Sweeping chaos spades falling in alternating columns.
 */
export function kingChaosSpades(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];
  const columns = 5;
  const colWidth = (box.width - 12) / columns;

  for (let wave = 0; wave < 6; wave++) {
    const offset = wave % 2;
    for (let col = offset; col < columns; col += 2) {
      const colX = box.x + 6 + col * colWidth + colWidth / 2;
      bullets.push(
        new Bullet({
          x: colX,
          y: box.y - 12,
          vx: (wave % 2 === 0 ? 1 : -1) * 8,
          vy: 55,
          type: 'SPADE',
          radius: 4,
          damage: 7,
          spawnDelay: wave * 0.7,
          lifetime: 3.2,
          angularVelocity: 2.0,
        })
      );
    }
  }

  return bullets;
}

/**
 * King Pattern 2: Spiked chain box with sweeping axe swings.
 */
export function kingSpikedChain(box: BattleBox): Bullet[] {
  const bullets: Bullet[] = [];
  const count = 10;

  for (let i = 0; i < count; i++) {
    const delay = i * 0.45;
    const fromLeft = i % 2 === 0;

    bullets.push(
      new Bullet({
        x: fromLeft ? box.x + 10 + i * 8 : box.x + box.width - 10 - i * 8,
        y: box.y - 14,
        vx: fromLeft ? 20 : -20,
        vy: 50,
        type: 'AXE',
        radius: 5,
        damage: 8,
        spawnDelay: delay,
        lifetime: 3.5,
        angularVelocity: 4.5,
      })
    );
  }

  return bullets;
}

export const KING_BOSS_CONFIG: BossConfig = {
  id: 'king',
  name: 'KING',
  maxHp: 500,
  hp: 500,
  maxMercy: 100,
  mercy: 0,
  acts: [
    {
      name: 'Check',
      description: 'Ruthless monarch of Card Castle fueled by betrayal.',
      mercyGain: 0,
      dialogue: 'KING glares with disdain: "Lightners... you shall kneel!"',
    },
    {
      name: 'Defy',
      description: 'Stand firm against the tyrant king.',
      mercyGain: 30,
      dialogue: 'KING trembles with rage: "Your defiance will be your undoing!"',
    },
    {
      name: 'Reason',
      description: 'Remind him of Lancer and true leadership.',
      mercyGain: 40,
      dialogue: 'KING pauses for a flicker of a second before gritting his teeth.',
    },
  ],
  patterns: [kingChaosSpades, kingSpikedChain],
};

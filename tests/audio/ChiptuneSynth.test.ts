import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChiptuneSynth, SfxType, SpeakerVoice } from '../../src/audio/ChiptuneSynth';

describe('ChiptuneSynth', () => {
  let originalAudioContext: typeof window.AudioContext;
  let originalWebkitAudioContext: unknown;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
    originalWebkitAudioContext = (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = originalWebkitAudioContext;
  });

  describe('Graceful Fallback without AudioContext', () => {
    it('initializes safely when AudioContext is not available', () => {
      // Remove AudioContext from environment
      // @ts-expect-error intentionally removing AudioContext
      delete window.AudioContext;
      // @ts-expect-error intentionally removing webkitAudioContext
      delete (window as Record<string, unknown>).webkitAudioContext;

      const synth = new ChiptuneSynth();
      expect(synth.isAvailable).toBe(false);
      expect(() => synth.playBlip('KRIS')).not.toThrow();
      expect(() => synth.playSfx('SWORD_SLASH')).not.toThrow();
    });

    it('does not throw when AudioContext constructor throws', () => {
      window.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('The AudioContext was not allowed to start');
      });

      const synth = new ChiptuneSynth();
      expect(synth.isAvailable).toBe(false);
      expect(() => synth.playBlip('SUSIE')).not.toThrow();
      expect(() => synth.playSfx('SELECT')).not.toThrow();
    });
  });

  describe('Muting Functionality', () => {
    it('toggles muted state correctly', () => {
      const synth = new ChiptuneSynth();
      expect(synth.isMuted()).toBe(false);

      synth.setMuted(true);
      expect(synth.isMuted()).toBe(true);

      synth.setMuted(false);
      expect(synth.isMuted()).toBe(false);
    });

    it('does not play audio when muted', () => {
      const mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          value: 1,
        },
        connect: vi.fn(),
      };
      const mockOscNode = {
        type: 'square',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      const mockCtx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createGain: vi.fn().mockReturnValue(mockGainNode),
        createOscillator: vi.fn().mockReturnValue(mockOscNode),
        createBuffer: vi.fn(),
        createBufferSource: vi.fn(),
        resume: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;

      const synth = new ChiptuneSynth(mockCtx);
      synth.setMuted(true);

      synth.playBlip('KRIS');
      synth.playSfx('CONFIRM');

      expect(mockOscNode.start).not.toHaveBeenCalled();
    });
  });

  describe('Speaker Blip Voices', () => {
    let mockCtx: AudioContext;
    let mockGainNode: {
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        value: number;
      };
      connect: ReturnType<typeof vi.fn>;
    };
    let mockOscNode: {
      type: OscillatorType;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          value: 1,
        },
        connect: vi.fn(),
      };
      mockOscNode = {
        type: 'square',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      mockCtx = {
        state: 'running',
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        createGain: vi.fn().mockReturnValue(mockGainNode),
        createOscillator: vi.fn().mockReturnValue(mockOscNode),
        createBuffer: vi.fn().mockReturnValue({
          getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
        }),
        createBufferSource: vi.fn().mockReturnValue({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }),
        createBiquadFilter: vi.fn().mockReturnValue({
          type: 'lowpass',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
        }),
        resume: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;
    });

    const speakers: SpeakerVoice[] = ['KRIS', 'NARRATOR', 'SUSIE', 'RALSEI', 'LANCER', 'KING'];

    speakers.forEach((speaker) => {
      it(`plays voice blip for ${speaker} without throwing`, () => {
        const synth = new ChiptuneSynth(mockCtx);
        expect(() => synth.playBlip(speaker)).not.toThrow();
        expect(mockOscNode.start).toHaveBeenCalled();
      });
    });

    it('falls back to default voice if speaker is unknown or omitted', () => {
      const synth = new ChiptuneSynth(mockCtx);
      expect(() => synth.playBlip()).not.toThrow();
      expect(mockOscNode.start).toHaveBeenCalled();

      expect(() => synth.playBlip('UNKNOWN_CHARACTER')).not.toThrow();
    });

    it('handles lowercase speaker names', () => {
      const synth = new ChiptuneSynth(mockCtx);
      expect(() => synth.playBlip('susie')).not.toThrow();
      expect(mockOscNode.type).toBe('sawtooth');
    });
  });

  describe('Retro Sound Effects', () => {
    let mockCtx: AudioContext;

    beforeEach(() => {
      mockCtx = {
        state: 'running',
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        createGain: vi.fn().mockReturnValue({
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            value: 1,
          },
          connect: vi.fn(),
        }),
        createOscillator: vi.fn().mockReturnValue({
          type: 'square',
          frequency: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }),
        createBuffer: vi.fn().mockReturnValue({
          getChannelData: vi.fn().mockReturnValue(new Float32Array(1000)),
        }),
        createBufferSource: vi.fn().mockReturnValue({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }),
        createBiquadFilter: vi.fn().mockReturnValue({
          type: 'lowpass',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
        }),
        resume: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;
    });

    const sfxList: SfxType[] = [
      'SWORD_SLASH',
      'SWORD_PULL',
      'OBSTACLE_DESTROY',
      'HURT',
      'SELECT',
      'CONFIRM',
      'LEVEL_UP',
    ];

    sfxList.forEach((sfx) => {
      it(`plays SFX '${sfx}' without throwing`, () => {
        const synth = new ChiptuneSynth(mockCtx);
        expect(() => synth.playSfx(sfx)).not.toThrow();
      });
    });
  });
});

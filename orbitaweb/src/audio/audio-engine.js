import { drumPlaybackRate, midiForChip } from '../core/music.js';
import { createVoiceProviders } from './synth-voices.js';

function defaultContextFactory() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
  return new AudioContextClass();
}

function clampVolume(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.72;
  return Math.min(1, Math.max(0, numeric));
}

export class AudioEngine {
  constructor({ contextFactory = defaultContextFactory, initialVolume = 0.72 } = {}) {
    this.contextFactory = contextFactory;
    this.masterVolume = clampVolume(initialVolume);
    this.context = null;
    this.masterGain = null;
    this.voiceProviders = null;
    this.orbitaBuses = new Map();
    this._ensureStartedPromise = null;
    this._unlocked = false;
  }

  async ensureStarted() {
    if (this._ensureStartedPromise) return this._ensureStartedPromise;
    this._ensureStartedPromise = this._ensureStartedImpl();
    try {
      return await this._ensureStartedPromise;
    } finally {
      this._ensureStartedPromise = null;
    }
  }

  async _ensureStartedImpl() {
    if (!this.context || this.context.state === 'closed') {
      this.context = this.contextFactory();
      this._unlocked = false;
      this.voiceProviders = null;
      this.masterGain = this.context.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
      this.masterGain.connect(this.context.destination);
      this.orbitaBuses.clear();
    }

    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') {
      throw new Error(`AudioContext failed to enter the running state: ${this.context.state}`);
    }

    await this._unlockAudioIfNeeded();
    return this.context;
  }

  async _unlockAudioIfNeeded() {
    if (!this.context || !this.masterGain || this._unlocked) return;
    if (this.context.state !== 'running') return;
    if (typeof this.context.createBuffer !== 'function' || typeof this.context.createBufferSource !== 'function') return;

    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();

    source.buffer = buffer;
    gain.gain.setValueAtTime(0.0001, now);
    source.connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.001);

    source.addEventListener?.('ended', () => {
      source.disconnect();
      gain.disconnect();
    }, { once: true });

    this._unlocked = true;
  }

  setMasterVolume(value) {
    this.masterVolume = clampVolume(value);
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
    }
  }

  getOrbitaBus(orbitaId) {
    let bus = this.orbitaBuses.get(orbitaId);
    if (!bus) {
      bus = this.context.createGain();
      bus.gain.setValueAtTime(1, this.context.currentTime);
      bus.connect(this.masterGain);
      this.orbitaBuses.set(orbitaId, bus);
    }
    return bus;
  }

  trigger(orbita, chip, audioTime) {
    if (!this.context) return;
    if (!this.voiceProviders) this.voiceProviders = createVoiceProviders(this.context);
    const destination = this.getOrbitaBus(orbita.id);
    destination.gain.setValueAtTime(1, audioTime);
    const provider = this.voiceProviders[orbita.sourcePack];
    if (!provider) return;

    if (orbita.sourcePack === 'drums') {
      provider.trigger(chip.colorIndex, audioTime, {
        destination,
        playbackRate: drumPlaybackRate(chip.trackIndex),
        orbitaId: orbita.id,
      });
      return;
    }

    provider.trigger(midiForChip(orbita, chip), audioTime, {
      destination,
      velocity: 0.82,
      orbitaId: orbita.id,
    });
  }

  async preview(orbita, colorIndex, trackIndex) {
    const context = await this.ensureStarted();
    this.trigger(orbita, {
      id: 'preview',
      colorIndex,
      trackIndex,
      angle: 0,
    }, context.currentTime + 0.02);
  }

  silenceOrbita(orbitaId) {
    const bus = this.orbitaBuses.get(orbitaId);
    if (!bus || !this.context) return;
    const now = this.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.linearRampToValueAtTime(0, now + 0.02);
  }

  silenceAll() {
    for (const orbitaId of this.orbitaBuses.keys()) this.silenceOrbita(orbitaId);
  }
}

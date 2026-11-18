import { normalizeAngle, revolutionSeconds } from './music.js';

const EPSILON = 1e-9;

export function eventsBetween(orbita, anchorTime, fromTime, toTime) {
  if (toTime <= fromTime) return [];
  const duration = revolutionSeconds(orbita.bpm);
  const events = [];

  for (const chip of orbita.chips) {
    const rawCycle = (fromTime - anchorTime) / duration - chip.angle;
    let cycle = Math.floor(rawCycle) + 1;
    cycle = Math.max(0, cycle);

    while (true) {
      const audioTime = anchorTime + (cycle + chip.angle) * duration;
      if (audioTime > toTime + EPSILON) break;
      if (audioTime > fromTime + EPSILON) {
        events.push({ chip, audioTime, cycle });
      }
      cycle += 1;
    }
  }

  return events.sort((a, b) => a.audioTime - b.audioTime || a.chip.id.localeCompare(b.chip.id));
}

export class OrbitaTransport {
  constructor(orbita) {
    this.orbita = orbita;
    this.bpm = orbita.bpm;
    this.running = false;
    this.anchorTime = 0;
    this.anchorPhase = 0;
    this.scheduledKeys = new Set();
  }

  start(atTime) {
    this.running = true;
    this.anchorTime = atTime;
    this.anchorPhase = 0;
    this.scheduledKeys.clear();
  }

  stop() {
    this.running = false;
    this.anchorPhase = 0;
    this.scheduledKeys.clear();
  }

  setBpm(bpm, atTime) {
    const phase = this.phaseAt(atTime);
    this.bpm = bpm;
    this.orbita = { ...this.orbita, bpm };
    this.anchorTime = atTime;
    this.anchorPhase = phase;
    this.scheduledKeys.clear();
  }

  updateOrbita(orbita) {
    this.orbita = orbita;
  }

  phaseAt(audioTime) {
    if (!this.running) return 0;
    if (audioTime <= this.anchorTime) return this.anchorPhase;
    const elapsed = audioTime - this.anchorTime;
    return normalizeAngle(this.anchorPhase + elapsed / revolutionSeconds(this.bpm));
  }

  schedule(now, horizon, callback) {
    if (!this.running) return;
    const duration = revolutionSeconds(this.bpm);
    const zeroPhaseTime = this.anchorTime - this.anchorPhase * duration;
    const events = eventsBetween(
      { ...this.orbita, bpm: this.bpm },
      zeroPhaseTime,
      now,
      now + horizon,
    );

    for (const event of events) {
      const key = `${event.chip.id}:${event.cycle}:${zeroPhaseTime}`;
      if (this.scheduledKeys.has(key)) continue;
      this.scheduledKeys.add(key);
      callback(event);
    }

    const oldestRelevantCycle = Math.floor((now - zeroPhaseTime) / duration) - 1;
    for (const key of this.scheduledKeys) {
      const [, cycle] = key.split(':');
      if (Number(cycle) < oldestRelevantCycle) this.scheduledKeys.delete(key);
    }
  }
}

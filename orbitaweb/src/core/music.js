import {
  BPM_MAX,
  BPM_MIN,
  DRUM_TRACK_SEMITONES,
  MAJOR_INTERVALS,
  MINOR_INTERVALS,
  PACK_BASE_MIDI,
  TRACK_HIT_WIDTH,
  TRACK_RADII,
} from '../constants.js';

export function clampBpm(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, numeric));
}

export function normalizeAngle(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((numeric % 1) + 1) % 1;
}

export function quantizeAngle(value, mode = 'snap') {
  const normalized = normalizeAngle(value);
  if (mode === 'free') return normalized;
  return normalizeAngle(Math.round(normalized * 16) / 16);
}

export function revolutionSeconds(bpm) {
  return 240 / clampBpm(bpm);
}

export function midiForChip(orbita, chip) {
  const intervals = orbita.scaleMode === 'minor' ? MINOR_INTERVALS : MAJOR_INTERVALS;
  const base = PACK_BASE_MIDI[orbita.sourcePack] ?? PACK_BASE_MIDI.pluck;
  const root = Number(orbita.rootNote) || 0;
  const colorInterval = intervals[chip.colorIndex] ?? 0;
  const octaveOffset = (chip.trackIndex - 2) * 12;
  return base + root + colorInterval + octaveOffset;
}

export function drumPlaybackRate(trackIndex) {
  const semitones = DRUM_TRACK_SEMITONES[trackIndex] ?? 0;
  return 2 ** (semitones / 12);
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function pointToPlacement(clientX, clientY, bounds, mode = 'snap') {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const scaleX = 400 / bounds.width;
  const scaleY = 400 / bounds.height;
  const x = (clientX - bounds.left) * scaleX - 200;
  const y = (clientY - bounds.top) * scaleY - 200;
  const radius = Math.hypot(x, y);

  let trackIndex = -1;
  let bestDistance = Infinity;
  TRACK_RADII.forEach((trackRadius, index) => {
    const distance = Math.abs(radius - trackRadius);
    if (distance < bestDistance) {
      bestDistance = distance;
      trackIndex = index;
    }
  });

  if (bestDistance > TRACK_HIT_WIDTH / 2) return null;

  const clockwiseFromTop = Math.atan2(x, -y) / (Math.PI * 2);
  return {
    trackIndex,
    angle: quantizeAngle(clockwiseFromTop, mode),
  };
}

import {
  MAX_ORBITAS,
  PROJECT_VERSION,
  SCALE_MODES,
  SNAP_MODES,
  SOURCE_PACKS,
  TRACK_COUNT,
} from '../constants.js';
import { clampBpm } from './music.js';

let fallbackId = 0;

export function createId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  fallbackId += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackId.toString(36)}`;
}

export function createOrbita(overrides = {}) {
  return {
    id: createId('orbita'),
    sourcePack: 'pluck',
    bpm: 100,
    rootNote: 0,
    scaleMode: 'major',
    snapMode: 'snap',
    chips: [],
    ...overrides,
  };
}

export function createProject() {
  return {
    version: PROJECT_VERSION,
    masterVolume: 0.72,
    orbitas: [createOrbita()],
  };
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function validateChip(chip, sourcePack) {
  assert(chip && typeof chip === 'object', 'Each chip must be an object.');
  assert(typeof chip.id === 'string' && chip.id.length > 0, 'Each chip needs an id.');
  const maxColor = sourcePack === 'drums' ? 3 : 6;
  assert(Number.isInteger(chip.colorIndex) && chip.colorIndex >= 0 && chip.colorIndex <= maxColor, 'Chip color is invalid for this source pack.');
  assert(Number.isInteger(chip.trackIndex) && chip.trackIndex >= 0 && chip.trackIndex < TRACK_COUNT, 'Chip track must be between 0 and 4.');
  assert(Number.isFinite(chip.angle) && chip.angle >= 0 && chip.angle < 1, 'Chip angle must be between 0 and 1.');
  return {
    id: chip.id,
    colorIndex: chip.colorIndex,
    trackIndex: chip.trackIndex,
    angle: chip.angle,
  };
}

function validateOrbita(orbita) {
  assert(orbita && typeof orbita === 'object', 'Each Orbita must be an object.');
  assert(typeof orbita.id === 'string' && orbita.id.length > 0, 'Each Orbita needs an id.');
  assert(SOURCE_PACKS.includes(orbita.sourcePack), 'Orbita source pack is invalid.');
  assert(Number.isInteger(orbita.rootNote) && orbita.rootNote >= 0 && orbita.rootNote <= 11, 'Root note must be between 0 and 11.');
  assert(SCALE_MODES.includes(orbita.scaleMode), 'Scale mode must be major or minor.');
  assert(SNAP_MODES.includes(orbita.snapMode), 'Snap mode must be snap or free.');
  assert(Array.isArray(orbita.chips), 'Orbita chips must be an array.');

  return {
    id: orbita.id,
    sourcePack: orbita.sourcePack,
    bpm: clampBpm(orbita.bpm),
    rootNote: orbita.rootNote,
    scaleMode: orbita.scaleMode,
    snapMode: orbita.snapMode,
    chips: orbita.chips.map((chip) => validateChip(chip, orbita.sourcePack)),
  };
}

export function validateProject(value) {
  assert(value && typeof value === 'object', 'Project must be an object.');
  assert(value.version === PROJECT_VERSION, `Unsupported project version: ${value.version}`);
  assert(Array.isArray(value.orbitas) && value.orbitas.length >= 1 && value.orbitas.length <= MAX_ORBITAS, 'A project must contain one to three Orbitas.');
  const numericVolume = Number(value.masterVolume);
  assert(Number.isFinite(numericVolume), 'Master volume must be numeric.');

  return {
    version: PROJECT_VERSION,
    masterVolume: Math.min(1, Math.max(0, numericVolume)),
    orbitas: value.orbitas.map(validateOrbita),
  };
}

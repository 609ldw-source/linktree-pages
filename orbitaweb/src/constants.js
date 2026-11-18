export const BPM_MIN = 40;
export const BPM_MAX = 200;
export const TRACK_COUNT = 5;
export const MAX_ORBITAS = 3;
export const PROJECT_VERSION = 1;

export const SOURCE_PACKS = ['drums', 'piano', 'pluck', 'guitar'];
export const SCALE_MODES = ['major', 'minor'];
export const SNAP_MODES = ['snap', 'free'];

export const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
export const DRUM_TRACK_SEMITONES = [-2, -1, 0, 1, 2];
export const PACK_BASE_MIDI = {
  piano: 60,
  pluck: 60,
  guitar: 48,
};

export const TRACK_RADII = [72, 98, 124, 150, 176];
export const TRACK_HIT_WIDTH = 22;

export const PITCH_COLORS = [
  { name: 'Red', hex: '#ff5c45' },
  { name: 'Orange', hex: '#ff9f2e' },
  { name: 'Yellow', hex: '#ffd84a' },
  { name: 'Green', hex: '#5ac779' },
  { name: 'Blue', hex: '#4aa7ff' },
  { name: 'Indigo', hex: '#6658e8' },
  { name: 'Violet', hex: '#c15ee8' },
];

export const DRUM_COLORS = [
  { name: 'Kick', hex: '#ff5c45' },
  { name: 'Hi-hat', hex: '#ffd84a' },
  { name: 'Snare', hex: '#4aa7ff' },
  { name: 'Rimshot', hex: '#c15ee8' },
];

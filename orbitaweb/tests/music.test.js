import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampBpm,
  drumPlaybackRate,
  midiForChip,
  pointToPlacement,
  quantizeAngle,
  revolutionSeconds,
} from '../src/core/music.js';

test('clamps BPM to 40–200 and maps one 120 BPM bar to two seconds', () => {
  assert.equal(clampBpm(12), 40);
  assert.equal(clampBpm(240), 200);
  assert.equal(revolutionSeconds(120), 2);
});

test('snaps angles to sixteen steps and wraps one to zero', () => {
  assert.equal(quantizeAngle(0.07, 'snap'), 1 / 16);
  assert.equal(quantizeAngle(0.99, 'snap'), 0);
  assert.equal(quantizeAngle(0.123, 'free'), 0.123);
});

test('maps major scale colors and five octave tracks', () => {
  const orbita = { sourcePack: 'piano', rootNote: 0, scaleMode: 'major' };
  assert.equal(midiForChip(orbita, { colorIndex: 0, trackIndex: 2 }), 60);
  assert.equal(midiForChip(orbita, { colorIndex: 2, trackIndex: 3 }), 76);
});

test('maps guitar center track to C3', () => {
  const orbita = { sourcePack: 'guitar', rootNote: 0, scaleMode: 'major' };
  assert.equal(midiForChip(orbita, { colorIndex: 0, trackIndex: 2 }), 48);
});

test('maps drum tracks to semitone playback rates', () => {
  assert.equal(drumPlaybackRate(2), 1);
  assert.equal(drumPlaybackRate(4), 2 ** (2 / 12));
});

test('maps top position to angle zero and the nearest of five tracks', () => {
  const bounds = { left: 0, top: 0, width: 400, height: 400 };
  assert.deepEqual(pointToPlacement(200, 76, bounds, 'free'), {
    trackIndex: 2,
    angle: 0,
  });
});

test('rejects pointer positions outside the playable rings', () => {
  const bounds = { left: 0, top: 0, width: 400, height: 400 };
  assert.equal(pointToPlacement(200, 200, bounds, 'free'), null);
  assert.equal(pointToPlacement(200, 5, bounds, 'free'), null);
});

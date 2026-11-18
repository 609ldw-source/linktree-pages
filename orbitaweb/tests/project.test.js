import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrbita,
  createProject,
  validateProject,
} from '../src/core/project.js';

test('creates one stopped Orbita with default musical settings', () => {
  const project = createProject();
  assert.equal(project.version, 1);
  assert.equal(project.orbitas.length, 1);
  assert.equal(project.orbitas[0].bpm, 100);
  assert.equal(project.orbitas[0].sourcePack, 'pluck');
  assert.deepEqual(project.orbitas[0].chips, []);
  assert.equal('running' in project.orbitas[0], false);
});

test('clones valid data and clamps persisted ranges', () => {
  const original = {
    version: 1,
    masterVolume: 4,
    orbitas: [createOrbita({ bpm: 500 })],
  };
  const validated = validateProject(original);
  assert.equal(validated.masterVolume, 1);
  assert.equal(validated.orbitas[0].bpm, 200);
  assert.notEqual(validated, original);
});

test('rejects more than three Orbitas', () => {
  assert.throws(() => validateProject({
    version: 1,
    masterVolume: 0.8,
    orbitas: [createOrbita(), createOrbita(), createOrbita(), createOrbita()],
  }), /one to three/i);
});

test('rejects invalid chip tracks and pack-specific colors', () => {
  const invalidTrack = createOrbita({
    chips: [{ id: 'c1', colorIndex: 0, trackIndex: 5, angle: 0 }],
  });
  assert.throws(() => validateProject({ version: 1, masterVolume: 0.8, orbitas: [invalidTrack] }), /track/i);

  const invalidDrumColor = createOrbita({
    sourcePack: 'drums',
    chips: [{ id: 'c2', colorIndex: 4, trackIndex: 2, angle: 0.5 }],
  });
  assert.throws(() => validateProject({ version: 1, masterVolume: 0.8, orbitas: [invalidDrumColor] }), /color/i);
});

test('rejects empty projects and unsupported versions', () => {
  assert.throws(() => validateProject({ version: 1, masterVolume: 0.8, orbitas: [] }), /one to three/i);
  assert.throws(() => validateProject({ version: 9, masterVolume: 0.8, orbitas: [createOrbita()] }), /version/i);
});

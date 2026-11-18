import test from 'node:test';
import assert from 'node:assert/strict';

import { createProject } from '../src/core/project.js';
import { createProjectStore } from '../src/storage/project-store.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    values,
  };
}

test('debounced storage writes a validated versioned project', async () => {
  const memory = createMemoryStorage();
  const store = createProjectStore(memory, { delay: 5 });
  const results = [];
  store.scheduleSave(createProject(), (result) => results.push(result));
  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(JSON.parse(memory.values.get('orbita-web:project')).version, 1);
  assert.deepEqual(results, [{ ok: true }]);
});

test('load returns a cloned validated project', () => {
  const memory = createMemoryStorage();
  const project = createProject();
  memory.setItem('orbita-web:project', JSON.stringify(project));
  const loaded = createProjectStore(memory).load();
  assert.deepEqual(loaded, project);
  assert.notEqual(loaded, project);
});

test('invalid import never returns a replacement project', () => {
  const store = createProjectStore(createMemoryStorage());
  assert.throws(() => store.parseImportedJson('{"version":1,"masterVolume":0.8,"orbitas":[]}'), /one to three/i);
  assert.throws(() => store.parseImportedJson('{not json}'), /JSON/i);
});

test('storage errors report failure without throwing from the autosave timer', async () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error('quota full'); },
  };
  const store = createProjectStore(storage, { delay: 5 });
  const results = [];
  store.scheduleSave(createProject(), (result) => results.push(result));
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.match(results[0].message, /quota full/i);
});

test('flush persists the latest pending project immediately', () => {
  const memory = createMemoryStorage();
  const store = createProjectStore(memory, { delay: 500 });
  const project = createProject();
  project.orbitas[0].bpm = 144;
  store.scheduleSave(project);
  store.flush();
  assert.equal(JSON.parse(memory.values.get('orbita-web:project')).orbitas[0].bpm, 144);
});

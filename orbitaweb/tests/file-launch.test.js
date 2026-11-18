import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');

test('index uses a classic bundled script that can run from file URLs', () => {
  const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
  assert.match(html, /<script defer src="\.\/dist\/app\.js(?:\?[^\"]+)?"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);

  const bundlePath = resolve(projectRoot, 'dist/app.js');
  assert.ok(statSync(bundlePath).size > 1_000);
  const bundle = readFileSync(bundlePath, 'utf8');
  assert.doesNotMatch(bundle, /^\s*import\s/m);
  assert.doesNotMatch(bundle, /^\s*export\s/m);
});

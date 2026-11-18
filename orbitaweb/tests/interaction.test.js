import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDropAction } from '../src/core/interaction.js';

test('deletes only an existing chip dropped over its trash zone', () => {
  assert.equal(resolveDropAction({ isExisting: true, overTrash: true, placement: null }), 'delete');
  assert.equal(resolveDropAction({ isExisting: false, overTrash: true, placement: null }), 'cancel');
});

test('moves or adds a chip only when a valid platter placement exists', () => {
  const placement = { trackIndex: 3, angle: 0.25 };
  assert.equal(resolveDropAction({ isExisting: true, overTrash: false, placement }), 'move');
  assert.equal(resolveDropAction({ isExisting: false, overTrash: false, placement }), 'add');
  assert.equal(resolveDropAction({ isExisting: true, overTrash: false, placement: null }), 'rollback');
  assert.equal(resolveDropAction({ isExisting: false, overTrash: false, placement: null }), 'cancel');
});

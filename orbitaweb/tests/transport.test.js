import test from 'node:test';
import assert from 'node:assert/strict';

import { eventsBetween, OrbitaTransport } from '../src/core/transport.js';

test('returns a zero-angle chip once at a revolution boundary', () => {
  const orbita = {
    bpm: 120,
    chips: [{ id: 'zero', colorIndex: 0, trackIndex: 0, angle: 0 }],
  };
  const events = eventsBetween(orbita, 1, 0.99, 1.02);
  assert.deepEqual(events.map((event) => event.chip.id), ['zero']);
  assert.equal(events[0].audioTime, 1);
});

test('orders multiple chips by their scheduled time', () => {
  const orbita = {
    bpm: 120,
    chips: [
      { id: 'later', colorIndex: 0, trackIndex: 0, angle: 0.5 },
      { id: 'early', colorIndex: 1, trackIndex: 0, angle: 0.25 },
    ],
  };
  const events = eventsBetween(orbita, 10, 10, 11.1);
  assert.deepEqual(events.map((event) => event.chip.id), ['early', 'later']);
  assert.deepEqual(events.map((event) => event.audioTime), [10.5, 11]);
});

test('uses each Orbita BPM independently', () => {
  const slow = new OrbitaTransport({ bpm: 60, chips: [] });
  const fast = new OrbitaTransport({ bpm: 120, chips: [] });
  slow.start(10);
  fast.start(10);
  assert.equal(slow.phaseAt(11), 0.25);
  assert.equal(fast.phaseAt(11), 0.5);
});

test('holds at phase zero until the scheduled start time', () => {
  const transport = new OrbitaTransport({ bpm: 120, chips: [] });
  transport.start(10);
  assert.equal(transport.phaseAt(9.95), 0);
  assert.equal(transport.phaseAt(10), 0);
});

test('does not schedule an event twice across overlapping horizons', () => {
  const orbita = {
    bpm: 120,
    chips: [{ id: 'chip', colorIndex: 0, trackIndex: 0, angle: 0.25 }],
  };
  const transport = new OrbitaTransport(orbita);
  const scheduled = [];
  transport.start(5);
  transport.schedule(5, 0.6, (event) => scheduled.push(event));
  transport.schedule(5.4, 0.4, (event) => scheduled.push(event));
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].audioTime, 5.5);
});

test('BPM changes preserve current phase and alter future rate', () => {
  const transport = new OrbitaTransport({ bpm: 120, chips: [] });
  transport.start(2);
  transport.setBpm(60, 3);
  assert.equal(transport.phaseAt(3), 0.5);
  assert.equal(transport.phaseAt(4), 0.75);
});

test('uses newly placed chips without resetting playback phase', () => {
  const transport = new OrbitaTransport({ bpm: 120, chips: [] });
  transport.start(5);
  transport.updateOrbita({
    bpm: 120,
    chips: [{ id: 'new', colorIndex: 0, trackIndex: 2, angle: 0.5 }],
  });
  const scheduled = [];
  transport.schedule(5.8, 0.3, (event) => scheduled.push(event));
  assert.ok(Math.abs(transport.phaseAt(5.8) - 0.4) < 1e-9);
  assert.deepEqual(scheduled.map((event) => event.chip.id), ['new']);
});

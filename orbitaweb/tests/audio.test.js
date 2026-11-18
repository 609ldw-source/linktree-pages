import test from 'node:test';
import assert from 'node:assert/strict';

import { AudioEngine } from '../src/audio/audio-engine.js';

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push(['set', value, time]);
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(['ramp', value, time]);
  }

  cancelScheduledValues(time) {
    this.events.push(['cancel', time]);
  }
}

class FakeGain {
  constructor() {
    this.gain = new FakeAudioParam(1);
    this.connectedTo = null;
  }

  connect(destination) {
    this.connectedTo = destination;
    return destination;
  }
}

class FakeAudioContext {
  constructor(state = 'suspended') {
    this.state = state;
    this.currentTime = 4;
    this.destination = { name: 'speakers' };
    this.resumeCount = 0;
  }

  createGain() {
    return new FakeGain();
  }

  async resume() {
    this.resumeCount += 1;
    this.state = 'running';
  }
}

test('creates and resumes AudioContext only after ensureStarted', async () => {
  const context = new FakeAudioContext();
  const engine = new AudioEngine({ contextFactory: () => context, initialVolume: 0.6 });
  assert.equal(engine.context, null);

  await engine.ensureStarted();

  assert.equal(engine.context, context);
  assert.equal(context.resumeCount, 1);
  assert.equal(engine.masterGain.gain.value, 0.6);
  assert.equal(engine.masterGain.connectedTo, context.destination);
});

test('updates master volume safely before and after context creation', async () => {
  const context = new FakeAudioContext();
  const engine = new AudioEngine({ contextFactory: () => context });
  engine.setMasterVolume(2);
  await engine.ensureStarted();
  assert.equal(engine.masterGain.gain.value, 1);

  engine.setMasterVolume(-4);
  assert.equal(engine.masterGain.gain.value, 0);
});

test('reuses one AudioContext across repeated starts', async () => {
  const context = new FakeAudioContext();
  const engine = new AudioEngine({ contextFactory: () => context });
  await engine.ensureStarted();
  await engine.ensureStarted();
  assert.equal(context.resumeCount, 1);
});

test('resumes Safari interrupted contexts before returning', async () => {
  const context = new FakeAudioContext('interrupted');
  const engine = new AudioEngine({ contextFactory: () => context });

  const startedContext = await engine.ensureStarted();

  assert.equal(startedContext.state, 'running');
  assert.equal(context.resumeCount, 1);
});

test('rejects when the browser leaves audio blocked after resume', async () => {
  const context = new FakeAudioContext('interrupted');
  context.resume = async function resumeWithoutStarting() {
    this.resumeCount += 1;
  };
  const engine = new AudioEngine({ contextFactory: () => context });

  await assert.rejects(
    engine.ensureStarted(),
    /AudioContext failed to enter the running state/,
  );
});

test('previews a chip without starting a transport', async () => {
  const context = new FakeAudioContext();
  const events = [];
  const engine = new AudioEngine({ contextFactory: () => context });
  engine.voiceProviders = {
    drums: {
      trigger(colorIndex, audioTime, options) {
        events.push({ colorIndex, audioTime, playbackRate: options.playbackRate });
      },
    },
  };

  await engine.preview(
    { id: 'orbita-preview', sourcePack: 'drums' },
    2,
    4,
  );

  assert.equal(context.state, 'running');
  assert.deepEqual(events, [{
    colorIndex: 2,
    audioTime: 4.02,
    playbackRate: 2 ** ((4 - 2) / 12),
  }]);
});

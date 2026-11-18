import { midiToFrequency } from '../core/music.js';

function connectEnvelope(context, destination, time, peak, attack, decay) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  gain.connect(destination);
  return gain;
}

function stopAndDisconnect(source, nodes, stopTime) {
  source.addEventListener?.('ended', () => {
    source.disconnect?.();
    nodes.forEach((node) => node.disconnect?.());
  }, { once: true });
  source.stop(stopTime);
}

function createNoiseBuffer(context, duration = 0.4) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function triggerKick(context, destination, time, playbackRate) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(150 * playbackRate, time);
  oscillator.frequency.exponentialRampToValueAtTime(45 * playbackRate, time + 0.16);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  stopAndDisconnect(oscillator, [gain], time + 0.4);
}

function triggerNoiseDrum(context, destination, time, { highpass, bandpass, decay, playbackRate, gain: level }) {
  const source = context.createBufferSource();
  const high = context.createBiquadFilter();
  const band = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = createNoiseBuffer(context, decay + 0.05);
  source.playbackRate.setValueAtTime(playbackRate, time);
  high.type = 'highpass';
  high.frequency.value = highpass;
  band.type = 'bandpass';
  band.frequency.value = bandpass;
  band.Q.value = 0.7;
  envelope.gain.setValueAtTime(level, time);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  source.connect(high).connect(band).connect(envelope).connect(destination);
  source.start(time);
  stopAndDisconnect(source, [high, band, envelope], time + decay + 0.03);
}

function triggerSnareBody(context, destination, time, playbackRate) {
  const oscillator = context.createOscillator();
  const envelope = connectEnvelope(context, destination, time, 0.28, 0.002, 0.16);
  oscillator.type = 'triangle';
  oscillator.frequency.value = 180 * playbackRate;
  oscillator.connect(envelope);
  oscillator.start(time);
  stopAndDisconnect(oscillator, [envelope], time + 0.2);
}

function triggerRimshot(context, destination, time, playbackRate) {
  ['square', 'triangle'].forEach((type, index) => {
    const oscillator = context.createOscillator();
    const envelope = connectEnvelope(context, destination, time, index === 0 ? 0.16 : 0.12, 0.001, 0.065);
    oscillator.type = type;
    oscillator.frequency.value = (620 + index * 370) * playbackRate;
    oscillator.connect(envelope);
    oscillator.start(time);
    stopAndDisconnect(oscillator, [envelope], time + 0.09);
  });
}

function triggerPiano(context, destination, midi, time, velocity) {
  const frequency = midiToFrequency(midi);
  [
    { multiple: 1, level: 0.36, type: 'triangle', decay: 1.8 },
    { multiple: 2, level: 0.14, type: 'sine', decay: 1.15 },
    { multiple: 3, level: 0.06, type: 'sine', decay: 0.7 },
  ].forEach((partial) => {
    const oscillator = context.createOscillator();
    const envelope = connectEnvelope(context, destination, time, partial.level * velocity, 0.006, partial.decay);
    oscillator.type = partial.type;
    oscillator.frequency.value = frequency * partial.multiple;
    oscillator.connect(envelope);
    oscillator.start(time);
    stopAndDisconnect(oscillator, [envelope], time + partial.decay + 0.03);
  });
}

function triggerPluck(context, destination, midi, time, velocity) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = connectEnvelope(context, destination, time, 0.34 * velocity, 0.003, 0.65);
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = midiToFrequency(midi);
  filter.type = 'lowpass';
  filter.Q.value = 7;
  filter.frequency.setValueAtTime(5200, time);
  filter.frequency.exponentialRampToValueAtTime(700, time + 0.45);
  oscillator.connect(filter).connect(envelope);
  oscillator.start(time);
  stopAndDisconnect(oscillator, [filter, envelope], time + 0.72);
}

function triggerGuitar(context, destination, midi, time, velocity) {
  const frequency = midiToFrequency(midi);
  ['triangle', 'sawtooth'].forEach((type, index) => {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = connectEnvelope(context, destination, time, (index ? 0.08 : 0.28) * velocity, 0.004, index ? 1.1 : 1.8);
    oscillator.type = type;
    oscillator.frequency.value = frequency * (index ? 2 : 1);
    filter.type = 'lowpass';
    filter.frequency.value = index ? 2400 : 3600;
    oscillator.connect(filter).connect(envelope);
    oscillator.start(time);
    stopAndDisconnect(oscillator, [filter, envelope], time + (index ? 1.2 : 1.9));
  });
}

export function createVoiceProviders(context) {
  return {
    drums: {
      trigger(colorIndex, time, { destination, playbackRate = 1 }) {
        if (colorIndex === 0) triggerKick(context, destination, time, playbackRate);
        if (colorIndex === 1) triggerNoiseDrum(context, destination, time, {
          highpass: 7000, bandpass: 9800, decay: 0.085, playbackRate, gain: 0.2,
        });
        if (colorIndex === 2) {
          triggerNoiseDrum(context, destination, time, {
            highpass: 900, bandpass: 2100, decay: 0.22, playbackRate, gain: 0.34,
          });
          triggerSnareBody(context, destination, time, playbackRate);
        }
        if (colorIndex === 3) triggerRimshot(context, destination, time, playbackRate);
      },
    },
    piano: {
      trigger(midi, time, { destination, velocity = 0.8 }) {
        triggerPiano(context, destination, midi, time, velocity);
      },
    },
    pluck: {
      trigger(midi, time, { destination, velocity = 0.8 }) {
        triggerPluck(context, destination, midi, time, velocity);
      },
    },
    guitar: {
      trigger(midi, time, { destination, velocity = 0.8 }) {
        triggerGuitar(context, destination, midi, time, velocity);
      },
    },
  };
}

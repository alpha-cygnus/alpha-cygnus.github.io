export function createOsc(ac, {type, frequency}) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const pitcher = ac.createGain();
  const c = ac.createConstantSource();
  pitcher.connect(osc.detune);
  pitcher.gain.value = 100;
  return {
    out: osc,
    freq: osc.frequency,
    detune: osc.detune,
    pitch: pitcher,
    _on: t => osc.start(t),
    _cut: t => osc.stop(t + 0.01),
  }
}

export function createGain(ac, {gain}) {
  const g = ac.createGain();
  g.gain.value = gain;
  return {
    inp: g,
    out: g,
    gain: g.gain,
  }
}

export function createConst(ac, {value}) {
  const c = ac.createConstantSource();
  c.offset.value = value;
  c.start();
  return {
    out: c,
  }
}

export function createFilter(ac, {type, frequency}) {
  const filter = ac.createBiquadFilter();
  filter.frequency.value = frequency;
  filter.type = type;
  return {
    inp: filter,
    out: filter,
    freq: filter.frequency,
    detune: filter.detune,
  }
}

export function createAudioParam(ac, params) {
  const c = ac.createConstantSource();
  c.offset.value = 0;
  c.start();
  return {
    inp: c.offset,
    out: c,
  }
}

export function createAudioIn(ac, params) {
  return createGain(ac, {gain: 1, ...params});
}

export function createAudioOut(ac, params) {
  return createGain(ac, {gain: 1, ...params});
}

export function createADSR(ac, {a, d, s, r}) {
  const g = ac.createGain();
  g.gain.value = 0;
  return {
    inp: g,
    out: g,
    _on: t => {
      console.log('ADSR on', t);
      g.gain.setTargetAtTime(1, t, a / 4);
      g.gain.setTargetAtTime(s, t + a, d / 4);
    },
    _off: t => {
      console.log('ADSR off', t);
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0, t, r / 4);
    },
    _cut: t => {
      console.log('ADSR cut', t);
      g.gain.cancelScheduledValues(t);
      g.gain.linearRampToValueAtTime(0, t + 0.01);
    },
  }
}
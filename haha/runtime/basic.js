export function createOsc(ac, {type, frequency}) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  return {
    inp: osc,
    out: osc,
    freq: osc.frequency,
    detune: osc.detune,
    _on: t => osc.start(t),
    _cut: t => osc.stop(t),
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
  return {
    inp: c.offset,
    out: c,
  }
}

export function createAudioIn(ac, params) {
  return createGain(ac, params);
}

export function createAudioOut(ac, params) {
  return createGain(ac, params);
}

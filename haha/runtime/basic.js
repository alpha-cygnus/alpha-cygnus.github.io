export function createOsc(ac, {type, frequency = 440, detune = -900, octave = 0}) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune + octave*1200;
  const pitch = ac.createGain();
  const c = ac.createConstantSource();
  pitch.connect(osc.detune);
  pitch.gain.value = 1200;
  osc.start();
  return {
    out: osc,
    freq: osc.frequency,
    detune: osc.detune,
    pitch,
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

export function createFilter(ac, {type, frequency, detune, q}) {
  const filter = ac.createBiquadFilter();
  filter.frequency.value = frequency;
  filter.detune.value = frequency;
  filter.Q.value = q;
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

class Control {
  constructor() {
    this._subs = {};
  }
  on(what, func) {
    if (typeof func != 'function') {
      return;
    }
    if (!this._subs[what]) this._subs[what] = new Set();
    this._subs[what].add(func);
  }
  send(what, t, data) {
    for (let func of (this._subs[what] || [])) {
      func(t, data);
    }
    for (let func of (this._subs['*'] || [])) {
      func(what, t, data);
    }
  }
  connect(other) {
    this.on('*', (what, t, data) => other.send(what, t, data));
  }
}

export function createControlIn(ac, params) {
  const ctl = new Control();
  return {
    inp: ctl,
    out: ctl,
  }
}

export function createControlOut(ac, params) {
  const ctl = new Control();
  return {
    inp: ctl,
    out: ctl,
  }
}

export function createADSR(ac, {a, d, s, r}) {
  const g = ac.createGain();
  g.gain.value = 0;
  const control = new Control();
  control.on('on', t => {
    console.log('ADSR on', t);
    g.gain.setTargetAtTime(1, t, a / 4);
    g.gain.setTargetAtTime(s, t + a, d / 4);
  });
  control.on('off', t => {
    console.log('ADSR off', t);
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, r / 4);
  });
  control.on('cut', t => {
    console.log('ADSR cut', t);
    g.gain.cancelScheduledValues(t);
    g.gain.linearRampToValueAtTime(0, t + 0.01);
  });
  return {
    inp: g,
    out: g,
    control,
  }
}
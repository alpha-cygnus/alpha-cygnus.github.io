export class Control {
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

export class Core {
  constructor (audio = null) {
    this._audio = audio || new AudioContext();
  }
  get audio() {
    return this._audio;
  }
  get currentTime() {
    return this.audio.currentTime;
  }
  get destination() {
    return this.audio.destination;
  }
  
  createOsc({type, frequency = 440, detune = -900, octave = 0}) {
    const ac = this.audio;
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

  createGain({gain}) {
    const ac = this.audio;
    const g = ac.createGain();
    g.gain.value = gain;
    return {
      inp: g,
      out: g,
      gain: g.gain,
    }
  }

  createConst({value}) {
    const ac = this.audio;
    const c = ac.createConstantSource();
    c.offset.value = value;
    c.start();
    return {
      out: c,
    }
  }

  createFilter({type, frequency, detune, q}) {
    const ac = this.audio;
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

  createDelay({maxDelayTime, delayTime}) {
    const ac = this.audio;
    const d = ac.createDelay(maxDelayTime);
    d.delayTime.value = delayTime;
    return {
      inp: d,
      out: d,
      time: d.delayTime,
    }
  }

  createPan({pan}) {
    const ac = this.audio;
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    return {
      inp: p,
      out: p,
      pan: p.pan,
    }
  }

  createAudioParam(params) {
    const ac = this.audio;
    const c = ac.createConstantSource();
    c.offset.value = 0;
    c.start();
    return {
      inp: c.offset,
      out: c,
    }
  }

  createAudioIn(params) {
    const ac = this.audio;
    return this.createGain({gain: 1, ...params});
  }

  createAudioOut(params) {
    const ac = this.audio;
    return this.createGain({gain: 1, ...params});
  }

  createControlIn(params) {
    const ac = this.audio;
    const ctl = new Control();
    return {
      inp: ctl,
      out: ctl,
    }
  }

  createControlOut(params) {
    const ac = this.audio;
    const ctl = new Control();
    return {
      inp: ctl,
      out: ctl,
    }
  }

  createADSR({a, d, s, r}) {
    const ac = this.audio;
    const g = ac.createGain();
    g.gain.value = 0;
    const control = new Control();
    control.on('on', t => {
      g.gain.setTargetAtTime(1, t, a / 4);
      g.gain.setTargetAtTime(s, t + a, d / 4);
    });
    control.on('off', t => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0, t, r / 4);
    });
    control.on('cut', t => {
      g.gain.cancelScheduledValues(t);
      g.gain.linearRampToValueAtTime(0, t + 0.01);
    });
    return {
      inp: g,
      out: g,
      control,
    }
  }

  createChannel({voices}) {
    const ac = this.audio;
    const out = ac.createGain();
    const control = new Control();
    const mix1 = ac.createGain();
    const mix2 = ac.createGain();
    const mix3 = ac.createGain();
    let _synth = null;
    const playing = {};
    const core = this;
    return {
      setSynth(synth) {
        _synth = synth;
      },
      noteOn(note, v, t) {
        v = v || 0.5;
        t = t || core.currentTime;
        if (playing[note]) {
          const oldSynth = playing[note];
          oldSynth.control.send('cut', core.currentTime);
          playing[note] = null;
        }
        if (!_synth) return;
        const synth = playing[note] = _synth({core});
        synth.out.connect(core.destination);
        synth.pitch.setValueAtTime((note - 60)/12, t);
        synth.vol.setValueAtTime(v, t)
        synth.control.send('on', t);
        control.send('on', t, {note, v});
      },
      _notesDo(notes, what, t) {
        t = t || core.currentTime;
        for (const note of notes) {
          if (playing[note]) {
            playing[note].control.send(what, t);
            if (what === 'cut') playing[note] = null;
          }
        }
      },
      noteOff(note, t) {
        this._notesDo(note ? [note] : Object.keys(playing), 'off', t);
        control.send('off', t, {note});
      },
      noteCut(note, t) {
        this._notesDo(note ? [note] : Object.keys(playing), 'cut', t);
        control.send('cut', t, {note});
      },
      out,
      mix1, mix2, mix3,
      control,
    };
  }
}

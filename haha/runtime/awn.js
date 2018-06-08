class Noise extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
  }

  process(inputs, outputs, parameters) {
    let output = outputs[0];
    for (let channel = 0; channel < output.length; ++channel) {
      let outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; ++i) {
        outputChannel[i] = 2 * (Math.random() - 0.5);
      }
    }

    return true;
  }
}

registerProcessor('noise', Noise);

const frac = x => x - Math.floor(x);

const triSaw = (phase, shape) => {
  let res = frac(phase + shape / 2);
  res = res < shape ? res/shape : (1 - res)/(1 - shape);
  return 2*res - 1;
}
const saw = phase => 2*frac(phase) - 1;
const sine = phase => Math.sin(phase*Math.PI*2);

const square = phase => frac(phase) < 0.5 ? 1 : -1;
const rect = (phase, shape) => {
  const res = frac(phase);
  if (shape < 0.5) {
    return res < shape ? 1 : shape/(shape - 1);
  } else {
    return res < shape ? 1/shape - 1 : -1;
  }
}


const funs = {
  _: _ => 0,
  sine,
  triSaw,
  saw,
  square,
  rect,
};

class LFO extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'trigger', defaultValue: 0},
      {name: 'frequency', defaultValue: 440},
      {name: 'shape', defaultValue: 0, minValue: -1, maxValue: 1},
    ];
  }

  constructor(options) {
    super(options);
    this.type = (options.processorOptions || {}).type;
    this.fun = funs[this.type] || funs._;
    this.phase = 0;
    this.state = 0;
  }

  process(inputs, outputs, parameters) {
    // let input = inputs[0];
    let output = outputs[0][0];
    const f = parameters.frequency[0];
    const shape = (parameters.shape[0] + 1)/2;
    const dph = f/sampleRate;
    let {fun, phase} = this;
    for (let i = 0; i < output.length; ++i) {
      const trig = parameters.trigger[i];
      if (this.state) {
        if (trig < 0.3) this.state = 0;
      } else {
        if (trig > 0.7) {
          this.state = 1;
          phase = 0;
        }
      }
      output[i] = fun(phase, shape);
      phase += dph;
    }
    this.phase = phase;
    return true;
  }
}

registerProcessor('lfo', LFO);

class LinearADSR extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'trigger', defaultValue: 0},
      {name: 'attack', defaultValue: 0, minValue: 0},
      {name: 'decay', defaultValue: 0.1, minValue: 0},
      {name: 'sustain', defaultValue: 0.5, minValue: 0, maxValue: 1},
      {name: 'release', defaultValue: 0.5},
    ];
  }

  constructor(options) {
    super(options);
    this.value = 0;
    this.state = 0;
    this.port.postMessage(options);
  }

  process(inputs, outputs, parameters) {
    let output = outputs[0][0];
    const a = parameters.attack[0];
    const d = parameters.decay[0];
    const s = parameters.sustain[0];
    const r = parameters.release[0];
    const da = a > 0 ? 1/(a*sampleRate) : 1;
    const dd = d > 0 ? 1/(d*sampleRate) : 1;
    const dr = r > 0 ? 1/(r*sampleRate) : 1;

    let {state, value} = this;
    for (let i = 0; i < output.length; ++i) {
      const trig = parameters.trigger[i];
      if (trig < 0.3 && state) state = 0;
      if (trig > 0.7 && !state) state = 1;
      if (state == 1) { // attack
        value += da;
        if (value >= 1) {
          value = 1;
          state = 2;
        }
      } else
      if (state == 2) { // decay
        value -= dd;
        if (value < s) value = s;
      } else { // release
        value -= dr;
        if (value < 0) value = 0;
      }
      output[i] = value;
    }
    this.state = state;
    this.value = value;
    return true;
  }
}

registerProcessor('linADSR', LinearADSR);

class SampleAndHold extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'trigger', defaultValue: 0},
    ];
  }

  constructor(options) {
    super(options);
    this.state = 0;
    this.value = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    let {state, value} = this;
    for (let i = 0; i < output.length; ++i) {
      const trig = parameters.trigger[i];
      if (state) {
        if (trig < 0.3) state = 0;
      } else {
        if (trig > 0.7) {
          state = 1;
          value = input[i];
        }
      }
      output[i] = value;
    }
    this.state = state;
    this.value = value;
    return true;
  }
}

registerProcessor('s&h', SampleAndHold);

class Slew extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'rate', dafaultValue: 1},
    ];
  }
  constructor(options) {
    super(options);
    this.value = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    const rate = parameters.rate[0]/sampleRate;
    let {value} = this;
    for (let i = 0; i < output.length; ++i) {
      const inp = input[i];
      if (inp > value) {
        value += rate;
        if (value > inp) value = inp;
      } else {
        value -= rate;
        if (value < inp) value = inp;
      }
      output[i] = value;
    }
    this.value = value;
    return true;
  }
}

registerProcessor('slew', Slew);

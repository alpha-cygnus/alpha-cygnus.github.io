class WhiteNoise extends AudioWorkletProcessor {
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

registerProcessor('white-noise', WhiteNoise);

class LFO extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'trigger', defaultValue: 0},
      {name: 'frequency', defaultValue: 440},
    ];
  }

  constructor() {
    super();
    this.phase = 0;
  }

  fun(phase) {
    return Math.sin(phase*Math.PI*2);
  }

  process(inputs, outputs, parameters) {
    // let input = inputs[0];
    let output = outputs[0][0];
    for (let i = 0; i < output.length; ++i) {
      output[i] = this.fun(this.phase);
      const f = parameters.frequency[i];
      this.phase += f/sampleRate;
    }

    return true;
  }
}

registerProcessor('lfo', LFO);

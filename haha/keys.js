const KeyToNote = {
  'z': 48,
  's': 49,
  'x': 50,
  'd': 51,
  'c': 52,
  'v': 53,
  'g': 54,
  'b': 55,
  'h': 56,
  'n': 57,
  'j': 58,
  'm': 59,
  'q': 60,
  '2': 61,
  'w': 62,
  '3': 63,
  'e': 64,
  'r': 65,
  '5': 66,
  't': 67,
  '6': 68,
  'y': 69,
  '7': 70,
  'u': 71,
  'i': 72,
  '9': 73,
  'o': 74,
  '0': 75,
  'p': 76,
};

const playing = {};

export function synthKeyDown(core, main, synthFn) {
  return e => {
    if (e.target !== window.document.body) return;
    if (e.repeat) return;
    const note = KeyToNote[e.key.toLowerCase()];
    if (!note) return;
    console.log(note);
    
    const channel = main.channels[0];
    channel.setSynth(synthFn);
    channel.noteOn(note);
    /*
    if (playing[note]) {
      const oldSynth = playing[note];
      oldSynth.control.send('cut', core.currentTime);
      //setTimeout(() => oldSynth.out.disconnect(), 10);
      playing[note] = null;
    }
    const synth = playing[note] = synthFn({core});
    synth.out.connect(core.destination);
    synth.pitch.setValueAtTime((note - 60)/12, core.currentTime);
    synth.vol.setValueAtTime(0.5, core.currentTime)
    synth.control.send('on', core.currentTime);
    */
  }
}

export function synthKeyUp(core, main, synthFn) {
  return e => {
    if (e.target !== window.document.body) return;
    const note = KeyToNote[e.key.toLowerCase()];
    if (!note) return;
    const channel = main.channels[0];
    channel.noteOff(note);
    // if (playing[note]) {
    //   playing[note].control.send('off', core.currentTime);
    // }
  }
}

export function mainPatchKeyDown() {

}

export function mainPatchKeyUp() {

}

import {
  h,
  useRef,
  useState,
  useContext,
  useEffect,
  useMemo,
  createContext,
  useCallback,
  useReducer,
  useImmerReducer,
  Fragment,
  R,
} from './common.js';


export const Context = createContext(null);

export const PatchContext = createContext(null);

export function useAudioContext() {
  return useContext(Context);
}

const EMPTY_PATCH_CONTEXT = [{}, () => {}, '$'];

export function usePatchContext() {
  const ctx = useContext(PatchContext);
  if (!ctx) return EMPTY_PATCH_CONTEXT;
  return ctx;
}

const DEFAULT_OUT = '$out';
const DEFAULT_IN = '$in';

const PORTS = {
  Synth: {
    inDetune: {},
    inFreq: {},
    inGate: {},
    outAudio: {},
  },
  FX: {
    inAudio: {},
    outAudio: {},
  },
};

export const nodeDef = (type, params = {}) => ({type, params});

export const gainDef = (gain) => nodeDef('Gain', {gain});

const portsToNodes = (ports) => 
  Object.fromEntries(
    Object.entries(([name, def]) => [name, {...gainDef(0), ...def}])
  );

export function useNewNode(create, destroy) {
  const ctx = useAudioContext();
  const [result, setNode] = useState(null); //useState(ctx && create(ctx));
  useEffect(() => {
    if (!ctx) return;
    const node = create(ctx);
    // console.log('new node', result, node);
    setNode(node);
    return () => {
      if (destroy) destroy(node, ctx);
      setNode(null);
    }
  }, [ctx]);
  return result;
}

export function useOscillator(type = 'sawtooth', freq = 440) {
  return useNewNode(
    (ctx) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      console.log('starting', osc);
      osc.start();
      return osc;
    },
    (osc) => {
      console.log('stopping', osc);
      osc.stop();
    },
  );
}

export function useGain(gain = 1.0) {
  return useNewNode(
    (ctx) => {
      const node = ctx.createGain();
      node.gain.value = gain;
      return node;
    },
    // (node) => {
    //   node.gain.value = 0;
    // }
  );
}

export function useConstant(value = 1.0) {
  return useNewNode(
    (ctx) => {
      const node = ctx.createConstantSource();
      node.offset.value = value;
      node.start();
      return node;
    }
  );
}

export function useDestination() {
  return useNewNode(
    (ctx) => ctx.destination,
  );
}

export function useOnRef(node, onRef) {
  useEffect(() => {
    if (typeof onRef === 'function') onRef(node);
  }, [node, onRef]);
}

export function usePatch(ref, id) {
  if (!id) throw new Error('no id!');
  const [_, dispatch] = usePatchContext();
  useEffect(() => {
    dispatch({id, ref});
  }, [dispatch, id, ref]);
}

export function usePatchPath() {
  const [_, __, path] = usePatchContext();
  return path || '$$';
}

export function useParam(node, id, value) {
  useEffect(() => {
    if (!node) return;
    if (value == null) return;
    node[id].value = value;
  }, [node, id, value]);
}

export function useAttr(node, id, value) {
  useEffect(() => {
    if (!node) return;
    if (value == null) return;
    node[id] = value;
  }, [node, id, value]);
}

function Osc({type, freq, id}) {
  useEffect(() => {
    console.log('Osc mount', {type, freq, id});
    return () => {
      console.log('Osc unmount', {id});
    }
  }, []);
  const osc = useOscillator(type, freq);
  usePatch(osc, id);
  useParam(osc, 'frequency', freq);
  useAttr(osc, 'type', type);
  return null;
}

function Gain({gain = 0, id}) {
  const node = useGain(gain);
  usePatch(node, id);
  useParam(node, 'gain', gain);
  return null;
}

function Const({value, id}) {
  const node = useConstant(value);
  usePatch(node, id);
  useParam(node, 'offset', value);
  return null;
}

function Dest({id}) {
  const node = useDestination();
  usePatch(node, id);
  return null;
}

export function Connection({from, to, weight = 1.0}) {
  const [nodeRefs] = usePatchContext();
  
  const [fromRef, toRef] = useMemo(() => {
    const [fromId, fromPort] = from.split('.');
    const [toId, toPort] = to.split('.');
    let fromRef = nodeRefs[fromId];
    let toRef = nodeRefs[toId];
    if (!fromRef || !toRef) return [];
    if (fromPort) {
      fromRef = fromRef[fromPort];
    // } else {
    //   if (!(fromRef instanceof window.AudioNode)) {
    //   }
    }
    while (isPatch(fromRef)) fromRef = fromRef[DEFAULT_OUT];
    if (toPort) {
      toRef = toRef[toPort];
    // } else {
      // if (
      //   !(toRef instanceof window.AudioNode)
      //   && !(toRef instanceof window.AudioParam)
      // ) {
      // }
    }
    while (isPatch(toRef)) toRef = toRef[DEFAULT_IN];
    console.log('CONNECT', {from, to, fromRef, toRef});
    return [fromRef, toRef];
  }, [nodeRefs, from, to]);

  const gain = useGain(weight);

  useEffect(() => {
    if (!fromRef || !toRef || !gain) return;
    console.log('really connecting', from, to, fromRef, toRef, gain);
    fromRef.connect(gain);
    gain.connect(toRef);
    return () => {
      console.log('disconnecting', fromRef, toRef, gain);
      gain.disconnect(toRef);
      fromRef.disconnect(gain);
    }
  }, [gain, fromRef, toRef]);

  useParam(gain, 'gain', weight);
};

const isPatch = (ref) => ref && ref.$isPatch;

export function PatchBay({children, id}) {
  const ppath = usePatchPath();

  const [nodeRefs, dispatch] = useReducer((state, action) => {
    console.log([ppath, '.', id, '.', action.id].join(''), '=', action.ref);
    return {
      ...state,
      [action.id]: action.ref,
    };
  }, {
    $isPatch: true,
  });

  const value = useMemo(() => [
    nodeRefs, dispatch, ppath + '.' + id
  ], [nodeRefs, dispatch, ppath, id]);

  usePatch(nodeRefs, id);

  useEffect(() => {
    console.log('PatchBay', id, children);
  }, []);

  return h(PatchContext.Provider, {value}, children);
}

// export function Patch({nodes, matrix, id}) {
//   const aNodes = Object.entries(nodes).map(([id, node]) => h(
//     Node,
//     {key: id, id, ...node, onRef: (ref) => setRef(id, ref)}
//   ));
//   const aConns = matrix.map(([from, to, weight = 1]) => h(
//     Connection,
//     {from, to, weight}
//   ));
//
//   return h(PatchBay, {id}, [
//     ...aNodes,
//     ...aConns,
//   ]);
// }
//
// export function Synth({nodes, matrix}) {
//   return h(Patch,
//     {
//       nodes: {...portsToNodes(...PORTS.Synth), ...nodes},
//       matrix,
//     }
//   );
// }
//
// export function FX({nodes, matrix}) {
//   return h(Patch,
//     {
//       nodes: {...portsToNodes(...PORTS.FX), ...nodes},
//       matrix,
//     }
//   );
// }
//
// const NODES = {
//   Osc,
//   Gain,
//   Const,
//   Dest,
//   Patch,
//   Synth,
//   FX,
// };
//
// export function Node({type, params, onRef}) {
//   return h(NODES[type], {...params, onRef});
// }
//
const EMPTY_VOICE_CONTEXT = {on: false, note: 0, time: 0};

const VoiceContext = createContext(EMPTY_VOICE_CONTEXT);

export function useVoiceContext() {
  return useContext(VoiceContext);
}

export function Voice({on, time, note, id, children}) {
  const pc = usePatchContext();
  useEffect(() => {
    console.log('VOICE', pc, on, time, note, id);
  }, [on, time, note, id, pc]);
  return h(VoiceContext.Provider,
    {value: {on, time, note}},
    h(PatchBay, {id}, children),
  );
}

export function NoteToDetune({id}) {
  const constant = useConstant(0);
  const {time, note} = useVoiceContext();
  useEffect(() => {
    if (!constant) return;
    const value = (note - 69) * 100;
    console.log('setting value for', id, 'to', value, 'at', time);
    constant.offset.setValueAtTime(value, time);
  }, [constant, time]);
  usePatch(constant, id);
}

export function Gate({id}) {
  const gain = useGain(0);
  const {time, on} = useVoiceContext();
  useEffect(() => {
    if (!gain) return;
    console.log('setting value for', id, 'to', on, 'at', time);
    gain.gain.setValueAtTime(on ? 1 : 0, time);
  }, [gain, time]);
  usePatch(gain, id);
}

export function TestCtx() {
  const ctx = useAudioContext();
  return ctx.toString();
}

let THE_CONTEXT = null;

function getContext() {
  if (!THE_CONTEXT) THE_CONTEXT = new AudioContext();
  return THE_CONTEXT;
}

const key2Note = {
  q: 60,
  2: 61,
  w: 62,
  3: 63,
  e: 64,
  r: 65,
  5: 66,
  t: 67,
  6: 68,
  y: 69,
  7: 71,
  u: 72,
  i: 73,
  9: 74,
  o: 75,
  0: 76,
  p: 77,
  z: 48,
  s: 49,
  x: 50,
  d: 51,
  c: 52,
  v: 53,
  g: 54,
  b: 55,
  h: 56,
  n: 57,
  j: 58,
  m: 59,
};

const KEY_PRIORITY = {
  low: 'low',
  high: 'high',
  last: 'last',
  first: 'first',
};

function voiceNoteOn(time, note, vel = 1) {
  return {type: 'on', time, note, vel};
}

function voiceNoteOff(time, note, vel = 1) {
  return {type: 'off', time, note, vel};
}

export function PolySynth({
  id,
  prio = KEY_PRIORITY.low,
  voiceCount = 1,
  voiceControlRef,
  children,
}) {
  const ctx = useAudioContext();

  const [voiceState, voiceDispatch] = useImmerReducer(
    (state, action) => {
      if (!action) {
        console.error(new Error('no action'));
        return;
      }
      if (action.type === 'setVoiceCount') {
        state.notes = [];
        state.notesPlaying = {};
        state.voices = [];
        for (let idx = 0; idx < action.voiceCount; idx++) {
          state.voices.push({idx, note: 0, on: false, time: 0})
        }
        updateVoices(state, action.time);
        return;
      }

      const {type, note, time} = action;

      function updateVoices(state, time) {
        const {notesPlaying, voices} = state;
        const toPlay = state.notesPressed.slice(0, voices.length);
        const toOff = new Set(Object.keys(notesPlaying).map(n => parseInt(n)));
        const toOn = new Set();
        for (const note of toPlay) {
          if (note in notesPlaying) {
            toOff.delete(note);
            continue;
          }
          toOn.add(note);
        }
        for (const note of toOff) {
          const idx = notesPlaying[note];
          voices[idx].on = false;
          voices[idx].time = time;
          delete notesPlaying[note];
        }
        for (const note of toOn) {
          const v = voices.filter(({on}) => !on).sort(({time: a}, {time: b}) => a - b)[0];
          v.on = true;
          v.note = note;
          notesPlaying[note] = v.idx;
        }
      }

      if (type === 'off') {
        const idx = state.notesPressed.indexOf(note);
        if (idx < 0) return;
        state.notesPressed.splice(idx, 1);
        updateVoices(state, time);
      }
      if (type === 'on') {
        if (state.notesPressed.includes(note)) return;
        if (prio === KEY_PRIORITY.last) {
          state.notesPressed.unshift(note);
        }
        if (prio === KEY_PRIORITY.first) {
          state.notesPressed.push(note);
        }
        if (prio === KEY_PRIORITY.low) {
          state.notesPressed = [...state.notesPressed, note].sort((a, b) => a - b);
        }
        if (prio === KEY_PRIORITY.high) {
          state.notesPressed = [...state.notesPressed, note].sort((a, b) => b - a);
        }
        updateVoices(state, time);
      }
    },
    {
      notesPressed: [],
      notesPlaying: {},
      voices: [
        {idx: 0, note: 0, on: false, time: 0},
      ],
    }
  );

  useEffect(() => {
    voiceDispatch({type: 'setVoiceCount', voiceCount, time: ctx.currentTime});
  }, [ctx, voiceCount])

  const voiceControl = useMemo(() => {
    return {
      dispatch: voiceDispatch,
    }
  }, [voiceDispatch]);
  
  useEffect(() => {
    if (typeof voiceControlRef === 'function') {
      voiceControlRef(voiceControl);
    }
  }, [voiceControlRef, voiceControl]);

  useEffect(() => {
    console.log('voices', JSON.stringify(voiceState.voices));
  }, [voiceState]);

  return h(PatchBay, {id}, [
    h(Gain, {id: DEFAULT_OUT}),
    ...voiceState.voices.map(voice =>
      h(Voice, {...voice, id: `voice${voice.idx}`, children})
    ),
    ...voiceState.voices.map(voice => h(Connection, {from: `voice${voice.idx}`, to: DEFAULT_OUT})),
  ]);
}

export function TestSynth({id}) {
  return h(PatchBay, {id}, [
    h(Gate, {id: DEFAULT_OUT}),
    h(Osc, {id: 'o', type: 'sine', freq: 220}),
    h(Connection, {from: 'o', to: DEFAULT_OUT}),
    h(NoteToDetune, {id: 'detune'}),
    h(Connection, {from: 'detune', to: 'o.detune'}),
  ]);
}

export function Test1() {
  const ctx = getContext();

  const [voice, setVoice] = useState({dispatch: () => {}});

  useEffect(() => {
    const voiceDispatch = voice.dispatch;
    const onKeyDown = (e) => {
      const note = key2Note[e.key];
      if (note) {
        voiceDispatch(voiceNoteOn(ctx.currentTime, note));
      }
    };
    const onKeyUp = (e) => {
      const note = key2Note[e.key];
      if (note) {
        voiceDispatch(voiceNoteOff(ctx.currentTime, note));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    }
  }, [voice])

  return h(Context.Provider, {value: ctx}, [
    h(PatchBay, {id: 'TEST'}, [
      h(PolySynth,
        {
          id: 'poly1',
          prio: KEY_PRIORITY.low,
          voiceCount: 1,
          voiceControlRef: setVoice,
        },
        [
          h(TestSynth, {id: 'syn'}),
          h(Gain, {id: DEFAULT_OUT}),
          h(Connection, {from: 'syn', to: DEFAULT_OUT}),
        ]
      ),
      h(Dest, {id: 'dest'}),
      h(Connection, {from: 'poly1', to: 'dest'}),
    ])
  ]);
}

export function Test0() {
  const ctx = getContext();

  const [voice, setVoice] = useState({on: true, note: 48, time: ctx.currentTime + 0.1});
  useEffect(() => {
    setTimeout(() => {
      setVoice({on: false, note: 60, time: ctx.currentTime + 1.1});
    }, 50);
  }, []);

  return h(Context.Provider, {value: ctx}, [
    h(PatchBay, {id: 'test0'}, [
      h(Dest, {id: 'dest'}),
      h(Voice, {id: 'v0', ...voice}, [
        h(TestSynth, {id: DEFAULT_OUT}),
        // h(Osc, {id: DEFAULT_OUT}),
      ]),
      h(Connection, {from: 'v0', to: 'dest', weight: 0.1}),
    ])
  ]);
}
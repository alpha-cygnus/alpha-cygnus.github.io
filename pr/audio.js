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

const EMPTY_PATCH_CONTEXT = [{}, () => {}];

export function usePatchContext() {
  const ctx = useContext(PatchContext);
  if (!ctx) return EMPTY_PATCH_CONTEXT;
  return ctx;
}

const DEFAULT_OUT = 'outAudio';

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
  const [result, setNode] = useState(ctx && create(ctx));
  useEffect(() => {
    if (!ctx) return;
    const node = result || create(ctx);
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
      const node = result || ctx.createConstantSource();
      node.offset.value = value;
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

export function usePatch(ref, name) {
  const [_, dispatch] = usePatchContext();
  useEffect(() => {
    console.log('dispatching', name, ref);
    dispatch({name, ref});
  }, [dispatch, name, ref]);
}

export function useParam(node, name, value) {
  useEffect(() => {
    if (!node) return;
    if (value == null) return;
    node[name].value = value;
  }, [node, name, value]);
}

export function useAttr(node, name, value) {
  useEffect(() => {
    if (!node) return;
    if (value == null) return;
    node[name] = value;
  }, [node, name, value]);
}

function Osc({type, freq, name}) {
  const osc = useOscillator(type, freq);
  usePatch(osc, name);
  useParam(osc, 'frequency', freq);
  useAttr(osc, 'type', type);
  return null;
}

function Gain({gain = 0, name}) {
  const node = useGain(gain);
  usePatch(node, name);
  useParam(node, 'gain', gain);
  return null;
}

function Const({value, name}) {
  const node = useConstant(value);
  usePatch(node, name);
  useParam(node, 'offset', value);
  return null;
}

function Dest({name}) {
  const node = useDestination();
  usePatch(node, name);
  return null;
}

export function Connection({from, to, weight = 1.0}) {
  const [nodeRefs] = usePatchContext();
  
  const [fromRef, toRef] = useMemo(() => {
    const [fromName, fromPort] = from.split('.');
    const [toName, toPort] = to.split('.');
    let fromRef = nodeRefs[fromName];
    let toRef = nodeRefs[toName];
    console.log({from, to, fromRef, toRef, nodeRefs});
    if (!fromRef || !toRef) return [];
    if (fromPort) {
      fromRef = fromRef[fromPort];
    } else {
      if (!(fromRef instanceof window.AudioNode)) fromRef = fromRef[DEFAULT_OUT];
    }
    if (toPort) {
      toRef = toRef[toPort];
    } else {
      if (
        !(toRef instanceof window.AudioNode)
        && !(toRef instanceof window.AudioParam)
      ) {
        toRef = toRef.outAudio;
      }
    }
    return [fromRef, toRef];
  }, [nodeRefs, from, to]);

  const gain = useGain(weight);

  useEffect(() => {
    if (!fromRef || !toRef || !gain) return;
    console.log('really connecting', fromRef, toRef, gain);
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

export function PatchBay({children, name}) {
  const store = useReducer((state, action) => {
    return {
      ...state,
      [action.name]: action.ref,
    };
  }, {});
  const [nodeRefs] = store;

  usePatch(nodeRefs, name);

  return h(PatchContext.Provider, {value: store}, children);
}

export function Patch({nodes, matrix, name}) {
  const aNodes = Object.entries(nodes).map(([name, node]) => h(
    Node,
    {key: name, name, ...node, onRef: (ref) => setRef(name, ref)}
  ));
  const aConns = matrix.map(([from, to, weight = 1]) => h(
    Connection,
    {from, to, weight}
  ));

  return h(PatchBay, {name}, [
    ...aNodes,
    ...aConns,
  ]);
}

export function Synth({nodes, matrix}){
  return h(Patch,
    {
      nodes: {...portsToNodes(...PORTS.Synth), ...nodes},
      matrix,
    }
  );
}

export function FX({nodes, matrix}) {
  return h(Patch,
    {
      nodes: {...portsToNodes(...PORTS.FX), ...nodes},
      matrix,
    }
  );
}

const NODES = {
  Osc,
  Gain,
  Const,
  Dest,
  Patch,
  Synth,
  FX,
};

export function Node({type, params, onRef}) {
  return h(NODES[type], {...params, onRef});
}

const EMPTY_VOICE_CONTEXT = {on: false, note: 0, time: 0};

const VoiceContext = createContext(EMPTY_VOICE_CONTEXT);

export function useVoiceContext() {
  return useContext(VoiceContext);
}

export function Voice({on, time, note, name, children}) {
  return h(VoiceContext.Provider,
    {value: {on, time, note}},
    h(PatchBay, {name}, children),
  );
}

export function NoteToDetune({name}) {
  const constant = useConstant(1);
  const {time, note} = useVoiceContext();
  useEffect(() => {
    if (!constant) return;
    constant.offset.setValueAtTime((note - 69) * 100, time);
  }, [constant, time]);
  usePatch(constant, name);
}

export function Gate({name}) {
  const constant = useConstant(0);
  const {time, on} = useVoiceContext();
  useEffect(() => {
    if (!constant) return;
    constant.offset.setValueAtTime(on ? 1 : 0, time);
  }, [constant, time]);
  usePatch(constant, name);
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
  name,
  prio = KEY_PRIORITY.low,
  voiceCount = 1,
  dispatchVoiceRef,
  children,
}) {
  const ctx = useAudioContext();

  const [voiceState, dispatchVoice] = useImmerReducer(
    (state, action) => {
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
        console.log('toOff', toOff, toPlay);
        for (const note of toPlay) {
          if (note in notesPlaying) {
            toOff.delete(note);
            continue;
          }
          toOn.add(note);
        }
        console.log('toOff', toOff);
        console.log(JSON.stringify({toPlay, toOn: [...toOn], toOff: [...toOff]}));
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
    dispatchVoice({type: 'setVoiceCount', voiceCount, time: ctx.currentTime});
  }, [ctx, voiceCount])
  
  useEffect(() => {
    if (typeof dispatchVoiceRef === 'function') dispatchVoiceRef(dispatchVoice);
  }, [dispatchVoiceRef, dispatchVoice])

  useEffect(() => {
    console.log('voices', JSON.stringify(voices));
  }, [voices]);

  return h(PatchBay, {name}, [
    h(Gain, DEFAULT_OUT),
    ...voiceState.voices.map(voice =>
      h(Voice, {...voice, name: `voice${voice.idx}`, children})
    ),
    ...voiceState.voices.map(voice => h(Connection, {from: `voice${voice.idx}`, to: DEFAULT_OUT})),
  ]);
}

export function TestSynth({name}) {
  h(PatchBay, {name}, [
    h(Gain, {name: DEFAULT_OUT}),
    h(Osc, {name: 'o1', type: 'sine', freq: 220}),
    h(Gain, {name: 'g1', gain: 0}),
    h(Connection, {from: 'o1', to: 'g1'}),
    h(Connection, {from: 'g1', to: DEFAULT_OUT, weight: 0.1}),
    h(NoteToDetune, {name: 'detune'}),
    h(Gate, {name: 'gate'}),
    h(Connection, {from: 'gate', to: 'g1.gain'}),
    h(Connection, {from: 'detune', to: 'o1.detune'}),
  ])
}

export function Test0() {
  const ctx = getContext();

  const [dispatchVoice, setDispatchVoice] = useState(() => {});

  useEffect(() => {
    const onKeyDown = (e) => {
      const note = key2Note[e.key];
      if (note) {
        dispatchVoice(voiceNoteOn(ctx.currentTime, note));
      }
    };
    const onKeyUp = (e) => {
      const note = key2Note[e.key];
      if (note) {
        dispatchVoice(voiceNoteOff(ctx.currentTime, note));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    }
  }, [dispatchVoice])

  return h(Context.Provider, {value: ctx}, [
    h(PolySynth,
      {
        name: 'poly1',
        prio: KEY_PRIORITY.low,
        voiceCount: 1,
        dispatchVoiceRef: setDispatchVoice,
      },
      TestSynth,
    ),
  ]);
}

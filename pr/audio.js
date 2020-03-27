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
  Fragment,
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
      if (!(fromRef instanceof window.AudioNode)) fromRef = fromRef.outAudio;
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

export function TestCtx() {
  const ctx = useAudioContext();
  return ctx.toString();
}

let THE_CONTEXT = null;

function getContext() {
  if (!THE_CONTEXT) THE_CONTEXT = new AudioContext();
  return THE_CONTEXT;
}

const key2Key = {
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
};

export function Test0() {
  const [keys, dispatchKey] = useReducer((state, action) => {
    if (action.down) {
      if (state.includes(action.down)) return state;
      return [...state, action.down];
    }
    if (action.up) {
      return state.filter((key) => key !== action.up);
    }
    return state;
  }, []);
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = key2Key[e.key];
      if (key) {
        dispatchKey({down: key});
      }
    };
    const onKeyUp = (e) => {
      const key = key2Key[e.key];
      if (key) {
        dispatchKey({up: key});
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    }
  }, [])
  useEffect(() => {
    console.log(keys);
  }, [keys]);
  return h(Context.Provider, {value: getContext()}, [
    h(PatchBay, {name: 'test0'}, [
      h(Dest, {name: 'dest'}),
      h(Osc, {name: 'o1', type: 'sine', freq: 220}),
      h(Gain, {name: 'g1', gain: 0}),
      h(Connection, {from: 'o1', to: 'g1'}),
      h(Connection, {from: 'g1', to: 'dest', weight: 0.1}),
    ])
  ]);
}

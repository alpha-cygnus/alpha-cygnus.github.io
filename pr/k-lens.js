import {createContext, h, useContext, useReducer, useEffect, useCallback} from './common.js';

export const KLens = (get, set, name) => {
  if (!name) throw new Error('no name?');
  return {
    get, set, name,
  }
};

export const prop = (pn, def) => KLens(s => s[pn] ?? def, (s, v) => {
  if (s[pn] === v) return s;
  return {...s, [pn]: v};
}, `.${pn}`);

export const idx = (idx, def) => KLens(s => s[idx] ?? def, (s, v) => {
  if (s[idx] === v) return s;
  if (s.length <= idx) s = s.concat([...Array(idx - s.length + 1)]);
  return s.map((e, i) => i === idx ? v : e)
}, `[${idx}]`);

export const find = (f) => KLens(s => s.find(f), (s, v) => {
  const idx = s.findIndex(f);
  if (idx < 0 || s[idx] === v) return s;
  return s.map((e, i) => i === idx ? v : e)
}, 'find');

export const tuple = (...ls) => {
  const nls = ls.map(norm);
  return KLens(
    s => nls.map(l => l.get(s)),
    (s, v) => nls.reduce((s, l, i) => l.set(s, v[i]), s),
    '[' + nls.map(({name}) => name).join(',') + ']',
  );
};

export const id = KLens(s => s, (s, v) => v, '$');

export function comp2(l1, l2) {
  const {get: g1, set: s1, name: n1} = l1;
  const {get: g2, set: s2, name: n2} = l2;
  return KLens(
    s => g2(g1(s)),
    (s, v) => {
      return s1(s, s2(g1(s), v));
    },
    `${n1}|${n2}`
  );
}

export function norm(li) {
  let l = li;
  if (typeof li === 'string') l = prop(li);
  if (typeof li === 'number') l = idx(li);
  if (Array.isArray(li)) l = compose(...li);
  return l;
}

export function compose(...ls) {
  let result = id;
  for (const l of ls.map(norm)) {
    if (result === id) result = l;
    else result = comp2(result, l);
  }
  return result;
}

export const KLensContext = createContext(null);

export function KLensProvider({init, children}) {
  const [state, dispatch] = useReducer((state, action) => {
    if (action.setter) {
      const newState = action.setter(state);
      // console.log('prev', state);
      // console.log('by', action.name, action.v);
      // console.log('next', newState);
      return newState;
    }
  }, init);
  return h(KLensContext.Provider, {value: [state, dispatch]}, children);
}

export function useKLens(...ls) {
  const {get, set, name} = compose(...ls);
  const [state, dispatch] = useContext(KLensContext);
  const setter = useCallback((v) => {
    dispatch({setter: (state) => set(state, v), name, v})
  }, [dispatch, set]);
  return [get(state), setter];
}

window.KL = {
  compose,
  prop,
  idx,
};

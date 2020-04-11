import {useImmer, createContext, h, useContext} from './common.js';

export const iLens = (get, upd) => {
  return {
    get, upd,
  }
};

export const prop = (pn) => iLens(s => s[pn], v => s => s[pn] = v);
export const idx = (i) => iLens(s => s[i], v => s => s[i] = v);
export const find = (f) => iLens(s => s.find(f), v => s => {
  const idx = s.findIndex(f);
  if (idx >= 0) s[idx] = v;
});

export const id = () => iLens(s => s, v => s => {});

export function comp2(l1, l2) {
  const {get: g1} = l1;
  const {upd: u2, get: g2} = l2;
  return iLens(
    s => g2(g1(s)),
    v => s => {
      return u2(v)(g1(s));
    },
  );
}

export const compose = (...ls) => {
  let result = id();
  for (const li of ls.flat(3)) {
    let l = li;
    if (typeof li === 'string') l = prop(li);
    if (typeof li === 'number') l = idx(li);
    result = comp2(result, l);
  }
  return result;
};

export const ILensContext = createContext(null);

export function ILensProvider({init, children}) {
  const ctx = useImmer(init);
  return h(ILensContext.Provider, {value: ctx}, children);
}

export function useLens(...ls) {
  const {get, upd} = compose(...ls);
  const ctx = useContext(ILensContext);
  const [state, update] = ctx;
  return [get(state), v => update(s => { upd(v)(s); })];
}

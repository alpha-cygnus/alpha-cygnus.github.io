import {
// const {
  h,
  render,
  Fragment,
  createContext,
// } from 'https://unpkg.com/preact@latest?module';
// } from './lib/preact.js';
// import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useReducer, 
  useContext,
// } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
} from './lib/preact-mod.js';
// } = window.PREACT;
//import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

import htm from './lib/htm.js';
// const R = window.R;
const {produce} = window.IMMER;
// import {produce} from './lib/immer-mod.js';
// window.PRO = produce;

const html = htm.bind(h);

export function useImmerReducer(reducer, initialState, initialAction) {
  const cachedReducer = useCallback(produce(reducer), [reducer]);
  return useReducer(cachedReducer, initialState, initialAction);
}

export function useImmer(initialValue) {
  const [val, updateValue] = useState(initialValue);
  return [
    val,
    useCallback(updater => {
      updateValue(produce(updater));
    }, [])
  ];
}

export {
  html,
  h,
  render,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useReducer, 
  useContext,
  Fragment,
  createContext,
  produce,
};

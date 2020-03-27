import {
  h,
  render,
  Fragment,
  createContext,
} from 'https://unpkg.com/preact@latest?module';
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useReducer, 
  useContext,
} from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";


const html = htm.bind(h);

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
};

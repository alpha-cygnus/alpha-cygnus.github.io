import {Module} from './module.js';

export function updateModuleState({fullState}, updater) {
  const [_t, props, ...modules] = fullState;
  const {currentModule} = props;
  return {fullState: [_t, props, ...modules.map(module => module[1].id === currentModule ? updater(module) : module)]};
}

export function getModuleProps({fullState}) {
  const [_t, {currentModule}, ...modules] = fullState;
  const module = modules.find(([_, {id}]) => id === currentModule);
  return module && module[1] || {};
}

export function updateModuleElems(fullState, updater) {
  return updateModuleState(fullState, ([_t, props, ...elems]) => [_t, props, ...updater(elems)]);
}

export function updateModuleProps(fullState, updater) {
  return updateModuleState(fullState, ([_t, props, ...elems]) => [_t, {...props, ...updater(props)}, ...elems]);
}

export function updateElem(fullState, updater, id) {
  return updateModuleElems(fullState, elems => elems.map(elem => elem[1].id === id ? updater(elem) : elem));
}

export class FullState {
  constructor(state) {
    const {fullState} = state;
    const [_, props, ...modules] = fullState;
    const {currentModule} = props;
    const allModules = modules.map(([_t, props, ...elems]) => new Module(props, elems)).reduce((am, m) => ({...am, [m.id]: m}), {});
    this.currentModule = allModules[currentModule];
    this.allModules = allModules;
    this.props = props;
  }
}
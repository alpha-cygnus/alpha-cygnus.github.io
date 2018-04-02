import * as MODULE_CLASSES from './module.js';

export class Synth {
  constructor(state) {
    const [_, props, ...modules] = state;
    const {currentModule} = props;
    const allModules = {};
    this.allModules = allModules;
    for (const [_t, props, ...elems] of modules) {
      const m = new MODULE_CLASSES[_t](this, props, elems);
      allModules[m.id] = m;
    }
    for (const m of Object.values(allModules)) {
      m.initProps();
    }
    this.currentModule = allModules[currentModule];
    this.props = props;
  }
}
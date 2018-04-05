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
    this.id = props.id;
  }
  *gen() {
    //yield `_ctx.synths.${this.id} = function ${this.id}(_ctx) {`;
    yield `  const _modules = {};`;
    for (const m of Object.values(this.allModules)) {
      yield * [...m.gen()].map(s => '  ' + s);
    }
    yield `  const main = _modules.main({..._ctx, modules: _modules});`
    yield `  return {`;
    yield `    _modules,`;
    yield `    ...main,`;
    yield `  };`;
    //yield `}`;
  }
}
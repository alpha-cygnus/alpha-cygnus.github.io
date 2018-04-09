import * as PATCH_CLASSES from './patches.js';

export class Project {
  constructor(state) {
    const [_, props, ...patches] = state;
    const {currentPatch} = props;
    const allPatches = {};
    this.allPatches = allPatches;
    for (const [_t, props, ...elems] of patches) {
      const m = new PATCH_CLASSES[_t](this, props, elems);
      allPatches[m.id] = m;
    }
    for (const m of Object.values(allPatches)) {
      m.initProps();
    }
    this.currentPatch = allPatches[currentPatch];
    this.props = props;
    this.id = props.id;
  }
  // *gen() {
  //   yield `  const _patches = {};`;
  //   for (const p of Object.values(this.allPatches)) {
  //     const [head, ...tail] = [...p.gen()];
  //     yield = 
  //     yield * tail.map(s => '  ' + s);
  //   }
  //   yield `  const main = _patches.main({..._ctx, patches: _patches});`
  //   yield `  return {`;
  //   yield `    _patches,`;
  //   yield `    ...main,`;
  //   yield `  };`;
  // }
}
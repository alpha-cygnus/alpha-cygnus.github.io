import * as PATCH_CLASSES from './patches.js';
import * as SONG_CLASSES from './songs.js';

import {makeSubObjects, hashList} from './utils.js';

export class Project {
  constructor(state) {
    const [_, props, ...partList] = state;
    const parts = partList.reduce((res, [tag, _, ...elems]) => ({...res, [tag]: elems}), {});
    const {patches = [], songs = []} = parts;
    const {currentPatch} = props;
    // const allPatches = {};
    // this.allPatches = allPatches;
    // for (const [_t, props, ...elems] of patches) {
    //   const m = new PATCH_CLASSES[_t](this, props, elems);
    //   allPatches[m.id] = m;
    // }
    const allPatches = this.allPatches = hashList(makeSubObjects(PATCH_CLASSES, this, patches));
    for (const m of Object.values(this.allPatches)) {
      m.initProps();
    }
    this.currentPatch = allPatches[currentPatch];
    this.props = props;
    this.id = props.id;
    this.main = allPatches.main;

    this.songs = makeSubObjects(SONG_CLASSES, this, songs);
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
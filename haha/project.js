import * as PATCH_CLASSES from './patches.js';
import * as SONG_CLASSES from './songs.js';

import {makeSubObjects, hashList} from './utils.js';

export class Project {
  constructor([_, props, ...partList]) {
    const parts = partList.reduce((res, [tag, props, ...elems]) => ({...res, [tag]: elems, [tag + 'Props']: props}), {});
    const {patches = [], patchesProps: {currentPatch}, songs = []} = parts;
    this.state = props;
    this.patches = makeSubObjects(PATCH_CLASSES, this, patches);
    const allPatches = this.allPatches = hashList(this.patches);
    for (const m of Object.values(this.allPatches)) {
      m.initProps();
    }
    this.currentPatch = allPatches[currentPatch];
    this.props = props;
    this.id = props.id;
    this.main = allPatches.main;

    this.songs = makeSubObjects(SONG_CLASSES, this, songs);
  }
  renderEditor(h, {loadProject}) {
    return h('div', {},
      h('button', {
        onclick: e => loadProject(document.getElementById('theProjectXL').value),
      }, '<-- load this'),
    )
  }
}
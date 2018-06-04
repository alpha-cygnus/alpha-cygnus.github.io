import {makeSubObjects, hashList, times} from './utils.js';

import {SongPart} from './base.js';
import {Pattern} from './patterns.js';

class Instrument extends SongPart {
  getParentList() {
    return 'instruments';
  }
}

class Channel extends SongPart {
  getParentList() {
    return 'channels';
  }
}

const SONG_PARTS = {Instrument, Channel, Pattern};

export class Song {
  constructor(parent, props, elems) {
    this.parent = parent;
    this.props = props;
    this.instruments = [];
    this.patterns = [];
    this.channels = [];
    makeSubObjects(SONG_PARTS, this, elems);
  }
  getPattern(x) {
    return this.patterns[x] || new Pattern(this, {x});
  }
}

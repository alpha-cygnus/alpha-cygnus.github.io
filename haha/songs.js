import {makeSubObjects, hashList, times} from './utils.js';

class SongPart {
  constructor (parent, props) {
    this.props = props;
    const pl = this.getParentList();
    if (pl && Array.isArray(parent[pl])) parent[pl][props.x] = this;
    Object.assign(this, props);
    this.parent = parent;
  }
  getParentList() {
    return '';
  }
}

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

class PtnPart extends SongPart {
}

const notes = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
const fixString = (s, w, pad) => (s || '').toString().slice(-w).padStart(w, pad);
const numString = (n, w = 2, rx = 10) => typeof n === 'number' ? fixString(n.toString(rx).toUpperCase(), w, '0') : ''.padStart(w, '.');
const noteString = n => n > 0 ? notes[n % 12] + numString(Math.floor(n/12), 1): n < 0 ? '===' : '...';

class Cell extends PtnPart {
  getParentList() {
    return 'cells';
  }
  render(h, actions) {
    const {n, i, v, c, d} = this;
    return h('span', {class: 'cell'}, `${noteString(n)} ${numString(i, 2)} ${numString(v, 2, 16)} ${fixString(c, 1, '.')}${numString(d, 2, 16)}`);
  }
}

class Row extends PtnPart {
  constructor (parent, props, elems) {
    super(parent, props);
    this.cells = [];
    makeSubObjects({c: Cell}, this, elems);
  }
  getParentList() {
    return 'rows';
  }
  getCell(x) {
    return this.cells[x] || new Cell(this, {x});
  }
  render(h, actions) {
    const song = this.parent.parent;
    return h('tr', {},
      h('td', {class: 'rowNum'}, numString(this.x, 2, 16)),
      times(song.channels.length).map(ci => h('td', {class: 'cell'}, this.getCell(ci).render(h, actions)))
    );
  }
}

class Pattern extends SongPart {
  constructor (parent, props, elems) {
    super(parent, props);
    this.rows = [];
    makeSubObjects({r: Row}, this, elems);
  }
  getRow(x) {
    return this.rows[x] || new Row(this, {x}, []);
  }
  getParentList() {
    return 'patterns';
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
}
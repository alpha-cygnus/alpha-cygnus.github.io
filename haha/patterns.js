import {SongPart} from './base.js';
import {makeSubObjects, hashList, times, selectionFromString} from './utils.js';

class PtnPart extends SongPart {
}

const cNotes = 'cCdDefFgGaAb=';
const sNotes = ['..', 'C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-', '=='];
const fixString = (s, w, pad) => (s || '').toString().slice(-w).padStart(w, pad);
const numString = (n, rx = 10, w = 1) => typeof n === 'number' ? fixString(n.toString(rx).toUpperCase(), w, '0') : ''.padStart(w, '.');
const cHexes = '0123456789ABCDEF';
const cDecs = '01234567890';
// const noteString = n => n > 0 ? notes[n % 12] + numString(Math.floor(n/12), 1): n < 0 ? '===' : '...';

class SubCell extends PtnPart {
  constructor(parent, props) {
    super(parent, props);
  }
  getParentList() {
    return 'subs';
  }
  toString() {
    return this._toString ? this._toString(this.v) : this.v;
  }
  getPattern() {
    return this.parent.getPattern();
  }
  isSelected() {
    const {x} = this;
    if (!this.parent.isSelected()) return false;
    const [[r0, c0, s0], [r1, c1, s1]] = this.getPattern().selection;
    if (c0 === c1) return this.x >= s0 && this.x <= s1;
    if (this.parent.x === c0) return this.x >= s0;
    if (this.parent.x === c1) return this.x <= s1;
    return true;
  }
  hasPreSpace() {
    return !!this._hasPreSpace;
  }
  render(h, {setPatternSelection}) {
    return h('span',
      {
        onclick: e => setPatternSelection([this.parent.parent.x, this.parent.x, this.x]),
      },
      this.hasPreSpace() ? ' ' : [],
      h('span', {class: this.isSelected() ? ' selected' : ''}, this.toString()),
    );
  }
}

const msc = (_toString, _hasPreSpace) => (parent, x, v) => {
  return new SubCell(parent, {x, v, _toString, _hasPreSpace});
}

const aDigit = o => fixString(o, 1, '.');

const SubCells = [
  msc(n => sNotes[cNotes.indexOf(n) + 1]),
  msc(aDigit),
  msc(aDigit, true),
  msc(aDigit),
  msc(aDigit, true),
  msc(aDigit),
  msc(aDigit, true),
  msc(aDigit),
  msc(aDigit),
];

class Cell extends PtnPart {
  constructor(parent, props) {
    super(parent, props);
    const vs = [...(props.d || '').toString()];
    this.subs = [];
    for (let x = 0; x < SubCells.length; x++) {
      SubCells[x](this, x, vs[x] || '.');
    }
  }
  getParentList() {
    return 'cells';
  }
  getPattern() {
    return this.parent.getPattern();
  }
  isSelected() {
    const {x} = this;
    if (!this.parent.isSelected()) return false;
    const [[r0, c0], [r1, c1]] = this.getPattern().selection;
    return this.x >= c0 && this.x <= c1;
  }
  render(h, actions) {
    const selected = this.isSelected();
    return h('td', {class: 'cell' + (selected ? ' selected' : '')},
      this.subs.map(sc => sc.render(h, actions))
    );
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
  getPattern() {
    return this.parent;
  }
  isSelected() {
    const {x} = this;
    const [[r0], [r1]] = this.getPattern().selection;
    return this.x >= r0 && this.x <= r1;
  }
  render(h, actions) {
    const song = this.parent.parent;
    return h('tr', {class: this.isSelected() ? ' selected' : ''},
      h('td', {class: 'rowNum'}, numString(this.x, 16, 2)),
      times(song.channels.length).map(ci => this.getCell(ci).render(h, actions))
    );
  }
}

export class Pattern extends SongPart {
  constructor (parent, props, elems) {
    super(parent, props);
    this.rows = [];
    this.selection = selectionFromString(props.$selection);
    makeSubObjects({r: Row}, this, elems);
  }
  getRow(x) {
    return this.rows[x] || new Row(this, {x}, []);
  }
  getParentList() {
    return 'patterns';
  }
  render(h, actions) {
    return h('table', {class: 'pattern'},
      times(this.length).map(ri => this.getRow(ri).render(h, actions)),
    );
  }
}

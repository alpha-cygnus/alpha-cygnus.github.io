import {SongPart} from './base.js';
import {makeSubObjects, hashList, times, selectionFromString} from './utils.js';

class PtnPart extends SongPart {
}

const notes = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
const fixString = (s, w, pad) => (s || '').toString().slice(-w).padStart(w, pad);
const numString = (n, w = 2, rx = 10) => typeof n === 'number' ? fixString(n.toString(rx).toUpperCase(), w, '0') : ''.padStart(w, '.');
const noteString = n => n > 0 ? notes[n % 12] + numString(Math.floor(n/12), 1): n < 0 ? '===' : '...';

class SubCell {
  constructor(parent, value, x) {
    this.parent = parent;
    this.value = value;
    this.x = x;
  }
  toString() {
    return '';
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
    return true;
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

class EmptySubCell extends SubCell {
  toString() {
    return ' ';
  }
  render() {
    return ' ';
  }
}

class NSubCell extends SubCell {
  toString() {
    return noteString(this.value);
  }
  hasPreSpace() {
    return false;
  }
}

class ISubCell extends SubCell {
  toString() {
    return numString(this.value, 2);
  }
}

class VSubCell extends SubCell {
  toString() {
    return numString(this.value, 2, 16);
  }
}

class CSubCell extends SubCell {
  toString() {
    return fixString(this.value, 1, '.');
  }
}

class DSubCell extends SubCell {
  hasPreSpace() {
    return false;
  }
  toString() {
    return numString(this.value, 2, 16);
  }
}

const ESC = new EmptySubCell();

class Cell extends PtnPart {
  constructor(parent, props) {
    super(parent, props);
    const {n, i, v, c, d} = props;
    const cs = [NSubCell, ISubCell, VSubCell, CSubCell, DSubCell];
    const vs = [n, i, v, c, d];
    const [nsc, isc, vsc, csc, dsc] = vs.map((v, x) => new cs[x](this, v, x));
    Object.assign(this, {n: nsc, i: isc, v: vsc, c: csc, d: dsc});
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
    const {n, i, v, c, d} = this;
    // const e = ESC;
    const selected = this.isSelected();
    return h('td', {class: 'cell' + (selected ? ' selected' : '')},
      [n, i, v, c, d].map(sc => sc.render(h, actions))
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
      h('td', {class: 'rowNum'}, numString(this.x, 2, 16)),
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

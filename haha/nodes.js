import { Elem, Node } from './base.js';
import { Port } from './ports.js';
import { startDragOnMouseDown } from './utils.js';

export class TopState extends Elem {
  constructor(data) {
    super(data);
    Object.assign(this, this.state);
  }
  onDelete() {}
  renderEditor(h, {setTopState}) {
    const {scale} = this;
    return h('div', {},
      h('h2', {}, this.title),
      h('pre', {}, JSON.stringify(this.state, null, '  ')),
      h('button', {
        onclick: e => setTopState({scale: scale * 2})
      }, '+'),
      h('button', {
        onclick: e => setTopState({scale: scale / 2})
      }, '-'),
    );
  }
}

export class FakeNode extends Node {
  constructor (data) {
    super(data);
    this.portOver = 0;
    this.addPort({x: 0, y: -2, fill: 'none'});
  }
  isDragging() {
    return true;
  }
  getLayer() {
    return 3;
  }
  getPort() {
    return this.ports[0];
  }
}

export class Circle extends Node {
  constructor(data) {
    super(data);
    const {r, fill} = this.state;
    Object.assign(this, {r, fill});
    this.addPort({x: -r, y: 0, dir: 'i'});
    this.addPort({x: 0, y: -r, dir: 'i'});
    this.addPort({x: +r, y: 0, dir: 'o'});
    this.addPort({x: 0, y: +r, dir: 'o'});
  }
  renderSVG(h, actions) {
    const {id, x, y, r, fill, dragging} = this;
    return h('g', {}, 
      h('circle', {id: id, cx: x, cy: y, r, fill, stroke: dragging ? 'black' : '#444', 'stroke-width': this.isSelected() ? 5 : dragging ? 2 : 1,
        onmousedown: this.dragMouseDown(actions),
        onclick: e => console.log(e), //this.mainClick(actions),
      }),
      h('text', {'text-anchor': 'middle', x, y, dy: 0, textLength: 2*r, 'dominant-baseline': 'middle'}, '. ' + id + ' .'),
      this.renderPorts(h, actions),
    );
  }
}

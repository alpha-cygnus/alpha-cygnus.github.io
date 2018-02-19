import { Elem, Node } from './base.js';
import { Port, PORT_DIR_IN, PORT_DIR_OUT } from './ports.js';
import { startDragOnMouseDown } from './utils.js';

export class TopState extends Elem {
  constructor(data) {
    super(data);
    Object.assign(this, this.state);
  }
  onDelete() {}
  renderEditor(h, {setModuleState}) {
    const {scale} = this;
    return h('div', {},
      h('h2', {}, this.title),
      h('pre', {}, JSON.stringify(this.state, null, '  ')),
      h('button', {
        onclick: e => setModuleState({scale: scale * 2})
      }, '+'),
      h('button', {
        onclick: e => setModuleState({scale: scale / 2})
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
  is$Dragging() {
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
    const {id, x, y, r, fill, $dragging} = this;
    return h('g', {id}, 
      h('circle', {cx: x, cy: y, r, fill, stroke: $dragging ? 'black' : '#444', 'stroke-width': this.isSelected() ? 5 : $dragging ? 2 : 1,
        onmousedown: this.dragMouseDown(actions),
      }),
      h('text', {'text-anchor': 'middle', x, y, dy: 0, textLength: 2*r, 'dominant-baseline': 'middle'}, '. ' + id + ' .'),
      this.renderPorts(h, actions),
    );
  }
}

export class ANode extends Node {
  constructor(data) {
    super(data);
    const {fill = 'white', size = 30} = this.state;
    Object.assign(this, {size, fill});
    this.getPorts().map(([name, dir, x, y, {dx, dy, ...opts} = {}]) => this.addPort({
      name, dir, x: x*size, y: y*size, dx: dx && dx*size, dy: dy && dy*size, ...opts
    }));
  }
  getMainStroke() {
    const {$dragging, size} = this;
    return {
      stroke: $dragging ? 'black' : '#444',
      'stroke-width': this.isSelected() ? 5 : $dragging ? 2 : 1,
      'stroke-linejoin': 'round',
    };
  }
  getShapePath() {
    return [];
  }
  getInnerShapePath() {
    return [];
  }
  getTextPos() {
    return [0, 0];
  }
  getText() {
    return this.id;
  }
  renderSVG(h, actions) {
    const {id, x, y, size, fill} = this;
    const [tx, ty] = this.getTextPos().map(x => x*size);
    return h('g', {id}, 
      h('path', {
        transform: `translate(${x}, ${y})`,
        d: `M0 0 ${this.getShapePath().map(x => typeof x === 'number' ? x*size : x).join(' ')}`, fill,
        ...this.getMainStroke(),
        onmousedown: this.dragMouseDown(actions),
      }),
      h('path', {
        transform: `translate(${x}, ${y})`,
        d: `M0 0 ${this.getInnerShapePath().map(x => typeof x === 'number' ? x*size : x).join(' ')}`, fill: 'none',
        stroke: 'grey',
        onmousedown: this.dragMouseDown(actions),
      }),
      h('text',
        {
          transform: `translate(${x + tx}, ${y + ty}) scale(0.6, 1)`,
          'text-anchor': 'middle', x: 0, y: 0, dy: 0, 'dominant-baseline': 'middle'
        },
        this.getText(),
      ),
      this.renderInnerSVG(h),
      this.renderPorts(h, actions),
    );
  }
  renderInnerSVG() {
    return [];
  }
}

export class Gain extends ANode {
  getPorts() {
    return [
      ['inp',  PORT_DIR_IN, -1, -0],
      ['gain', PORT_DIR_IN, 0, -1/2],
      ['out',  PORT_DIR_OUT, +1, 0],
    ];
  }
  getTextPos() {
    return [-1/3, 0];
  }
  getShapePath() {
    return ['m', 1, 0, 'l', -2, 1, 'l', 0, -2, 'z'];
  }
}

export class Oscillator extends ANode {
  constructor(data) {
    super(data);
    const {type = 'sine'} = this.state;
    this.type = type;
  }
  getPorts() {
    return [
      ['freq',   PORT_DIR_IN, 0, -1, {}],
      ['detune', PORT_DIR_IN, 0, +1, {}],
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getShapePath() {
    return ['m', -1, 0,
      'a', 1, 1, '0', '0', '0', 2, 0,
      'a', 1, 1, '0', '0', '0', -2, 0,
    ];
  }
  getInnerShapePath() {
    const typeShape = {
      sine: [
        'M', -0.75, 0,
        'C', -0.7, -0.75, -0.05, -0.75, 0, 0, 
        'S', 0.7, 0.75, 0.75, 0, 
      ],
      triangle: [
        'M', -0.75, 0,
        'L', -0.375, -0.5,
        'L', 0.375, 0.5,
        'L', 0.75, 0, 
      ],
      square: [
        'M', -0.75, 0,
        'L', -0.75, -0.375,
        'L', 0, -0.375,
        'L', 0, +0.375, 
        'L', 0.75, 0.375,
        'L', 0.75, 0,
      ],
    }
    return typeShape[this.type] || [];
  }
}

export class Constant extends ANode {
  constructor(data) {
    super(data);
    const {value = 1} = this.state;
    this.value = value;
  }
  getPorts() {
    return [
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getShapePath() {
    return ['m', -1, 0,
      'a', 1, 1, '0', '0', '0', 2, 0,
      'a', 1, 1, '0', '0', '0', -2, 0,
    ];
  }
  getTextPos() {
    return [0, -0.3];
  }
  renderInnerSVG(h) {
    const {x, y, size} = this;
    const [tx, ty] = [0, 0.3*size];
    return [
      h('text',
        {
          transform: `translate(${x + tx}, ${y + ty}) scale(1.2)`,
          'text-anchor': 'middle', x: 0, y: 0, 'dominant-baseline': 'middle'
        },
        this.value,
      ),
    ];
  }
}
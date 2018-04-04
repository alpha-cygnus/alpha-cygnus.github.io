import { Elem, Node, Link } from './base.js';
import { Port, PORT_DIR_IN, PORT_DIR_OUT, AudioPort, ModulePort } from './ports.js';
import { startDragOnMouseDown } from './utils.js';

export class ANode extends Node {
  initProps() {
    super.initProps();
    const {fill = 'white', size = 30} = this.state;
    Object.assign(this, {size, fill});
    this.getPorts().map(([name, dir, x, y, {nx, ny, ...opts} = {}]) => this.addPort({
      name, dir, x: x*size, y: y*size, nx: nx && nx*size, ny: ny && ny*size, ...opts
    }));
  }
  getPortClass(state) {
    return AudioPort;
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
        stroke: '#BBB', 'stroke-width': 2,
        onmousedown: this.dragMouseDown(actions),
      }),
      h('text',
        {
          transform: `translate(${x + tx}, ${y + ty}) scale(1, 1)`,
          'text-anchor': 'middle', x: 0, y: 0, ny: 0, 'dominant-baseline': 'middle'
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
  renderGraph(idPrefix) {
    return [];
  }
  *gen() {
    yield `const ${this.id} = _basic.create${this.constructor.name}(_ctx, {${
      this.getParamList().map(
        ([_t, {name}]) => `${name}: ${this.getParamValue(name)}`
      ).join(', ')}});`;
  }
}

export class Gain extends ANode {
  constructor(data) {
    super(data);
    const {gain = 1.0} = this.state;
    this.gain = gain;
  }
  getPorts() {
    return [
      ['inp',  PORT_DIR_IN, -1, -0],
      ['gain', PORT_DIR_IN, 0, -1/2],
      ['out',  PORT_DIR_OUT, +1, 0],
    ];
  }
  getParamList() {
    return [
      ['Float', {name: 'gain'}],
    ];
  }
  getTextPos() {
    return [-1/3, 0];
  }
  getShapePath() {
    return ['m', 1, 0, 'l', -2, 1, 'l', 0, -2, 'z'];
  }
  renderGraph(idPrefix) {
    return [
      ['Gain', {id: idPrefix + this.id, gain: 0}]
    ];
  }
}

export class Osc extends ANode {
  constructor(data) {
    super(data);
    const {type = 'sine', frequency = 440} = this.state;
    this.type = type;
    this.frequency = frequency;
  }
  getPorts() {
    return [
      ['pitch',   PORT_DIR_IN, -1, 0, {}],
      ['freq',   PORT_DIR_IN, 0, -1, {}],
      ['detune', PORT_DIR_IN, 0, +1, {}],
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getParamList() {
    return [
      ['Select', {name: 'type'},
        ['Option', {value: 'sine', label: 'Sine'}],
        ['Option', {value: 'triangle', label: 'Tri'}],
        ['Option', {value: 'square', label: 'Square'}],
        ['Option', {value: 'sawtooth', label: 'Saw'}],
      ],
      ['Float', {name: 'frequency'}],
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
      sawtooth: [
        'M', -0.75, +0.375,
        'L', -0.75, -0.375,
        'L', 0, +0.375,
        'L', 0, -0.375, 
        'L', 0.75, +0.375,
      ],
    }
    return typeShape[this.type] || [];
  }
  renderGraph(idPrefix) {
    const {type} = this;
    return [
      ['Oscillator', {id: idPrefix + this.id, type}]
    ];
  }
}

export class Const extends ANode {
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
  getParamList() {
    return [
      ['Float', {name: 'value'}],
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
  renderGraph(idPrefix) {
    const {value} = this;
    return [
      ['ConstantSource', {id: idPrefix + this.id, value}]
    ];
  }
}

export class Filter extends ANode {
  constructor(data) {
    super(data);
    const {type = 'lowpass'} = this.state;
    this.type = type;
  }
  getPorts() {
    return [
      ['inp',  PORT_DIR_IN, -1, 0, {}],
      ['freq', PORT_DIR_IN, -0.4, -1, {nx: 0, ny: -1}],
      ['detune', PORT_DIR_IN, +0.4, -1, {nx: 0, ny: -1}],
      ['Q', PORT_DIR_IN, 0, +1, {}],
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getParamList() {
    return [
      ['Select', {name: 'type'},
        ['Option', {value: 'lowpass', label: 'LP'}],
        ['Option', {value: 'highpass', label: 'HP'}],
        ['Option', {value: 'bandpass', label: 'BP'}],
        ['Option', {value: 'notch', label: 'Notch'}],
      ],
      ['Float', {name: 'frequency'}],
    ];
  }
  getShapePath() {
    return ['M', -1, -1,
      'L', 1, -1,
      'L', 1, 1,
      'L', -1, 1,
      'z',
    ];
  }
  getInnerShapePath() {
    const typeShape = {
      lowpass: [
        'M', -0.75, -0.2,
        'C', 0.2, -0.2, 0.1, -0.75, 0.3, -0.75,
        'S', 0.75, 0.75, 0.75, 0.75, 
      ],
      highpass: [
        'M', +0.75, -0.2,
        'C', -0.2,  -0.2, -0.1, -0.75, -0.3, -0.75,
        'S', -0.75, 0.75, -0.75, 0.75, 
      ],
      bandpass: [
        'M', -0.75, 0.3,
        'C', 0.1,   0.3, -0.3, -0.75, 0, -0.75,
        'S', -0.1,  0.3, 0.75, 0.3,
      ],
      notch: [
        'M', -0.75, -0.3,
        'C', 0.1, -0.3, -0.2, 0.75, 0, 0.75,
        'S', -0.1, -0.3, 0.75, -0.3,
      ],
    }
    return typeShape[this.type] || [];
  }
  renderGraph(idPrefix) {
    const {type} = this;
    return [
      ['BiQuadFilter', {id: idPrefix + this.id, type}]
    ];
  }
}

export class ModulePortNode extends ANode {
  constructor(data) {
    super(data);
    const {kind = 'audio'} = this.state;
    this.kind = kind;
  }
  getShapePath() {
    return ['m', -1, 0,
      'a', 1, 1, '0', '0', '0', 2, 0,
      'a', 1, 1, '0', '0', '0', -2, 0,
    ];
  }
}

export class ModuleInput extends ModulePortNode {
  getPorts() {
    return [
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getInnerShapePath() {
    return [
      'M', -1.5, 0,
      'L', 0, 0,
      'M', -0.5, -0.5,
      'L', 0, 0,
      'L', -0.5, 0.5,
    ];
  }
}

export class AudioParam extends ModuleInput {
}

export class ModuleOutput extends ModulePortNode {
  getPorts() {
    return [
      ['inp',  PORT_DIR_IN, -1, 0, {}],
    ];
  }
  getInnerShapePath() {
    return [
      'M', 0, 0, 'L', 1.5, 0,
      'M', 1, -0.5,
      'L', 1.5, 0,
      'L', 1, 0.5,
    ];
  }
}

export class AudioOut extends ModuleOutput {
}

export class ModuleInstance extends ANode {
  getSource() {
    const {moduleId} = this.state;
    return this.module.allModules[moduleId];
  }
  getSourceElems() {
    const source = this.getSource();
    return source.elems
      .map(([_t, {id}]) => source.all[id]);
  }
  getSourceNodes() {
    return this.getSourceElems().filter(elem => elem instanceof Node);
  }
  getPortClass(state) {
    return ModulePort;
  }
  getPorts() {
    const {moduleId} = this.state;
    const source = this.getSource();
    const sourceNodes = this.getSourceNodes();
    const ins = sourceNodes
      .filter(node => node instanceof ModuleInput);
    const outs = sourceNodes
      .filter(node => node instanceof ModuleOutput);
    const sizeY = Math.max((Math.max(ins.length, outs.length))/3, 1);
    Object.assign(this, {moduleId, source, ins, outs, sourceNodes, sizeY});
    const ports = [
      ...ins.map(({id, kind}, i) => [id, PORT_DIR_IN, -1, (i - (ins.length - 1)/2)*2/3, {nx: -1, ny: 0}]),
      ...outs.map(({id, kind}, i) => [id, PORT_DIR_OUT, 1, (i - (outs.length - 1)/2)*2/3, {nx: 1, ny: 0}]),
    ];
    return ports;
  }
  getShapePath() {
    const {sizeY} = this;
    return ['M', -1, -sizeY,
      'L', 1, -sizeY,
      'L', 1, sizeY,
      'L', -1, sizeY,
      'Z'
    ];
  }
  renderGraph(idPrefix) {
    return this.getSourceElems().reduce((result, elem) => result.concat(elem.renderGraph(idPrefix + this.id + '$')), []);
  }
  *gen() {
    yield `const ${this.id} = _modules.${this.moduleId}({_ctx, _basic, _modules, _synths});`;
  }
}

export class ADSR extends ANode {
  constructor(data) {
    super(data);
    const {a = 0.01, d = 0.2, s = 0.5, r = 1} = this.state;
    Object.assign(this, {a, d, s, r});
  }
  getPorts() {
    return [
      ['inp',  PORT_DIR_IN, -1, 0, {}],
      ['out',  PORT_DIR_OUT, +1, 0, {}],
    ];
  }
  getParamList() {
    return [
      ['Float', {name: 'a'}],
      ['Float', {name: 'd'}],
      ['Float', {name: 's'}],
      ['Float', {name: 'r'}],
    ];
  }
  getShapePath() {
    return ['M', -1, -1,
      'L', 1, -1,
      'L', 1, 1,
      'L', -1, 1,
      'z',
    ];
  }
  getInnerShapePath() {
    const typeShape = {
      lowpass: [
        'M', -0.75, -0.2,
        'C', 0.2, -0.2, 0.1, -0.75, 0.3, -0.75,
        'S', 0.75, 0.75, 0.75, 0.75, 
      ],
      highpass: [
        'M', +0.75, -0.2,
        'C', -0.2,  -0.2, -0.1, -0.75, -0.3, -0.75,
        'S', -0.75, 0.75, -0.75, 0.75, 
      ],
      bandpass: [
        'M', -0.75, 0.3,
        'C', 0.1,   0.3, -0.3, -0.75, 0, -0.75,
        'S', -0.1,  0.3, 0.75, 0.3,
      ],
      notch: [
        'M', -0.75, -0.3,
        'C', 0.1, -0.3, -0.2, 0.75, 0, 0.75,
        'S', -0.1, -0.3, 0.75, -0.3,
      ],
    }
    return typeShape[this.type] || [];
  }
  renderGraph(idPrefix) {
    const {type} = this;
    return [
      ['BiQuadFilter', {id: idPrefix + this.id, type}]
    ];
  }
}


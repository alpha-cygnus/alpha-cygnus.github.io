import { Elem, Node, Link } from './base.js';
import { Port, PORT_DIR_IN, PORT_DIR_OUT } from './ports.js';
import { startDragOnMouseDown, yieldElemXML } from './utils.js';

import {xl} from './xmllike.js';

export class ANode extends Node {
  initProps() {
    super.initProps();
    const {fill = 'white', size = 30} = this.state;
    Object.assign(this, {size, fill});
    this.getPorts().map(([_t, {x, y, nx, ny, ...opts}]) => this.addPort([_t, {
      x: x*size, y: y*size, nx: nx && nx*size, ny: ny && ny*size, ...opts
    }]));
  }
  getPorts() {
    return [];
  }
  getMainStroke() {
    const {$dragging, size, undeletable} = this;
    return {
      stroke: $dragging ? 'black' : '#444',
      'stroke-width': this.isSelected() ? 5 : $dragging ? 2 : 1,
      'stroke-linejoin': 'round',
      ...(undeletable ? {'stroke-dasharray': '8, 2'} : {})
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
    yield `const ${this.id} = _ctx.core.create${this.constructor.name}({${
      this.getParamList().map(
        ([_t, {name, type}]) => {
          const v = this.getParamValue(name);
          return `${name}: ${type === 'string' ? '"' + v + '"' : v}`;
        }
      ).join(', ')}});`;
  }
  genGraph(h) {
    return h('node', 
      this.getParamList().reduce((res, [_t, {name, type}]) => ({...res, [name]: this.getParamValue(name)}), {
        id: this.id, class: this.constructor.name
      })
    );
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
      ['AudioIn', {name: 'inp',  x: -0.75, y: -0}],
      ['AudioIn', {name: 'gain', x: 0, y: +0.375}],
      ['AudioOut', {name: 'out', x: +0.75, y: 0}],
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
  getText() {
    return '*' + this.gain;
  }
  getShapePath() {
    return ['M', 0.75, 0, 'L', -0.75, -0.75, 'L', -0.75, 0.75, 'z'];
  }
  // renderGraph(idPrefix) {
  //   return [
  //     ['Gain', {id: idPrefix + this.id, gain: 0}]
  //   ];
  // }
}

export class Osc extends ANode {
  constructor(data) {
    super(data);
    const {type = 'sine', frequency = 440, detune = -900, octave = 0} = this.state;
    this.type = type;
    this.frequency = frequency;
    this.detune = detune;
    this.octave = octave;
  }
  getPorts() {
    return [
      ['AudioIn',   {name: 'pitch',   x: -1, y: 0}],
      ['AudioIn',   {name: 'frequency',    x: 0, y: -1}],
      ['AudioIn',   {name: 'detune',    x: 0, y: +1}],
      // ['ControlIn', {name: 'control', x: 0, y: -1}],
      ['AudioOut',  {name: 'out',     x: +1, y: 0}],
    ];
  }
  getParamList() {
    return [
      ['Radio', {name: 'type', type: 'string'},
        ['Option', {value: 'sine', label: 'Sine'}],
        ['Option', {value: 'triangle', label: 'Tri'}],
        ['Option', {value: 'square', label: 'Square'}],
        ['Option', {value: 'sawtooth', label: 'Saw'}],
      ],
      ['Float', {name: 'frequency', step: 1}],
      ['Float', {name: 'detune', step: 1}],
      ['Float', {name: 'octave', step: 1}],
    ];
  }
  // getControls() {
  //   return ['on', 'cut'];
  // }
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
  // renderGraph(idPrefix) {
  //   const {type} = this;
  //   return [
  //     ['Oscillator', {id: idPrefix + this.id, type}]
  //   ];
  // }
}

export class Const extends ANode {
  constructor(data) {
    super(data);
    const {value = 1} = this.state;
    this.value = value;
  }
  getPorts() {
    return [
      ['AudioOut', {name: 'out', x: +1, y: 0}],
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
  getText() {
    return '';
  }
  renderInnerSVG(h) {
    const {x, y, size} = this;
    const [tx, ty] = [0, 0*size];
    const txt = (this.value > 0 ? '+' : '') + this.value;
    return [
      h('text',
        {
          transform: `translate(${x + tx}, ${y + ty}) scale(1.2)`,
          'text-anchor': 'middle', x: 0, y: 0, 'dominant-baseline': 'middle'
        },
        txt,
      ),
    ];
  }
  // renderGraph(idPrefix) {
  //   const {value} = this;
  //   return [
  //     ['ConstantSource', {id: idPrefix + this.id, value}]
  //   ];
  // }
}

export class Filter extends ANode {
  constructor(data) {
    super(data);
    const {type = 'lowpass', frequency = 1000, detune = 0, q = 0} = this.state;
    Object.assign(this, {type, frequency, detune, q});
  }
  getPorts() {
    return [
      ['AudioIn',  {name: 'inp',    x: -1, y: 0 }],
      ['AudioIn',  {name: 'freq',   x: -0.4, y: -1, nx: 0, ny: -1}],
      ['AudioIn',  {name: 'detune', x: +0.4, y: -1, nx: 0, ny: -1}],
      ['AudioIn',  {name: 'Q',      x: 0, y: +1}],
      ['AudioOut', {name: 'out',    x: +1, y: 0}],
    ];
  }
  getParamList() {
    return [
      ['Radio', {name: 'type', type: 'string'},
        ['Option', {value: 'lowpass', label: 'LP'}],
        ['Option', {value: 'highpass', label: 'HP'}],
        ['Option', {value: 'bandpass', label: 'BP'}],
        ['Option', {value: 'notch', label: 'Notch'}],
      ],
      ['Float', {name: 'frequency', step: 1}],
      ['Float', {name: 'detune', step: 1}],
      ['Float', {name: 'q', step: 0.1}],
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
  // renderGraph(idPrefix) {
  //   const {type} = this;
  //   return [
  //     ['BiQuadFilter', {id: idPrefix + this.id, type}]
  //   ];
  // }
}

export class Delay extends ANode {
  constructor(data) {
    super(data);
    const {maxDelayTime = 1, delayTime = 0} = this.state;
    Object.assign(this, {maxDelayTime, delayTime});
  }
  getPorts() {
    return [
      ['AudioIn',  {name: 'inp',    x: -1, y: 0 }],
      ['AudioIn',  {name: 'time', x: -0.25, y: 0.75, nx: 0, ny: 1}],
      ['AudioOut', {name: 'out',    x: +1, y: 0}],
    ];
  }
  getParamList() {
    return [
      ['Float', {name: 'maxDelayTime', step: 0.5}],
      ['Float', {name: 'delayTime', step: 0.01}],
    ];
  }
  getShapePath() {
    return [
      'M', -1.25, 0.75,
      'L', -0.75, -0.75,
      'L', 1.25, -0.75,
      'L', 0.75, 0.75,
      'z',
    ];
  }
}

export class Pan extends ANode {
  constructor(data) {
    super(data);
    const {pan = 0} = this.state;
    Object.assign(this, {pan});
  }
  getPorts() {
    return [
      ['AudioIn',  {name: 'inp',    x: -1, y: 0 }],
      ['AudioIn',  {name: 'pan',    x: 0, y: 0.5, nx: 0, ny: 1}],
      ['AudioOut', {name: 'out',    x: +1, y: 0}],
    ];
  }
  getParamList() {
    return [
      ['Float', {name: 'pan', step: 0.1}],
    ];
  }
  getShapePath() {
    // return ['M', 0, 0.5,
    //   'A', 0.63, 0.63, '0', '1', '0', 0, -0.5,
    //   'A', 0.63, 0.63, '0', '1', '0', 0, +0.5,
    // ];
    return [
      'M', -1, -1,
      'L', -1, 1,
      'L', 0, 0.5,
      'L', 1, 1,
      'L', 1, -1,
      'L', 0, -0.5,
      'z',
    ];
  }
}

export class PatchPortNode extends ANode {
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
  getPortClass() {
    return 'Audio';
  }
}

export class PatchInput extends PatchPortNode {
  getPorts() {
    return [
      ['AudioOut', {name: 'out',  x: +1, y: 0}],
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
  getPortClass() {
    return 'AudioIn';
  }
}

export class AudioParam extends PatchInput {
}

export class AudioIn extends PatchInput {
}

export class ControlIn extends PatchInput {
  getPorts() {
    return [
      ['ControlOut', {name: 'out',  x: +1, y: 0}],
    ];
  }
  getPortClass() {
    return 'ControlIn';
  }
}

export class PatchOutput extends PatchPortNode {
  getPorts() {
    return [
      ['AudioIn', {name: 'inp',  x: -1, y: 0}],
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
  getPortClass() {
    return 'AudioOut';
  }
}

export class AudioOut extends PatchOutput {
}

export class ControlOut extends PatchInput {
  getPorts() {
    return [
      ['ControlIn', {name: 'inp',  x: -1, y: 0}],
    ];
  }
  getPortClass() {
    return 'ControlIn';
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
      ['ControlIn', {name: 'control', x: 0, y: -1}],
      ['AudioIn', {name: 'inp', x: -1, y: 0}],
      ['AudioOut', {name: 'out', x: +1, y: 0}],
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
  // getControls() {
  //   return ['on', 'off', 'cut'];
  // }
  getShapePath() {
    return ['M', -1, -1,
      'L', 1, -1,
      'L', 1, 1,
      'L', -1, 1,
      'z',
    ];
  }
  getInnerShapePath() {
    return [
      'M', -0.75, +0.75,
      'L', -0.7, -0.75,
      'L', -0.25, +0.25,
      'L', 0.25, 0.25,
      'L', 0.75, +0.75,
    ];
  }
  // renderGraph(idPrefix) {
  //   const {type} = this;
  //   return [
  //     ['BiQuadFilter', {id: idPrefix + this.id, type}]
  //   ];
  // }
}

export class Use extends ANode {
  getSource() {
    const {patchId} = this.state;
    return this.parent.allPatches[patchId];
  }
  getSourceElems() {
    const source = this.getSource();
    return source.elems
      .map(([_t, {id}]) => source.all[id]);
  }
  getSourceNodes() {
    return this.getSourceElems().filter(elem => elem instanceof Node);
  }
  // getPortClass(state) {
  //   return PatchPort;
  // }
  getPorts() {
    const {patchId} = this.state;
    const source = this.getSource();
    const sourceNodes = this.getSourceNodes();
    const ins = sourceNodes
      .filter(node => node instanceof PatchInput);
    const outs = sourceNodes
      .filter(node => node instanceof PatchOutput);
    const sizeY = Math.max((Math.max(ins.length, outs.length))/3, 1);
    Object.assign(this, {patchId, source, ins, outs, sourceNodes, sizeY});
    const ports = [
      ...ins.map((port, i) => [port.getPortClass(), {name: port.id, x: -1, y: (i - (ins.length - 1)/2)*2/3, nx: -1, ny: 0}]),
      ...outs.map((port, i) => [port.getPortClass(), {name: port.id, x: 1, y: (i - (outs.length - 1)/2)*2/3, nx: 1, ny: 0}]),
    ];
    return ports;
  }
  // getControls() {
  //   return ['on', 'off', 'cut'];
  // }
  getShapePath() {
    const {sizeY} = this;
    return ['M', -1, -sizeY,
      'L', 1, -sizeY,
      'L', 1, sizeY,
      'L', -1, sizeY,
      'Z'
    ];
  }
  // renderGraph(idPrefix) {
  //   return this.getSourceElems().reduce((result, elem) => result.concat(elem.renderGraph(idPrefix + this.id + '$')), []);
  // }
  *gen() {
    yield `const ${this.id} = _ctx.patches.${this.patchId}(_ctx);`;
  }
}

export class Channel extends ANode {
  getShapePath() {
    return ['M', -1, -1,
      'L', 1, -1,
      'L', 1, 1,
      'L', -1, 1,
      'z',
    ];
  }
  getPorts() {
    return [
      ['ControlOut', {name: 'control', x: 0, y: -1}],
      ['AudioOut', {name: 'out',  x: +1, y: 0}],
      ['AudioOut', {name: 'mix1', x: -0.75, y: +1, nx: 0}],
      ['AudioOut', {name: 'mix2', x: 0, y: +1}],
      ['AudioOut', {name: 'mix3', x: +0.75, y: +1, nx: 0}],
    ];
  }
}

const aLink = (f, t, c) => {
  const [from, fromPort = 'out'] = f.split('.');
  const [to, toPort = 'inp'] = t.split('.');
  return [c, {from, fromPort, to, toPort}];
}

const audioLink = (f, t) => aLink(f, t, 'AudioLink');
const controlLink = (f, t) => aLink(f, t, 'ControlLink');

export const patchPresets = [
  xl`
  <Synth id="synth" tx=0 ty=0 scale=1>
    <ControlIn id="control" x=-350 y=-100 />
    <AudioParam id="pitch" x=-350 y=0 />
    <AudioParam id="vol" x=-350 y=100 />
    <AudioOut id="out" x=+350 y=0 />
    <Osc id="osc0" x=-150 y=0 />
    <ADSR id="adsr0" x=0 y=0 a=0.5 d=0.3 s=0.1 r=0.5 />
    <Gain id="gain0" x=150 y=0 gain=0/>
    ${audioLink('vol', 'gain0.gain')}
    ${audioLink('pitch', 'osc0.pitch')}
    ${audioLink('osc0', 'adsr0')}
    ${audioLink('adsr0', 'gain0')}
    ${audioLink('gain0', 'out')}
    ${controlLink('control', 'adsr0.control')}
  </Synth>`,
];

export class NewNode extends ANode {
  getShapePath() {
    return ['m', -1, 0,
      'a', 1, 1, '0', '0', '0', 2, 0,
      'a', 1, 1, '0', '0', '0', -2, 0,
    ];
  }
  getInnerShapePath() {
    return [
      'M', -0.75, 0,
      'L', +0.75, 0,
      'M', 0, -0.75,
      'L', 0, +0.75,
    ];
  }
  renderEditor(h, actions) {
    const {setPatchState, selectElem} = actions;
    const {parent: {state: {$toAdd}}} = this;
    return h('div', {},
      h('h1', {}, 'New node'),
      this.parent.getPresets().map(preset => {
        return h('button', {
          title: [...yieldElemXML(preset)].join('\n'),
          onclick: e => {
            console.log('selected', preset);
            setPatchState({$toAdd: preset});
          },
        }, preset[1].id);
      }),
      $toAdd ? [
        h('pre', {}, [...yieldElemXML($toAdd)].join('\n')),
        h('button', {
          onclick: e => {
            setPatchState({$toAdd: null, $currentElem: null});
          },
        }, 'CANCEL'),
      ] : [],
      h('h1', {}, 'New patch'),
      patchPresets.map(preset => {
        return h('button', {
          onclick: e => {
            // console.log('selected', preset);
            // setPatchState({$toAdd: preset});
          },
        }, preset[1].id);
      }),
    );
  }
}
import { snap, rnd, pick, mangleScale, startDragOnMouseDown, yieldElemXML } from './utils.js';

import {Link} from './base.js';

import * as NODE_CLASSES from './nodes.js';
import * as LINK_CLASSES from './links.js';

import * as ACTIONS from './actions.js';

const ELEM_CLASSES = {...NODE_CLASSES, ...LINK_CLASSES};

export class Patch {
  constructor(parent, props, elems) {
    this.parent = parent;
    this.allPatches = parent.allPatches;
    this.state = props;
    const {id, title, scale, tx, ty, $currentElem, $toAdd, snapTo = 10} = props;
    this.name = id;
    Object.assign(this, {id, elems, title, scale, tx, ty, $currentElem, $toAdd, snapTo});
    const all = {};
    this.all = all;
    for (const [_t, props, ...subs] of elems) {
      const Cls = ELEM_CLASSES[_t];
      const {id, ...state} = props;
      if (!Cls) console.error({_t, id});
      const elem = new Cls({id, state, parent: this});
      all[elem.id] = elem;
    }
  }
  isUndeletable(elem) {
    return false;
  }
  initProps() {
    for (const elem of Object.values(this.all)) {
      elem.initProps();
    }
    this.links = {
      from: {},
      to: {},
    };
    const {from, to} = this.links;
    for (const link of Object.values(this.all).filter(e => e instanceof Link)) {
      from[link.from] = from[link.from] || {};
      from[link.from][link.fromPort] = [...(from[link.from][link.fromPort] || []), link];
      to[link.to] = to[link.to] || {};
      to[link.to][link.toPort] = [...(to[link.to][link.toPort] || []), link];
    }
  }
  renderSVG(h, actions, viewBox) {
    const [x = -400, y = -400, width = 800, height = 800] = viewBox || [];
    const {setPatchState, selectElem, newElem} = actions;
    const {tx, ty, scale, elems, all, snapTo, $toAdd, $currentElem} = this;
    const grid = [];
    if (snapTo) {
      var path = [];
      const [x0, x1] = [Math.floor((x - tx)/snapTo)*snapTo, width + x + snapTo - tx];
      const [y0, y1] = [Math.floor((y - ty)/snapTo)*snapTo, width + y + snapTo - ty];
      for (let gx = x0; gx < x1; gx += snapTo) {
        path.push('M', gx, y0, 'L', gx, y1);
      }
      for (let gy = y0; gy < y1; gy += snapTo) {
        path.push('M', x0, gy, 'L', x1, gy);
      }
      //grid.push(h('path', {key: 'grid', d: path.join(' '), stroke: '#CCC', fill: 'none', 'stroke-dasharray': '2,2'}));
    }
    return [
      h('rect', {
        x, y, width, height,
        // fill: '#EEE',
        fill: 'none',
        stroke: 'black',
        // onmousedown: startDragOnMouseDown(
        //   e => {
        //     const [dx, dy] = [tx - e.x, ty - e.y];
        //     return {dx, dy};
        //   },
        //   (e, {dx, dy}) => {
        //     setPatchState({tx: e.x + dx, ty: e.y + dy});
        //   },
        //   (e, {dx, dy}) => {
        //     const [dx1, dy1] = [tx - e.x, ty - e.y];
        //     if (dx1 === dx && dy1 === dy) {
        //       console.log('RECT1 click'),
        //       selectElem({id: null});
        //     }
        //   },
        // )
      }),
      h('g', {transform: `translate(${tx + 0.5}, ${ty + 0.5}) scale(${scale})`},
        grid,
        h('rect', {
          x: (x - tx)/scale, y: (y - ty)/scale, width: width/scale, height: height/scale,
          fill: 'url(#gridPattern)', stroke: 'none',
          onmousedown: startDragOnMouseDown(
            e => {
              const [dx, dy] = [tx - e.x, ty - e.y];
              return {dx, dy};
            },
            (e, {dx, dy}) => {
              setPatchState({tx: e.x + dx, ty: e.y + dy});
            },
            (e, {dx, dy}) => {
              const [dx1, dy1] = [tx - e.x, ty - e.y];
              if (dx1 === dx && dy1 === dy) {
                if ($toAdd && $currentElem === '__new') {
                  const [_t, state, ...subs] = $toAdd;
                  let id = state.id;
                  for (let i = 0; i < 100; i++) {
                    if (!this.all[id + i]) {
                      id = id + i; break;
                    }
                  }
                  state.id = id;
                  state.x = (e.x + x - tx)/scale;
                  state.y = (e.y + y - ty)/scale;
                  newElem([_t, state, ...subs]);
                  setPatchState({$toAdd: null, $currentElem: id});
                } else {
                  selectElem({id: null});
                }
              }
            },
          )
        }),
        [0, 1, 2, 3].map(layer => 
          h('g', {class: `layer${layer}`, id: `layer_${layer}`},
            Object.keys(all)
              .map(id => all[id])
              .filter(x => x)
              .filter(elem => elem.getLayer() === layer)
              .map(elem => elem.renderSVG(h, actions)),
          )
        )
      )
    ];
  }
  getCurrentElem() {
    const {$currentElem, all} = this;
    if (!$currentElem) return this;
    const [ce, cp] = $currentElem.split('.');
    const elem = all[ce];
    if (!elem) return this;
    if (cp) return elem.getPort(cp);
    return elem;
  }
  renderEditor(h, {setPatchState, setProjectState, logState, newElem}) {
    const {scale} = this;
    return h('div', {},
      h('h2', {}, this.title,
        h('select', {
            name: 'selectPatch',
            class: 'patch',
            onchange: e => {
              setProjectState({currentPatch: e.target.value});
            },
          },
          Object.values(this.parent.allPatches).map(
            patch => h('option', {value: patch.id, selected: patch.id === this.id ? 'selected' : ''}, `${patch.title}: ${patch.constructor.name}`),
          ),
        ),
      ),
      h('button', {
        onclick: e => setPatchState({scale: scale * Math.sqrt(2)})
      }, '+'),
      h('button', {
        onclick: e => setPatchState({scale: scale / Math.sqrt(2)})
      }, '-'),
      h('button', {
        onclick: e => logState()
      }, 'log'),
      h('button', {
        onclick: e => {
          console.log([...yieldElemXML(this.renderGraph())].join('\n'));
        }
      }, 'G'),
      h('button', {
        onclick: e => {
          console.log([...this.parent.gen()].join('\n'));
        }
      }, 'gen'),
      h('button', {
        onclick: e => newElem(['Osc', {id: 'newOsc', x: 0, y: 0}]),
      }, 'new test'),
      h('pre', {id: 'preProps', style: {height: '600px', overflow: 'auto'}}, JSON.stringify([this.state, this.elems], null, '  ')),
    );
  }
  renderGraph() {
    const g = ['Graph', {}];
    for (const elem of Object.values(this.all)) {
      g.push(...elem.renderGraph(''));
    }
    return g;
  }
  *genNodes() {
    const nodes = Object.values(this.all).filter(e => !(e instanceof Link));
    for (const node of nodes) {
      yield * [...node.gen()];
    }
  }
  *genLinks() {
    const links = Object.values(this.all).filter(e => e instanceof Link);
    for (const link of links) {
      yield * [...link.gen()];
    }
  }
  *genAdditional() {
  }
  *genReturn() {
    const inps = Object.values(this.all).filter(node => node instanceof NODE_CLASSES.PatchInput);
    const outs = Object.values(this.all).filter(node => node instanceof NODE_CLASSES.PatchOutput);
    for (const inp of inps) {
      yield `  ${inp.id}: ${inp.id}.inp,`;
    }
    for (const out of outs) {
      yield `  ${out.id}: ${out.id}.out,`;
    }
  }
  *gen() {
    yield * this.genNodes();
    yield * this.genLinks();
    yield * this.genAdditional();
    yield `return {`;
    yield * this.genReturn();
    yield '};';
  }
  getPresets() {
    return [
      ['Osc', {id: 'osc'}],
      ['Osc', {id: 'lfo', frequency: 1, detune: 0}],
      ['Gain', {id: 'gain', gain: 1}],
      ['Gain', {id: 'vca', gain: 0}],
      ['ADSR', {id: 'adsr', a: 0.1, d: 0.2, s: 0.3, r: 0.4}],
      ['Const', {id: 'const', value: 1}],
      ['Filter', {id: 'lpf', type: 'lowpass', frequency: 2000, detune: 0, q: 0}],
      ['Filter', {id: 'hpf', type: 'highpass', frequency: 2000, detune: 0, q: 0}],
      ['Pan', {id: 'pan'}],
      ['Delay', {id: 'delay'}],
    ];
  }
}

export class Synth extends Patch {
  *genAdditional() {
    yield `control.out.on('cut', t => setTimeout(() => out.out.disconnect(), (t - _ctx.core.currentTime)*1000 + 10));`;
  }
  isUndeletable(elem) {
    return elem.id in {
      control: 1, pitch: 1, vol: 1, out: 1,
    };
  }
}

export class FXPatch extends Patch {

}

export class MainPatch extends Patch {
  isUndeletable(elem) {
    if (elem instanceof NODE_CLASSES.Channel) {
      return Object.values(this.all)
        .filter(node => node instanceof NODE_CLASSES.Channel).length <= 1;
    }
    return elem.id in {
      out: 1,
    };
  }
  *genReturn() {
    yield * super.genReturn();
    const chNum = ch => parseInt(ch.id.match(/[a-z]*(\d+)/)[0]);
    const chs = Object.values(this.all)
      .filter(node => node instanceof NODE_CLASSES.Channel)
      .sort((a, b) => chNum(a) - chNum(b));
    yield `channels: [${chs.map(ch => ch.id).join(', ')}],`;
    yield `send() {},`;
  }
  getPresets() {
    return [
      ['Channel', {id: 'channel'}],
    ].concat(super.getPresets());
  }
}

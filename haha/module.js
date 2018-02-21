import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import * as NODE_CLASSES from './nodes.js';
import * as LINK_CLASSES from './links.js';

import * as ACTIONS from './actions.js';

const ELEM_CLASSES = {...NODE_CLASSES, ...LINK_CLASSES};

export class Module {
  constructor(props, elems) {
    this.state = props;
    const {id, title, scale, tx, ty, $currentElem, snapTo = 10} = props;
    this.name = id;
    Object.assign(this, {id, elems, title, scale, tx, ty, $currentElem, snapTo});
    const all = {};
    this.all = all;
    for (const [_t, props, ...subs] of elems) {
      const Cls = ELEM_CLASSES[_t];
      const {id, ...state} = props;
      if (!Cls) console.error({_t, id});
      all[id] = new Cls({id, state, module: this});
    }
  }
  renderSVG(h, actions, viewBox) {
    const [x = -400, y = -400, width = 800, height = 800] = viewBox || [];
    const {setModuleState, selectElem} = actions;
    const {tx, ty, scale, elems, all, snapTo} = this;
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
        onmousedown: startDragOnMouseDown(
          e => {
            const [dx, dy] = [tx - e.x, ty - e.y];
            return {dx, dy};
          },
          (e, {dx, dy}) => {
            setModuleState({tx: e.x + dx, ty: e.y + dy});
          },
          (e, {dx, dy}) => {
            const [dx1, dy1] = [tx - e.x, ty - e.y];
            console.log(dx1, dy1, dx, dy);
            if (dx1 === dx && dy1 === dy) {
              console.log('select none');
              selectElem({id: null});
            }
          },
        )
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
              setModuleState({tx: e.x + dx, ty: e.y + dy});
            },
            (e, {dx, dy}) => {
              const [dx1, dy1] = [tx - e.x, ty - e.y];
              console.log(dx1, dy1, dx, dy);
              if (dx1 === dx && dy1 === dy) {
                console.log('select none');
                selectElem({id: null});
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
  renderEditor(h, {setModuleState, logState, newElem}) {
    const {scale} = this;
    return h('div', {},
      h('h2', {}, this.title),
      h('button', {
        onclick: e => setModuleState({scale: scale * Math.sqrt(2)})
      }, '+'),
      h('button', {
        onclick: e => setModuleState({scale: scale / Math.sqrt(2)})
      }, '-'),
      h('button', {
        onclick: e => logState()
      }, 'log'),
      h('button', {
        onclick: e => newElem(['Osc', {id: 'newOsc', x: 0, y: 0}]),
      }, 'new test'),
      h('pre', {id: 'preProps', style: {height: '600px', overflow: 'auto'}}, JSON.stringify([this.state, this.elems], null, '  ')),
    );
  }
}
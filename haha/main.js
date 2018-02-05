import { h, app } from './hyperapp/index.js';

for (const tag of 'div,h1,button,svg,path,circle'.split(',')) {
  window['h' + tag] = (props, ...children) => h(tag, props, children);
}

const snap = (x, to = 1) => Math.round(x / to)*to;

const nodeCount = Math.round(500 + Math.random(1500));
const elems = {};
for (let i = 0; i < nodeCount; i++) {
  elems['c' + i] = {
    _t: 'Circle', x: snap(Math.random()*600) + 100, y: snap(Math.random()*600) + 100,
    r: Math.random()*20 + 10, fill: ['red', 'green', 'blue'][Math.floor(Math.random()*3)],
  };
}

for (let i = 0; i < Math.random()*nodeCount*nodeCount; i++) {
  const f = Math.floor(Math.random()*nodeCount);
  const t = Math.floor(Math.random()*nodeCount);
  elems[`l${f}_${t}`] = {
    _t: 'DirectLink', from: `c${f}`, to: `c${t}`,
  };
}

const state = {
  count: 0,
  // elems: {
  //   c0: {
  //     _t: 'Circle',
  //     x: 20, y: 20,
  //     r: 20, fill: 'green',
  //   },
  //   c1: {
  //     _t: 'Circle',
  //     x: 50, y: 100,
  //     r: 10, fill: 'blue',
  //   },
  //   c2: {
  //     _t: 'Circle',
  //     x: 120, y: 20,
  //     r: 20, fill: 'green',
  //   },
  //   l1_2: {
  //     _t: 'DirectLink',
  //     from: 'c1', to: 'c2',
  //   },
  //   l0_2: {
  //     _t: 'DirectLink',
  //     from: 'c0', to: 'c2',
  //   },
  // }
  elems,
};

const actions = {
  down: value => state => ({ count: state.count - value }),
  up: value => state => ({ count: state.count + value }),
  elems: {
    setIt: ({_id, ...it}) => state => ({...state, [_id]: {...state[_id], ...it}}),
  },
};

const startDragOnMouseDown = (ondown, onmove, onup) => e => {
  const data = ondown(e);
  document.onmousemove = e => onmove(e, data);
  document.onmouseup = e => {
    onup(e, data);
    document.onmousemove = null;
    document.onmouseup = null;
  }
}


class Elem {
  constructor (_id, all) {
    this._id = _id;
    this.state = all[_id];
    this.all = all;
  }
  renderSVG(actions) {
  }
  getLayer() {
    return this.layer || 0;
  }
}

class Node extends Elem {
  constructor (_id, all) {
    super(_id, all);
    this.x = this.state.x;
    this.y = this.state.y;
    this.dragging = this.state.dragging;
    this.layer = 1;
  }
  dragMouseDown({setIt}) {
    const {_id, x, y} = this;
    return startDragOnMouseDown(
      e => {
        const [dx, dy] = [x - e.x, y - e.y];
        setIt({_id, dragging: true});
        return {dx, dy};
      },
      (e, {dx, dy}) => {
        setIt({_id, x: snap(dx + e.x), y: snap(dy + e.y)});
      },
      e => {
        setIt({_id, dragging: false})
      }
    );
  }
  isDragging() {
    return this.dragging;
  }
  getLayer() {
    return this.isDragging() ? 3 : 1;
  }
}

class Circle extends Node {
  renderSVG(actions) {
    const {r, fill} = this.state;
    const {_id, x, y, dragging} = this;
    return hcircle({id: _id, cx: x, cy: y, r, fill, stroke: dragging ? 'red' : 'white',
      onmousedown: this.dragMouseDown(actions)
    });
  }
}

class Link extends Elem {
  constructor (_id, all) {
    super(_id, all);
    this.from = this.state.from;
    this.to = this.state.to;
    this.layer = 0;
  }
  isDragging() {
    const [from, to] = [this.all[this.from], this.all[this.to]];
    return from.dragging || to.dragging;
  }
  getLayer() {
    return this.isDragging() ? 2 : 0;
  }
}

class DirectLink extends Link {
  renderSVG(actions) {
    const [from, to] = [this.all[this.from], this.all[this.to]];
    const dragging = this.isDragging();
    return hpath({
      d: `M${from.x} ${from.y} C${from.x + 100} ${from.y} ${to.x - 100} ${to.y} ${to.x} ${to.y}`,
      stroke: dragging ? 'black' : 'grey', fill: 'none', 'stroke-width': dragging ? 2 : 1,
    });
  }
}

const ELEM_CLASSES = {
  Circle,
  DirectLink,
};

const view = ({count, elems}, actions) => {
  const all = {...elems};
  for (const [_id, {_t, ...elem}] of Object.entries(elems)) {
    all[_id] = new ELEM_CLASSES[_t](_id, all);
  }
  return hdiv({},
    hsvg({width: '800px', height: '800px', style: 'border: 1px solid red'},
      h('g', {transform: 'translate(0.5, 0.5)'},
        [0, 1, 2, 3].map(layer => 
          h('g', {},
            Object.keys(elems)
              .map(_id => all[_id])
              .filter(elem => elem.getLayer() === layer)
              .map(elem => elem.renderSVG(actions.elems)),
          )
        )
      )
    )
  );
}

app(state, actions, view, document.getElementById('test'));


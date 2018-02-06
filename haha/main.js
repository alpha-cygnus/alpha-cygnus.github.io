import { h, app } from './hyperapp/index.js';

for (const tag of 'div,h1,button,svg,path,circle,g'.split(',')) {
  window['h' + tag] = (props, ...children) => h(tag, props, children);
}

const snap = (x, to = 1) => Math.round(x / to)*to;

const rnd = (n, n0 = 0) => Math.floor(Math.random()*n) + n0;
const pick = arr => arr[rnd(arr.length)];

const nodeCount = rnd(10, 10);
const elems = {};
for (let i = 0; i < nodeCount; i++) {
  elems['c' + i] = {
    _t: 'Circle', x: snap(rnd(600)) + 100, y: snap(rnd(600)) + 100,
    r: rnd(20, 10), fill: pick(['red', 'green', 'blue']),
  };
}

for (let i = 0; i < Math.random()*nodeCount*nodeCount; i++) {
  const f = rnd(nodeCount);
  const fi = pick([2, 3]);
  const t = Math.floor(Math.random()*nodeCount);
  const ti = pick([0, 1]);
  elems[`l${f}.${fi}_${t}.${ti}`] = {
    _t: 'DirectLink', from: `c${f}`, to: `c${t}`, fromPort: fi, toPort: ti,
  };
}

const state = {
  elems,
};

const actions = {
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

class Port {
  constructor(parent, state) {
    this.parent = parent;
    this.state = state;
    const r = 3;
    this.r = r;
    const {dx, dy} = this.state;
    const dx1 = dx ? dx/Math.abs(dx) : 0;
    const dy1 = dy ? dy/Math.abs(dy) : 0;
    this.x = parent.x + this.state.dx + dx1*r;
    this.y = parent.y + this.state.dy + dy1*r;
    this.dx = this.state.dx*3;
    this.dy = this.state.dy*3;
    this.fill = this.state.fill || 'none';
    this.stroke = this.state.stroke || 'black';
    this.name = this.state.name;
    this._id = parent._id + '.' + this.name;
  }
  renderSVG({setIt}) {
    const {_id, x, y, fill, stroke, parent, name} = this;
    return hcircle({id: _id, cx: x, cy: y, r: 5, fill, stroke,
      //onmousedown: this.dragMouseDown(actions)
      onmouseover: e => {
        console.log({_id: parent._id, portOver: name});
        setIt({_id: parent._id, portOver: name})
      },
      onmouseout: e => setIt({_id: parent._id, portOver: null}),
      // onmousedown: e => startDragOnMouseDown(
      //   e => {
      //     const [dx, dy] = [x - e.x, y - e.y];
      //     setIt({_id: '__fakeNode', dragging: true, x, y, r: 10});
      //     setIt({_id: '__newLink', from: parent._id, fromPort: name, to: '__fakeNode'})
      //     return {dx, dy};
      //   },
      //   (e, {dx, dy}) => {
      //     setIt({_id: '__fakeNode', x: snap(dx + e.x), y: snap(dy + e.y)});
      //   },
      //   e => {
      //     //setIt({_id: '__fakeNode'});
      //   }
      // ),
    });
  }
}

class Node extends Elem {
  constructor (_id, all) {
    super(_id, all);
    const {x, y, dragging, portOver} = this.state;
    Object.assign(this, {x, y, dragging, portOver});
    this.ports = [];
  }
  addPort(state) {
    const name = state.name || this.ports.length;
    //console.log({name, po: this.portOver, a: name === this.portOver});
    this.ports.push(new Port(this, {...state, name, fill: name === this.portOver ? 'red' : 'none'}));
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
  getPort(portId) {
    return this.ports[portId];
  }
}

class FakeNode extends Node {
  constructor (_id, all) {
    super(_id, all);
    this.portOver = 0;
    this.addPort({dx: 0, dy: 0});
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

class Circle extends Node {
  constructor(_id, all) {
    super(_id, all);
    const {r, fill} = this.state;
    Object.assign(this, {r, fill});
    this.addPort({dx: -r, dy: 0});
    this.addPort({dx: +r, dy: 0});
    this.addPort({dx: 0, dy: -r});
    this.addPort({dx: 0, dy: +r});
  }
  renderSVG(actions) {
    const {_id, x, y, r, fill, dragging} = this;
    return hg({}, 
      hcircle({id: _id, cx: x, cy: y, r, fill, stroke: dragging ? 'red' : 'white',
        onmousedown: this.dragMouseDown(actions)
      }),
      this.ports.map(port => port.renderSVG(actions)),
    );
  }
}

class Link extends Elem {
  constructor (_id, all) {
    super(_id, all);
    this.from = this.state.from;
    this.to = this.state.to;
    this.fromPort = this.state.fromPort;
    this.toPort = this.state.toPort;
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
    const [from, to] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    const dragging = this.isDragging();
    return hpath({
      d: `M${from.x} ${from.y} C${from.x + from.dx} ${from.y + from.dy}
      ${to.x + to.dx} ${to.y + to.dy} ${to.x} ${to.y}`,
      stroke: dragging ? 'black' : 'grey', fill: 'none', 'stroke-width': dragging ? 2 : 1,
    });
  }
}

const ELEM_CLASSES = {
  Circle,
  DirectLink,
  FakeNode,
};

const view = ({count, elems}, actions) => {
  const all = {...elems};
  for (const [_id, data] of Object.entries(elems)) {
    if (!data) continue;
    const {_t, ...elem} = data;
    const Cls = ELEM_CLASSES[_t];
    if (!Cls) console.error({_t, _id});
    all[_id] = new Cls(_id, all);
  }
  return hdiv({},
    hsvg({width: '800px', height: '800px', style: 'border: 1px solid red'},
      hg({transform: 'translate(0.5, 0.5)'},
        [0, 1, 2, 3].map(layer => 
          hg({},
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


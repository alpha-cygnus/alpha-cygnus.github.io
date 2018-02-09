import { h, app } from './hyperapp/index.js';

for (const tag of 'div,h1,button,svg,path,circle,g,text,textPath,defs,marker'.split(',')) {
  window['h' + tag] = (props, ...children) => h(tag, props, children);
}

const snap = (x, to = 1) => Math.round(x / to)*to;

const rnd = (n, n0 = 0) => Math.floor(Math.random()*n) + n0;
const pick = arr => arr[rnd(arr.length)];

const nodeCount = rnd(10, 10);
const elems = {};
for (let i = 0; i < nodeCount; i++) {
  elems['c' + i] = ['Circle', {
    x: snap(rnd(600)) + 100, y: snap(rnd(600)) + 100,
    r: rnd(20, 10), fill: pick(['red', 'green', 'blue']),
  }];
}

for (let i = 0; i < Math.random()*nodeCount*nodeCount; i++) {
  const f = rnd(nodeCount);
  const fi = pick([2, 3]);
  const t = Math.floor(Math.random()*nodeCount);
  const ti = pick([0, 1]);
  elems[`l${f}.${fi}-${t}.${ti}`] = ['DirectLink', {
    from: `c${f}`, to: `c${t}`, fromPort: fi, toPort: ti,
  }];
}

const state = {
  elems: {
    ...elems,
    __topState: ['TopState', {title: 'Random graph', scale: 1.5, tx: 0, ty: 0, currentElem: '__topState'}],
  }
};

const actions = {
  elems: {
    setIt: ({id, ...it}) => state => {
      return {...state, [id]: [state[id][0], {...state[id][1], ...it}]};
    },
    newOne: ([_t, {id, ...it}]) => state => ({...state, [id]: [_t, it]}),
    setPortOver: (port) => (state, actions) => {
      // console.log('setPortOver', port);
      if (port) {
        const {parent: {id}, name} = port;
        return actions.setTopState({portOverParent: id, portOverName: name});
      } else {
        return actions.setTopState({portOverParent: null, portOverName: null});
      }
    },
    setTopState: (it) => (state, actions) => {
      // console.log('topState', it);
      return actions.setIt({id: '__topState', ...it});
    },
    newLink: ({from, fromPort}) => (state, actions) => {
      const topState = state.__topState[1];
      const {portOverParent, portOverName} = topState;
      if (portOverParent) {
        const [to, toPort] = [portOverParent, portOverName];
        const state = {
          id: `l${from}.${fromPort}-${to}.${toPort}`,
          from, fromPort, to, toPort,
        };
        // console.log('creating new link', state);
        return actions.newOne(['DirectLink', state]);
      }
      return state;
    },
    deleteOne: ({id}) => state => ({...state, [id]: undefined}),
    selectOne: ({id}) => (state, actions) => {
      if (!id) id = '__topState';
      actions.setTopState({currentElem: id})
    },
  },
};

const startDragOnMouseDown = (ondown, onmove, onup, mangle = e => e) => e => {
  const data = ondown(mangle(e));
  document.onmousemove = e => onmove(mangle(e), data);
  document.onmouseup = e => {
    onup(mangle(e), data);
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

const mangleScale = scale => e => {
  return {...e, x: e.x/scale, y: e.y/scale}
};

class Elem {
  constructor ({id, state, all}) {
    this.id = id;
    this.state = state;
    this.all = all;
  }
  renderSVG(actions) {
  }
  getLayer() {
    return this.layer || 0;
  }
  isSelected() {
    return this.getTopState().currentElem === this.id;
  }
  onDelete({deleteOne, selectOne}) {
    const {id} = this;
    deleteOne({id});
    selectOne({id: null}); 
  }
  getTopState() {
    return this.all.__topState.state;
  }
  renderEditor(actions) {
    return hdiv({},
      h('h1', {}, this.id),
      h('button', {
        onclick: e => {
          this.onDelete(actions);
          actions.selectOne({id: null});
        },
      }, 'DEL'),
    );
  }
}

class TopState extends Elem {
  constructor(data) {
    super(data);
    Object.assign(this, this.state);
  }
  onDelete() {}
  renderEditor({setTopState}) {
    const {scale} = this;
    return hdiv({},
      h('h1', {}, this.title),
      h('button', {
        onclick: e => setTopState({scale: scale * 2})
      }, '+'),
      h('button', {
        onclick: e => setTopState({scale: scale / 2})
      }, '-'),
    );
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
    this.fill = this.state.fill || (this.state.isOver ? 'red' : 'white');
    this.stroke = this.state.isOver ? 'black' : 'grey';
    this.name = this.state.name;
    this.id = parent.id + '.' + this.name;
  }
  renderSVG({setIt, newOne, deleteOne, setPortOver, newLink}) {
    const {id, x, y, fill, stroke, parent, name} = this;
    const {scale} = this.parent.getTopState();
    return hcircle({'class': 'port', id: id, cx: x, cy: y, r: 5, fill, stroke,
      //onmousedown: this.dragMouseDown(actions)
      onmouseover: e => {
        // console.log({id: parent.id, portOver: name});
        setIt({id: parent.id, portOver: name});
        setPortOver(this);
      },
      onmouseout: e => {
        setIt({id: parent.id, portOver: null});
        setPortOver(null);
      },
      onmousedown: startDragOnMouseDown(
        e => {
          const [dx, dy] = [x - e.x, y - e.y];
          // console.log('port down!', this);
          newOne(['FakeNode', {
            id: '__fakeNode', dragging: true, x, y, r: 10
          }]);
          newOne(['DirectLink', {
            id: '__newLink', from: parent.id, fromPort: name, to: '__fakeNode'
          }]);
          return {dx, dy};
        },
        (e, {dx, dy}) => {
          setIt({id: '__fakeNode', x: snap(dx + e.x), y: snap(dy + e.y)});
        },
        e => {
          const [from, fromPort] = [this.parent.id, this.name];
          newLink({from, fromPort});
          deleteOne({id: '__fakeNode'});
          deleteOne({id: '__newLink'});
        },
        mangleScale(scale),
      ),
    });
  }
}

class Node extends Elem {
  constructor (data) {
    super(data);
    const {x, y, dragging, portOver} = this.state;
    Object.assign(this, {x, y, dragging, portOver});
    this.ports = [];
  }
  addPort(state) {
    const name = state.name || this.ports.length;
    //console.log({name, po: this.portOver, a: name === this.portOver});
    this.ports.push(new Port(this, {...state, name, isOver: name === this.portOver}));
  }
  dragMouseDown({setIt, selectOne, deleteOne}) {
    const {id, x, y} = this;
    const {scale} = this.getTopState();
    return startDragOnMouseDown(
      e => {
        const [dx, dy] = [x - e.x, y - e.y];
        setIt({id, dragging: true});
        return {dx, dy};
      },
      (e, {dx, dy}) => {
        setIt({id, x: snap(dx + e.x), y: snap(dy + e.y)});
      },
      (e, {dx, dy}) => {
        setIt({id, dragging: false});
        const [dx1, dy1] = [x - e.x, y - e.y];
        if (dx1 === dx && dy1 === dy) {
          console.log(this.id, 'click');
          selectOne({id});
          if (e.shiftKey) {
          }
        }
      },
      mangleScale(scale),
    );
  }
  onDelete({deleteOne, selectOne}) {
    const {id} = this;
    deleteOne({id});
    selectOne({id: null}); 
    Object.values(this.all)
      .filter(elem => elem instanceof Link && elem.from === id || elem.to === id)
      .map(deleteOne)
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
  constructor (data) {
    super(data);
    this.portOver = 0;
    this.addPort({dx: 0, dy: -2, fill: 'none'});
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
  constructor(data) {
    super(data);
    const {r, fill} = this.state;
    Object.assign(this, {r, fill});
    this.addPort({dx: -r, dy: 0});
    this.addPort({dx: +r, dy: 0});
    this.addPort({dx: 0, dy: -r});
    this.addPort({dx: 0, dy: +r});
  }
  renderSVG(actions) {
    const {id, x, y, r, fill, dragging} = this;
    return hg({}, 
      hcircle({id: id, cx: x, cy: y, r, fill, stroke: dragging ? 'black' : '#444', 'stroke-width': this.isSelected() ? 5 : dragging ? 2 : 1,
        onmousedown: this.dragMouseDown(actions),
        onclick: e => console.log(e), //this.mainClick(actions),
      }),
      htext({'text-anchor': 'middle', x, y, dy: 0, textLength: 2*r, 'dominant-baseline': 'middle'}, '. ' + id + ' .'),
      this.ports.map(port => port.renderSVG(actions)),
    );
  }
}

class Link extends Elem {
  constructor (data) {
    super(data);
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
  renderSVG({setIt, selectOne}) {
    const {id, state: {over}} = this;
    const [from, to] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    const dragging = this.isDragging();
    return hg({},
      hpath({
        id: id, 'marker-mid': 'url(#markerCross)',
        d: `M${from.x} ${from.y} C${from.x + from.dx} ${from.y + from.dy}
        ${to.x + to.dx} ${to.y + to.dy} ${to.x} ${to.y}`,
        stroke: dragging ? 'black' : 'grey', fill: 'none', 'stroke-width': this.isSelected() ? 5 : dragging || over ? 2 : 1,
        onmouseover: e => {
          setIt({id, over: true})
        },
        onmouseout: e => setIt({id, over: false}),
        onclick: e => {
          selectOne({id});
        },
      }),
      htext({'text-anchor': 'middle', dy: -2},
        htextPath({startOffset: '50%', href: '#' + this.id}, this.id)
      ),
    );
  }
}

const ELEM_CLASSES = {
  Circle,
  DirectLink,
  FakeNode,
  TopState,
};

const view = ({elems}, actions) => {
  // console.log({elems});
  const all = {};
  for (const [id, data] of Object.entries(elems)) {
    if (!data) continue;
    const [_t, state = {}] = data;
    const Cls = ELEM_CLASSES[_t];
    if (!Cls) console.error({_t, id});
    all[id] = new Cls({id, state, all});
  }
  const {tx, ty, scale, currentElem} = all.__topState;
  const {selectOne, setTopState} = actions.elems;
  document.onkeydown = e => {
    // console.log('dkd', e);
    if (e.key === 'Backspace') {
      const elemId = all.__topState.currentElem;
      if (elemId) {
        const elem = all[elemId];
        elem.onDelete(actions.elems);
      }
    }
  }
  return hdiv({
      id: 'theDIV',
      onkeydown: e => console.log('kd', e),
    },
    hdiv({id: 'editor'},
      all[currentElem].renderEditor(actions.elems),
    ),
    hsvg({width: '800px', height: '800px', style: 'border: 1px solid red'},
      hdefs({},
        hmarker({id: 'markerCross', viewBox: '0 0 20 20', refX: 10, refY: 10, markerWidth: 20, markerHeight: 10},
          hcircle({cx: 10, cy: 10, r: 10, fill: 'red', stroke: 'none'}),
          hpath({d: 'M3 3 L17 17 M3 17 L17 3', fill: 'none', stroke: 'yellow'}),
        )
      ),
      h('rect', {
        x: 0, y: 0, width: 800, height: 800, fill: '#EEE', stroke: 'black',
        // onclick: e => selectOne({id: null}),
        // onkeydown: e => console.log(e),
        onmousedown: startDragOnMouseDown(
          e => {
            const [dx, dy] = [tx - e.x, ty - e.y];
            return {dx, dy};
          },
          (e, {dx, dy}) => {
            setTopState({tx: e.x + dx, ty: e.y + dy});
          },
          (e, {dx, dy}) => {
            const [dx1, dy1] = [tx - e.x, ty - e.y];
            console.log(dx1, dy1, dx, dy);
            if (dx1 === dx && dy1 === dy) {
              console.log('select none');
              selectOne({id: null});
            }
          },
        )
      }),
      hg({transform: `translate(${tx + 0.5}, ${ty + 0.5}) scale(${scale})`},
        [0, 1, 2, 3].map(layer => 
          hg({},
            Object.keys(elems)
              .map(id => all[id])
              .filter(x => x)
              .filter(elem => elem.getLayer() === layer)
              .map(elem => elem.renderSVG(actions.elems)),
          )
        )
      )
    )
  );
}

app(state, actions, view, document.getElementById('test'));


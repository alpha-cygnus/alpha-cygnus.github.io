import { startDragOnMouseDown, mangleScale, snap } from './utils.js';
import { Port } from './ports.js';

export class Elem {
  constructor ({id, state, all}) {
    this.id = id;
    this.state = state;
    this.all = all;
  }
  renderSVG(h, actions) {
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
  renderEditor(h, actions) {
    return h('div', {},
      h('h1', {}, this.id),
      h('pre', {}, JSON.stringify(this.state, null, '  ')),
      h('button', {
        onclick: e => {
          this.onDelete(actions);
          actions.selectOne({id: null});
        },
      }, 'DEL'),
    );
  }
}

export class Node extends Elem {
  constructor (data) {
    super(data);
    const {x, y, $dragging, portOver} = this.state;
    Object.assign(this, {x, y, $dragging, portOver});
    this.ports = [];
  }
  addPort(state) {
    const name = state.name || this.ports.length;
    this.ports.push(new Port(this, {...state, name, isOver: name === this.portOver}));
  }
  dragMouseDown({setIt, selectOne, deleteOne}) {
    const {id, x, y} = this;
    const {scale} = this.getTopState();
    return startDragOnMouseDown(
      e => {
        const [dx, dy] = [x - e.x, y - e.y];
        setIt({id, $dragging: true});
        return {dx, dy};
      },
      (e, {dx, dy}) => {
        setIt({id, x: snap(dx + e.x), y: snap(dy + e.y)});
      },
      (e, {dx, dy}) => {
        setIt({id, $dragging: false});
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
    return this.$dragging;
  }
  getLayer() {
    return this.isDragging() ? 3 : 1;
  }
  getPort(portId) {
    return this.ports[portId] || this.ports.find(({name}) => name === portId);
  }
  renderPorts(h, actions) {
    return this.ports.map(port => port.renderSVG(h, actions));
  }
  renderEditor(h, actions) {
    return h('div', {},
      h('h1', {}, this.id),
      h('pre', {}, JSON.stringify({...this.state,
        ports: this.ports.map(({state, atx, aty, cx, cy, dx, dy}) => ({state, atx, aty, cx, cy, dx, dy}))}, null, '  ')),
      h('button', {
        onclick: e => {
          this.onDelete(actions);
          actions.selectOne({id: null});
        },
      }, 'DEL'),
    );
  }
}

export class Link extends Elem {
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
    return from.$dragging || to.$dragging;
  }
  getLayer() {
    return this.isDragging() ? 2 : 0;
  }
}


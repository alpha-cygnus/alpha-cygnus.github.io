import { startDragOnMouseDown, mangleScale, snap, makeObject } from './utils.js';
import * as PORT_CLASSES from './ports.js';
import * as PARAM_CLASSES from './params.js';

export class Elem {
  constructor ({id, state, parent}) {
    this.id = id;
    this.state = state;
    this.all = parent.all;
    this.parent = parent;
  }
  initProps() {
  }
  renderSVG(h, actions) {
  }
  getLayer() {
    return this.layer || 0;
  }
  isSelected() {
    return this.getTopState().$currentElem === this.id;
  }
  onDelete({deleteElem, selectElem}) {
    const {id} = this;
    deleteElem({id});
    selectElem({id: null}); 
  }
  getTopState() {
    return this.parent.state;
  }
  renderEditor(h, actions) {
    return h('div', {},
      h('h1', {}, this.id),
      h('pre', {}, JSON.stringify(this.state, null, '  ')),
      h('button', {
        onclick: e => {
          this.onDelete(actions);
          actions.selectElem({id: null});
        },
      }, 'DEL'),
    );
  }
  renderGraph(idPrefix) {
    return [];
  }
  *gen() {
  }
  genGraph(h) {
    return [];
  }
}

export class Node extends Elem {
  initProps() {
    const {x, y, $dragging, $portOver} = this.state;
    const undeletable = this.parent.isUndeletable(this);
    Object.assign(this, {x, y, $dragging, $portOver, undeletable});
    this.ports = [];
  }
  getParamList() {
    return [];
  }
  // getControls() {
  //   return [];
  // }
  addPort(data) {
    const [_t, state] = data;
    const name = state.name;
    const PortClass = PORT_CLASSES[`${_t}Port`];
    this.ports.push(new PortClass(this, {...state, isOver: name === this.$portOver}));
  }
  dragMouseDown(actions) {
    const {setElemProps, selectElem, deleteElem, newLink} = actions;
    const {id, x, y} = this;
    const {scale, $currentElem} = this.getTopState();
    return startDragOnMouseDown(
      e => {
        const [dx, dy] = [x - e.x, y - e.y];
        setElemProps({id, $dragging: true});
        return {dx, dy};
      },
      (e, {dx, dy}) => {
        setElemProps({id, x: snap(dx + e.x), y: snap(dy + e.y)});
      },
      (e, {dx, dy}) => {
        setElemProps({id, $dragging: false});
        const [dx1, dy1] = [x - e.x, y - e.y];
        if (dx1 === dx && dy1 === dy) {
          if (e.original.metaKey && e.original.altKey) {
            return this.onDelete(actions);
          }
          if ($currentElem && (e.original.ctrlKey || e.original.altKey)) {
            const [from, fromPort = 'out'] = $currentElem.split('.');
            newLink({from, fromPort, to: id, toPort: 'inp', all: this.all});
          }
          if (!e.original.shiftKey) {
            selectElem({id});
          }
        }
      },
      mangleScale(scale),
    );
  }
  onDelete({deleteElem, selectElem}) {
    if (this.undeletable) return;
    const {id} = this;
    deleteElem({id});
    selectElem({id: null}); 
    deleteElem({from: id});
    deleteElem({to: id});
    // Object.values(this.all)
    //   .filter(elem => elem instanceof Link && elem.from === id || elem.to === id)
    //   .map(({from, fromPort, to, toPort}) => deleteElem({from, fromPort, to, toPort}));
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
  getParamValue(name) {
    return typeof this[name] === 'undefined' ? this.state[name] : this[name];
  }
  renderEditor(h, actions) {
    const pars = this.getParamList();
    return h('div', {},
      h('h1', {}, this.id),
      pars
        .map(par => makeObject(PARAM_CLASSES, par))
        .map(par => par.render(
          h, actions, this.getParamValue(par.name),
        )),
      h('pre', {}, JSON.stringify({...this.state,
        ports: this.ports.map(({state, atx, aty, cx, cy, dx, dy}) => ({state, atx, aty, cx, cy, dx, dy}))}, null, '  ')),
      h('button', {
        onclick: e => {
          this.onDelete(actions);
          actions.selectElem({id: null});
        },
      }, 'DEL'),
    );
  }
}

export class Link extends Elem {
  constructor(data) {
    super(data);
    const {from, fromPort, to, toPort} = this.state;
    this.id = `l${from}.${fromPort}-${to}.${toPort}`;
    Object.assign(this, {from, fromPort, to, toPort});
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

export class ProjectPart {
  constructor(parent, props, elems) {

  }
}

export class SongPart {
  constructor (parent, props) {
    this.props = props;
    const pl = this.getParentList();
    if (pl && Array.isArray(parent[pl])) parent[pl][props.x] = this;
    Object.assign(this, props);
    this.parent = parent;
  }
  getParentList() {
    return '';
  }
}

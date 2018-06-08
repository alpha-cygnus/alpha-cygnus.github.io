import { startDragOnMouseDown, mangleScale, snap, isDef } from './utils.js';

export const PORT_DIR_IN = 'in';
export const PORT_DIR_OUT = 'out';
export const PORT_KIND_AUDIO = 'audio';
export const PORT_KIND_CONTROL = 'control';

export const PORT_DEF_NAME = {
  [PORT_DIR_IN]: 'inp',
  [PORT_DIR_OUT]: 'out',
}

export class Port {
  constructor(parent, state) {
    this.parent = parent;
    this.state = state;
    const r = 5;
    this.r = r;
    const {name, x, y, dir = PORT_DIR_IN, kind = PORT_KIND_AUDIO, isOver, fill} = {...this.getDefState(), ...state};
    const nx = isDef(this.state.nx) ? this.state.nx : x*2;
    const ny = isDef(this.state.ny) ? this.state.ny : y*2;
    const nx1 = nx ? nx/Math.abs(nx) : 0;
    const ny1 = ny ? ny/Math.abs(ny) : 0;
    Object.assign(this, {name, x, y, nx, ny, dir, kind, isOver});
    this.cx = parent.x + x + nx1*r;
    this.cy = parent.y + y + ny1*r;
    this.atx = this.cx + nx1*r;
    this.aty = this.cy + ny1*r;
    this.fill = fill || (dir === PORT_DIR_OUT ? 'red' : 'green');
    this.id = parent.id + '.' + name;
  }
  getDefState() {
    return {};
  }
  renderSVG(h, {setElemProps, newElem, deleteElem, setPortOver, newLink, selectElem}) {
    const {id, cx, cy, r, fill, parent, name, isOver} = this;
    const {$currentElem} = this.parent.parent;
    const isSelected = $currentElem === this.id;
    const stroke = isSelected || isOver ? 'black' : 'grey';
    const strokeWidth = isSelected ? 3 : 1;
    const all = this.parent.all;
    const {scale} = this.parent.getTopState();
    return h('circle', {'class': 'port', id: this.getDotId(), cx, cy, r, fill, stroke, 'stroke-width': strokeWidth,
      onmouseover: e => {
        setElemProps({id: parent.id, $portOver: name});
        setPortOver(this);
      },
      onmouseout: e => {
        setElemProps({id: parent.id, $portOver: null});
        setPortOver(null);
      },
      onmousedown: startDragOnMouseDown(
        e => {
          const [dx, dy] = [cx - e.x, cy - e.y - 5];
          // newElem(['TempNewLink', {
          //   id: '__newLink', from: parent.id, fromPort: name, x: cx, y: cy,
          // }]);
          return {dx, dy};
        },
        (e, {dx, dy}) => {
          // setElemProps({id: '__newLink', x: dx + e.x, y: dy + e.y});
        },
        (e, {dx, dy}) => {
          const [dx1, dy1] = [cx - e.x, cy - e.y - 5];
          if (dx1 === dx && dy1 === dy) {
            if (e.original.metaKey && e.original.altKey) {
              deleteElem({from: this.parent.id, fromPort: this.name});
              deleteElem({to: this.parent.id, toPort: this.name});
              return;
            }
            if ($currentElem && (e.original.ctrlKey || e.original.altKey || $currentElem.match(/\w+\.\w+/))) {
              const [from, fromPort = 'out'] = $currentElem.split('.');

              newLink({from, fromPort, to: this.parent.id, toPort: this.name, all: this.parent.all});
              console.log('E', e);
              if (!e.original.shiftKey) selectElem({id: null});
            } else {
              selectElem({id: this.id});
            }
            return;
          }

          // const [from, fromPort] = [this.parent.id, this.name];
          // newLink({from, fromPort, all});
          // // deleteElem({id: '__fakeNode'});
          // deleteElem({id: '__newLink'});
        },
        mangleScale(scale),
      ),
    });
  }
  getLinkClass() {
    return 'AudioLink';
  }
  connectError(otherPort) {
    if (otherPort.kind !== this.kind) return ['kind mismatch'];
    if (otherPort.dir === this.dir) return ['int/out mismatch'];
    if (this.dir === PORT_DIR_IN) return ['SWAP'];
    return ['', this.getLinkClass()];
  }
  getDesc() {
    const {name, kind, dir} = this;
    return `${name} [${kind}/${dir}]`;
  }
  // getIdsForLink(idPrefix) {
  //   return [];
  // }
  getDotId() {
    return [this.parent.id, this.name].join('.');
  }
  renderEditor(h, actions) {
    return h('div', {}, 'PORT ' + this.name);
  }
}

export class AudioPort extends Port {}

export class AudioInPort extends AudioPort {
  getDefState() {
    return {dir: PORT_DIR_IN, kind: PORT_KIND_AUDIO};
  }
}

export class AudioOutPort extends AudioPort {
  getDefState() {
    return {dir: PORT_DIR_OUT, kind: PORT_KIND_AUDIO};
  }
}

export class ControlPort extends Port {
  getLinkClass() {
    return 'ControlLink';
  }
}

export class ControlInPort extends ControlPort {
  getDefState() {
    return {dir: PORT_DIR_IN, kind: PORT_KIND_CONTROL};
  }
}

export class ControlOutPort extends ControlPort {
  getDefState() {
    return {dir: PORT_DIR_OUT, kind: PORT_KIND_CONTROL};
  }
}


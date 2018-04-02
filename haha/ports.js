import { startDragOnMouseDown, mangleScale, snap, isDef } from './utils.js';

export const PORT_DIR_IN = 'in';
export const PORT_DIR_OUT = 'out';
export const PORT_KIND_AUDIO = 'audio';
export const PORT_KIND_PARAM = 'param';

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
    const {name, x, y, dir = PORT_DIR_IN, kind = PORT_KIND_AUDIO, isOver, fill} = this.state;
    const nx = isDef(this.state.nx) ? this.state.nx : x*2;
    const ny = isDef(this.state.ny) ? this.state.ny : y*2;
    const nx1 = nx ? nx/Math.abs(nx) : 0;
    const ny1 = ny ? ny/Math.abs(ny) : 0;
    Object.assign(this, {name, x, y, nx, ny, dir, kind});
    this.cx = parent.x + x + nx1*r;
    this.cy = parent.y + y + ny1*r;
    this.atx = this.cx + nx1*r;
    this.aty = this.cy + ny1*r;
    this.fill = fill || (dir === PORT_DIR_OUT ? 'red' : 'green');
    this.stroke = isOver ? 'black' : 'grey';
    this.id = parent.id + '.' + name;
  }
  renderSVG(h, {setElemProps, newElem, deleteElem, setPortOver, newLink}) {
    const {id, cx, cy, r, fill, stroke, parent, name} = this;
    const all = this.parent.all;
    const {scale} = this.parent.getTopState();
    return h('circle', {'class': 'port', id: id, cx, cy, r, fill, stroke,
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
          newElem(['TempNewLink', {
            id: '__newLink', from: parent.id, fromPort: name, x: cx, y: cy,
          }]);
          return {dx, dy};
        },
        (e, {dx, dy}) => {
          setElemProps({id: '__newLink', x: dx + e.x, y: dy + e.y});
        },
        e => {
          const [from, fromPort] = [this.parent.id, this.name];
          newLink({from, fromPort, all});
          // deleteElem({id: '__fakeNode'});
          deleteElem({id: '__newLink'});
        },
        mangleScale(scale),
      ),
    });
  }
  connectError(otherPort) {
    if (otherPort.kind !== this.kind) return ['kind mismatch'];
    if (otherPort.dir === this.dir) return ['int/out mismatch'];
    if (this.dir === PORT_DIR_IN) return ['SWAP'];
    return ['', 'AudioLink'];
  }
  getDesc() {
    const {name, kind, dir} = this;
    return `${name} [${kind}/${dir}]`;
  }
  getIdsForLink(idPrefix) {
    return [];
  }
}

export class AudioPort extends Port {
  getIdsForLink(idPrefix) {
    const idSuffix = this.name === PORT_DEF_NAME[this.dir] ? '' : '.' + this.name;
    return [idPrefix + this.parent.id + idSuffix];
  }
}

export class ModulePort extends Port {
  getIdsForLink(idPrefix) {
    const source = this.parent.getSource();
    const result = [];
    for (let fromPort in source.links.from[this.name]) {
      for (const {to, toPort} of source.links.from[this.name][fromPort]) {
        const port = source.all[to].getPort(toPort);
        result.push(...port.getIdsForLink(idPrefix + this.parent.id + '$'));
      }
    };
    for (let toPort in source.links.to[this.name]) {
      for (const {from, fromPort} of source.links.to[this.name][toPort]) {
        const port = source.all[from].getPort(fromPort);
        result.push(...port.getIdsForLink(idPrefix + this.parent.id + '$'));
      }
    };
    // if (!node) {
    //   console.error(`node id ${this.name} not found`);
    //   return [];
    // }
    return result;
  }
}
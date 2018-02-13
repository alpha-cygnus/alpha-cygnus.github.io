import { startDragOnMouseDown, mangleScale, snap } from './utils.js';

export class Port {
  constructor(parent, state) {
    this.parent = parent;
    this.state = state;
    const r = 5;
    this.r = r;
    const {name, x, y, dir = 'i', kind = 'a', isOver, fill} = this.state;
    const dx = this.state.dx || x*3;
    const dy = this.state.dy || y*3;
    const dx1 = dx ? dx/Math.abs(dx) : 0;
    const dy1 = dy ? dy/Math.abs(dy) : 0;
    Object.assign(this, {name, x, y, dx, dy, dir, kind});
    this.cx = parent.x + x + dx1*r;
    this.cy = parent.y + y + dy1*r;
    this.atx = this.cx + dx1*r;
    this.aty = this.cy + dy1*r;
    this.fill = fill || (dir === 'i' ? 'red' : 'green');
    this.stroke = isOver ? 'black' : 'grey';
    this.id = parent.id + '.' + name;
  }
  renderSVG(h, {setIt, newOne, deleteOne, setPortOver, newLink}) {
    const {id, cx, cy, r, fill, stroke, parent, name} = this;
    const {scale} = this.parent.getTopState();
    return h('circle', {'class': 'port', id: id, cx, cy, r, fill, stroke,
      onmouseover: e => {
        setIt({id: parent.id, portOver: name});
        setPortOver(this);
      },
      onmouseout: e => {
        setIt({id: parent.id, portOver: null});
        setPortOver(null);
      },
      onmousedown: startDragOnMouseDown(
        e => {
          const [dx, dy] = [cx - e.x, cy - e.y];
          newOne(['FakeNode', {
            id: '__fakeNode', dragging: true, x: cx, x: cy, r: 10
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
  connectError(otherPort) {
    if (otherPort.kind == this.kind && otherPort.dir != this.dir) return '';
    return 'cannot connect';
  }
}


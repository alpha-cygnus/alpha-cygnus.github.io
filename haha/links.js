import { Link } from './base.js';

export class DirectLink extends Link {
  renderSVG(h, {setElemProps, selectElem}) {
    const {id, state: {over}} = this;
    const [from, to] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    const dragging = this.isDragging();
    return h('g', {},
      h('path', {
        id: id, 'marker-mid': 'url(#markerCross)',
        d: `M${from.atx} ${from.aty} C${from.atx + from.dx} ${from.aty + from.dy}
        ${to.atx + to.dx} ${to.aty + to.dy} ${to.atx} ${to.aty}`,
        stroke: dragging ? 'black' : 'grey', fill: 'none', 'stroke-width': this.isSelected() ? 5 : dragging || over ? 2 : 1,
        onmouseover: e => {
          setElemProps({id, over: true})
        },
        onmouseout: e => setElemProps({id, over: false}),
        onclick: e => {
          selectElem({id});
        },
      }),
      // h('text', {'text-anchor': 'middle', dy: -2},
      //   h('textPath', {startOffset: '50%', href: '#' + this.id}, this.id)
      // ),
    );
  }
}

export class TempNewLink extends Link {
  isDragging() {
    return true;
  }
  renderSVG(h, {setElemProps, selectElem}) {
    const {id, state: {x, y}} = this;
    const from = this.all[this.from].getPort(this.fromPort)
    const dragging = this.isDragging();
    return h('g', {},
      h('path', {
        id: id,
        d: `M${from.atx} ${from.aty} C${from.atx + from.dx} ${from.aty + from.dy}
        ${x} ${y} ${x} ${y}`,
        stroke: 'black', fill: 'none', 'stroke-width': 2,
      }),
    );
  }
}
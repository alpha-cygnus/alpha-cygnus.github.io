import { Link } from './base.js';

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
        d: `M${from.atx} ${from.aty} C${from.atx + from.nx} ${from.aty + from.ny}
        ${x} ${y} ${x} ${y}`,
        stroke: 'black', fill: 'none', 'stroke-width': 2,
      }),
    );
  }
}

export class ALink extends Link {
  renderSVG(h, {setElemProps, selectElem}) {
    const {id, state: {over}} = this;
    const [from, to] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    if (!from) {
      console.error('no from in', id);
    }
    if (!to) {
      console.error('no to in', id);
    }
    const dragging = this.isDragging();
    return h('g', {},
      h('path', {
        id: id,
        //'marker-mid': 'url(#markerCross)',
        d: `M${from.atx} ${from.aty} C${from.atx + from.nx} ${from.aty + from.ny}
        ${to.atx + to.nx} ${to.aty + to.ny} ${to.atx} ${to.aty}`,
        stroke: dragging ? 'black' : 'grey', fill: 'none', 'stroke-width': this.isSelected() ? 5 : dragging || over ? 2 : 1,
        onmouseover: e => {
          setElemProps({id, over: true})
        },
        onmouseout: e => setElemProps({id, over: false}),
        onclick: e => {
          selectElem({id});
        },
      }),
      h('text', {'text-anchor': 'start', dy: -2},
        h('textPath', {startOffset: '0%', href: '#' + this.id}, this.fromPort === 'out' ? '' : this.fromPort)
      ),
      h('text', {'text-anchor': 'end', dy: -2},
        h('textPath', {startOffset: '100%', href: '#' + this.id}, this.toPort === 'inp' ? '' : this.toPort)
      ),
    );
  }
}

export class AudioLink extends ALink {
}
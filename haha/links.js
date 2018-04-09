import { Link } from './base.js';
import { flatten } from './utils.js';
import { PatchPortNode } from './nodes.js';

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
  getFromTo() {
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
    return [from, to];
  }
  renderSVG(h, {setElemProps, selectElem}) {
    const [from, to] = this.getFromTo();
    const {id, state: {over}} = this;
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
      this.fromPort === 'out' ? null
      : h('text', {'text-anchor': 'start', dy: -2},
        h('textPath', {startOffset: '0%', href: '#' + this.id}, this.fromPort)
      ),
      this.toPort === 'inp' ? null
      : h('text', {'text-anchor': 'end', dy: -2},
        h('textPath', {startOffset: '100%', href: '#' + this.id}, this.toPort)
      ),
    );
  }
  renderGraph(idPrefix) {
    if (this.all[this.from] instanceof PatchPortNode) return [];
    if (this.all[this.to] instanceof PatchPortNode) return [];
    //console.log(this.id);
    const [f, t] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    const fs = f.getIdsForLink(idPrefix);
    const ts = t.getIdsForLink(idPrefix);
    return flatten(fs.map(from => ts.map(to => ['Link', {from, to}])));
  }
}

export class AudioLink extends ALink {
  *gen() {
    const [from, to] = this.getFromTo();
    yield `${from.getDotId()}.connect(${to.getDotId()});`;
  }
}
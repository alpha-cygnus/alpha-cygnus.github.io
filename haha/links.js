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
    const [fe, te] = [
      this.all[this.from],
      this.all[this.to],
    ];
    if (!fe) throw new Error('from not found: ', this.from);
    if (!te) throw new Error('to not found: ', this.to);
    const [from, to] = [
      fe.getPort(this.fromPort),
      te.getPort(this.toPort),
    ];
    if (!from) {
      console.error('no from in', this.id);
    }
    if (!to) {
      console.error('no to in', this.id);
    }
    return [from, to];
  }
  getStroke() {
    return {
      stroke: this.isDragging() ? 'black' : 'grey',
    }
  }
  renderSVG(h, {setElemProps, setPatchState, selectElem}) {
    const [from, to] = this.getFromTo();
    const {id} = this;
    const over = this.parent.state.$currentOver === id;
    const dragging = this.isDragging();
    return h('g', {},
      h('path', {
        id: id,
        //'marker-mid': 'url(#markerCross)',
        d: `M${from.atx} ${from.aty} C${from.atx + from.nx} ${from.aty + from.ny}
        ${to.atx + to.nx} ${to.aty + to.ny} ${to.atx} ${to.aty}`,
        ...this.getStroke(), fill: 'none', 'stroke-width': this.isSelected() ? 5 : dragging || over ? 2 : 1,
        onmouseover: e => {
          setPatchState({$currentOver: id})
        },
        onmouseout: e => setPatchState({$currentOver: null}),
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

export class ControlLink extends ALink {
  getStroke() {
    return {
      ...super.getStroke(),
      'stroke-dasharray': '8, 4, 2, 4, 8',
    }
  }
  *gen() {
    const [from, to] = this.getFromTo();
    yield `${from.getDotId()}.connect(${to.getDotId()});`;
  }
}
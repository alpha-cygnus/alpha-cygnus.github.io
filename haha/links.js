import { Link } from './base.js';

export class DirectLink extends Link {
  renderSVG(h, {setElemProps, selectElem}) {
    const {id, state: {over}} = this;
    const [from, to] = [
      this.all[this.from].getPort(this.fromPort),
      this.all[this.to].getPort(this.toPort),
    ];
    const dragging = this.isDragging();
    console.log(from, to);
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

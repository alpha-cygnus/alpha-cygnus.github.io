import { h, app } from './hyperapp/index.js';

const state = {
  count: 0,
  circles: 
  [
    {
      cx: 100, cy: 100, r: 10,
      fill: 'black',
    },
    {
      cx: 20, cy: 20, r: 20,
      fill: 'black',
    },
  ].reduce((res, c, _i) => ({...res, [_i]: {...c, _i}}), {}),
};

for (const tag of 'div,h1,button,svg,path,circle'.split(',')) {
  window['h' + tag] = (props, ...children) => h(tag, props, children);
}

const actions = {
  down: value => state => ({ count: state.count - value }),
  up: value => state => ({ count: state.count + value }),
  circles: {
    setIt: ({_i, ...it}) => state => ({...state, [_i]: {...state[_i], ...it}}),
  },
};

const startDragOnMouseDown = (ondown, onmove, onup) => e => {
  const data = ondown(e);
  document.onmousemove = e => onmove(e, data);
  document.onmouseup = e => {
    onup(e, data);
    document.onmousemove = null;
    document.onmouseup = null;
  }
}

const Circle = ({_i, cx, cy, r, fill}, {setIt}) =>
  hcircle({cx, cy, r, fill,
    onmousedown: startDragOnMouseDown(
      e => {
        const [dx, dy] = [cx - e.x, cy - e.y];
        console.log(e, dx, dy);
        setIt({_i, fill: 'green'});
        return {dx, dy};
      },
      (e, {dx, dy}) => {
        console.log(e, dx, dy);
        setIt({_i, cx: dx + e.x, cy: dy + e.y});
      },
      e => {
        console.log(e);
        setIt({_i, fill: 'black'})
      }
    ),
  })
;



const view = ({count, circles}, actions) =>
  hdiv({},
    hh1({}, state.count),
    hbutton({ onclick: () => actions.down(1) }, "-"),
    hbutton({ onclick: () => actions.up(1) }, "+"),
    hsvg({width: '200px', height: '200px', style: 'border: 1px solid red'},
      hpath({d: 'M0 0 l 100 100', stroke: 'black', fill: 'none'}),
      Object.entries(circles).map(([_i, c]) => Circle(c, actions.circles)),
    )
  );

app(state, actions, view, document.getElementById('test'));



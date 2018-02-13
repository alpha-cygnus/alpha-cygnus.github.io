import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import * as NODE_CLASSES from './nodes.js';
import * as LINK_CLASSES from './links.js';

const ELEM_CLASSES = {...NODE_CLASSES, ...LINK_CLASSES};

const nodeCount = rnd(10, 10);
const elems = {};
for (let i = 0; i < nodeCount; i++) {
  elems['c' + i] = ['Circle', {
    x: snap(rnd(600)) - 300, y: snap(rnd(600)) - 300,
    r: rnd(20, 10), fill: pick(['red', 'green', 'blue']),
  }];
}

for (let i = 0; i < Math.random()*nodeCount*nodeCount; i++) {
  const f = rnd(nodeCount);
  const fi = pick([2, 3]);
  const t = Math.floor(Math.random()*nodeCount);
  const ti = pick([0, 1]);
  elems[`l${f}.${fi}-${t}.${ti}`] = ['DirectLink', {
    from: `c${f}`, to: `c${t}`, fromPort: fi, toPort: ti,
  }];
}

const state = {
  elems: {
    ...elems,
    __topState: ['TopState', {title: 'Random graph', scale: 1, tx: 0, ty: 0, currentElem: '__topState'}],
  }
};

const actions = {
  elems: {
    setIt: ({id, ...it}) => state => {
      return {...state, [id]: [state[id][0], {...state[id][1], ...it}]};
    },
    newOne: ([_t, {id, ...it}]) => state => ({...state, [id]: [_t, it]}),
    setPortOver: (port) => (state, actions) => {
      if (port) {
        const {parent: {id}, name} = port;
        return actions.setTopState({portOverParent: id, portOverName: name});
      } else {
        return actions.setTopState({portOverParent: null, portOverName: null});
      }
    },
    setTopState: (it) => (state, actions) => {
      return actions.setIt({id: '__topState', ...it});
    },
    newLink: ({from, fromPort, all}) => (state, actions) => {
      const topState = state.__topState[1];
      const {portOverParent, portOverName} = topState;
      if (portOverParent) {
        const [to, toPort] = [portOverParent, portOverName];
        let can = true;
        if (all) {
          const src = all[from].getPort(fromPort);
          const dst = all[to].getPort(toPort);
          const connectError = src && dst && src.connectError(dst);
          if (connectError) {
            return actions.setTopState({lastError: connectError});
          }
        }
        const state = {
          id: `l${from}.${fromPort}-${to}.${toPort}`,
          from, fromPort, to, toPort,
        };
        return actions.newOne(['DirectLink', state]);
      }
      return state;
    },
    deleteOne: ({id}) => state => ({...state, [id]: undefined}),
    selectOne: ({id}) => (state, actions) => {
      if (!id) id = '__topState';
      actions.setTopState({currentElem: id})
    },
  },
};

const view = ({elems}, actions) => {
  const all = {};
  for (const [id, data] of Object.entries(elems)) {
    if (!data) continue;
    const [_t, state = {}] = data;
    const Cls = ELEM_CLASSES[_t];
    if (!Cls) console.error({_t, id});
    all[id] = new Cls({id, state, all});
  }
  const {tx, ty, scale, currentElem} = all.__topState;
  const {selectOne, setTopState} = actions.elems;
  document.onkeydown = e => {
    if (e.key === 'Backspace') {
      const elemId = all.__topState.currentElem;
      if (elemId) {
        const elem = all[elemId];
        elem.onDelete(actions.elems);
      }
    }
  }
  return h('div', {
      id: 'divMain',
      onkeydown: e => console.log('kd', e),
    },
    h('svg', {width: '801px', height: '801px', viewBox: '-400 -400 800 800', style: 'border: 1px solid red'},
      h('rect', {
        x: -400, y: -400, width: 800, height: 800, fill: '#EEE', stroke: 'black',
        onmousedown: startDragOnMouseDown(
          e => {
            const [dx, dy] = [tx - e.x, ty - e.y];
            return {dx, dy};
          },
          (e, {dx, dy}) => {
            setTopState({tx: e.x + dx, ty: e.y + dy});
          },
          (e, {dx, dy}) => {
            const [dx1, dy1] = [tx - e.x, ty - e.y];
            console.log(dx1, dy1, dx, dy);
            if (dx1 === dx && dy1 === dy) {
              console.log('select none');
              selectOne({id: null});
            }
          },
        )
      }),
      h('g', {transform: `translate(${tx + 0.5}, ${ty + 0.5}) scale(${scale})`},
        [0, 1, 2, 3].map(layer => 
          h('g', {},
            Object.keys(elems)
              .map(id => all[id])
              .filter(x => x)
              .filter(elem => elem.getLayer() === layer)
              .map(elem => elem.renderSVG(h, actions.elems)),
          )
        )
      )
    ),
    h('div', {id: 'divProps'},
      all[currentElem].renderEditor(h, actions.elems),
    ),
  );
}

app(state, actions, view, document.body);


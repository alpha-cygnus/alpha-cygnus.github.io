import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import {FullState} from './state.js';

import * as actions from './actions.js';

//import * as asi from './asi/index.js';

const audioLink = (f, t) => {
  const [from, fromPort = 'out'] = f.split('.');
  const [to, toPort = 'inp'] = t.split('.');
  return ['AudioLink', {id: `l${from}.${fromPort}-${to}.${toPort}`, from, fromPort, to, toPort}];
}

const fullState = [
    'FullState',
    {
      currentModule: 'main',
    },
    ['Module',
      {
        id: 'main',
        title: 'Main',
        scale: 1,
        tx: 0,
        ty: 0,
      },
      ['Gain', {id: 'gain0', x: 0, y: 0}],
      ['Osc', {id: 'osc0', x: -150, y: 150, type: 'sine'}],
      ['Osc', {id: 'osc1', x: -150, y: 0, type: 'triangle'}],
      ['Osc', {id: 'osc2', x: -150, y: -150, type: 'square'}],
      ['Const', {id: 'const0', x: 0, y: -150, value: 0.2}],
      ['ModuleInput', {id: 'inp', x: -350, y: 0, kind: 'audio'}],
      ['ModuleOutput', {id: 'out', x: +350, y: 0, kind: 'audio'}],
      ['ModuleInstance', {id: 'flt4', x: +200, y: 0, moduleId: 'lowpass4'}],
      audioLink('osc0', 'gain0'),
      audioLink('osc1', 'gain0'),
      audioLink('osc2', 'gain0'),
      audioLink('const0', 'gain0.gain'),
    ],
    ['Module',
      {
        id: 'lowpass4',
        title: '4 Lowpass filters',
        scale: 1,
        tx: 0,
        ty: 0,
      },
      ['Filter', {id: 'filter0', x: -200, y: 0, type: 'lowpass'}],
      ['Filter', {id: 'filter1', x: -100, y: 0, type: 'lowpass'}],
      ['Filter', {id: 'filter2', x: 0,   y: 0, type: 'lowpass'}],
      ['Filter', {id: 'filter3', x: 100,  y: 0, type: 'lowpass'}],
      ['Gain', {id: 'gain0', x: 200,  y: 0}],
      ['ModuleInput', {id: 'inp', x: -350, y: 0, kind: 'audio'}],
      ['ModuleInput', {id: 'freq', x: -250, y: -150, kind: 'audio'}],
      ['ModuleInput', {id: 'Q', x: -250, y: 150, kind: 'audio'}],
      //['ModuleInput', {id: 'gain', x: 100, y: -150, kind: 'audio'}],
      ['ModuleOutput', {id: 'out', x: +350, y: 0, kind: 'audio'}],
      audioLink('inp', 'filter0'),
      audioLink('filter0', 'filter1'),
      audioLink('filter1', 'filter2'),
      audioLink('filter2', 'filter3'),
      audioLink('filter3', 'gain0'),
      audioLink('gain0', 'out'),
      audioLink('freq', 'filter0.freq'),
      audioLink('freq', 'filter1.freq'),
      audioLink('freq', 'filter2.freq'),
      audioLink('freq', 'filter3.freq'),
      audioLink('Q', 'filter0.Q'),
      audioLink('Q', 'filter1.Q'),
      audioLink('Q', 'filter2.Q'),
      audioLink('Q', 'filter3.Q'),
      //audioLink('gain', 'gain0.gain'),
    ],
  ]
;

const view = (state, actions) => {
  const fullState = new FullState(state);
  const module = fullState.currentModule;
  const {$currentElem, $lastError, $portOverParent, $portOverName} = module.state;
  let status = h('span');
  const {setModuleState} = actions;
  if ($lastError) {
    status = [
      h('span', {
        class: 'x',
        onclick: e => setModuleState({$lastError: null}),
      }, 'x'),
      h('span', {class: 'error'}, $lastError),
    ];
  }
  else if ($portOverParent) {
    const port = module.all[$portOverParent].getPort($portOverName);
    status = [
      h('span', {class: 'info'}, port.getDesc()),
    ];
  }
  const toEdit = $currentElem ? module.all[$currentElem] : module;
  return h('div', {},
    h('div',
      {
        id: 'divMain',
        onkeydown: e => console.log('kd', e),
      },
      h('svg', {width: '801px', height: '801px', viewBox: '-400 -400 800 800', style: 'border: 1px solid red'},
        h('defs', {},
          h('pattern', {id: 'gridPattern', x: -5, y: -5, width: 10, height: 10, patternUnits: 'userSpaceOnUse'},
            h('circle', {cx: 5, cy: 5, r: 1, fill: '#CCC', stroke: 'none'})
          )
        ),
        module.renderSVG(h, actions, [-400, -400, 800, 800]),
      ),
      h('div', {id: 'divProps'},
        toEdit.renderEditor(h, actions),
      ),
    ),
    h('div', {id: 'divStatus'}, status),
  );
}

// const ctx = new AudioContext();
// async function logAsync(values) {
//   for await (const v of values) {
//     console.log(v);
//   }
// }

// const bodyClicks = asi.fromEventLast(document.body, 'click');
// const bodyKeys = asi.fromEventLast(document.body, 'keydown');

// //logAsync(asi.sampleBy(tks, bodyKeys, bodyClicks));
// logAsync(asi.take(5, asi.audioTicks(ctx, 3)));

app({fullState}, actions, view, document.body);


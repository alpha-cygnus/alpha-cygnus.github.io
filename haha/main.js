import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import {FullState} from './state.js';

import * as actions from './actions.js';

import * as asi from './asi/index.js';

const directLink = (from, fromPort, to, toPort) => ['DirectLink', {id: `l${from}.${fromPort}-${to}.${toPort}`, from, fromPort, to, toPort}];

function getTestElems() {
  return [
    ['Gain', {id: 'gain0', x: 0, y: 0}],
    ['Osc', {id: 'osc0', x: -150, y: 150, type: 'sine'}],
    ['Osc', {id: 'osc1', x: -150, y: 0, type: 'triangle'}],
    ['Osc', {id: 'osc2', x: -150, y: -150, type: 'square'}],
    ['Const', {id: 'const0', x: 0, y: -150, value: 0.2}],
    ['Filter', {id: 'filter0', x: -250, y: -150, type: 'lowpass'}],
    ['Filter', {id: 'filter1', x: -250, y: -50,  type: 'highpass'}],
    ['Filter', {id: 'filter2', x: -250, y: +50,  type: 'bandpass'}],
    ['Filter', {id: 'filter3', x: -250, y: +150, type: 'notch'}],
    ['ModuleInput', {id: 'inp', x: -350, y: 0, kind: 'audio'}],
    ['ModuleOutput', {id: 'out', x: +350, y: 0, kind: 'audio'}],
    directLink('osc0', 'out', 'gain0', 'inp'),
    directLink('osc1', 'out', 'gain0', 'inp'),
    directLink('osc2', 'out', 'gain0', 'inp'),
    directLink('const0', 'out', 'gain0', 'gain'),
  ];
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
      ...getTestElems(),
    ]
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


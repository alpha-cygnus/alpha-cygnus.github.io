import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import {FullState} from './state.js';

import * as actions from './actions.js';

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
  // const [_, {currentModule}, ...modules] = fullState;
  // const allModules = modules.map(([_t, props, ...elems]) => new Module(props, elems)).reduce((am, m) => ({...am, [m.id]: m}), {});
  // const module = allModules[currentModule];
  const fullState = new FullState(state);
  const module = fullState.currentModule;
  const {currentElem, $lastError, $portOverParent, $portOverName} = module.state;
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
  const toEdit = currentElem ? module.all[currentElem] : module;
  return h('div', {},
    h('div',
      {
        id: 'divMain',
        onkeydown: e => console.log('kd', e),
      },
      h('svg', {width: '801px', height: '801px', viewBox: '-400 -400 800 800', style: 'border: 1px solid red'},
        module.renderSVG(h, actions, [-400, -400, 800, 800]),
      ),
      h('div', {id: 'divProps'},
        toEdit.renderEditor(h, actions),
      ),
    ),
    h('div', {id: 'divStatus'}, status),
  );
}

app({fullState}, actions, view, document.body);


import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import * as NODE_CLASSES from './nodes.js';
import * as LINK_CLASSES from './links.js';

import * as actions from './actions.js';

import {Module} from './module.js';

const ELEM_CLASSES = {...NODE_CLASSES, ...LINK_CLASSES};

const directLink = (from, fromPort, to, toPort) => (
  {[`l${from}.${fromPort}-${to}.${toPort}`]: ['DirectLink', {from, fromPort, to, toPort}]}
);

function getTestElems() {
  return {
    gain0: ['Gain', {x: 0, y: 0}],
    osc0: ['Oscillator', {x: -150, y: 150, type: 'sine'}],
    osc1: ['Oscillator', {x: -150, y: 0, type: 'triangle'}],
    osc2: ['Oscillator', {x: -150, y: -150, type: 'square'}],
    const0: ['Constant', {x: 0, y: -150, value: 0.2}],
    ...directLink('osc0', 'out', 'gain0', 'inp'),
    ...directLink('osc1', 'out', 'gain0', 'inp'),
    ...directLink('osc2', 'out', 'gain0', 'inp'),
    ...directLink('const0', 'out', 'gain0', 'gain'),
  };
}

const state = {
  modules: {
    main: {
      elems: getTestElems(),
      title: 'Main',
      scale: 1,
      tx: 0,
      ty: 0,
      $currentElem: null,
    },
  },
  currentModule: 'main',
};

const view = ({elems, modules, currentModule}, actions) => {
  const module = new Module(currentModule, modules[currentModule]);
  const {currentElem, $lastError, $portOverParent, $portOverName} = modules[currentModule];
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

app(state, actions, view, document.body);


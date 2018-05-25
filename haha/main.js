import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import {NewNode} from './nodes.js';

import {Project} from './project.js';

import {synthKeyDown, synthKeyUp, mainPatchKeyDown, mainPatchKeyUp} from './keys.js';

import * as actions from './actions.js';

import {Synth, MainPatch} from './patches.js';

//import * as asi from './asi/index.js';

import {xl} from './xmllike.js';

const aLink = (f, t, c) => {
  const [from, fromPort = 'out'] = f.split('.');
  const [to, toPort = 'inp'] = t.split('.');
  return [c, {
    // id: `l${from}.${fromPort}-${to}.${toPort}`,
    from, fromPort, to, toPort
  }];
}

const audioLink = (f, t) => aLink(f, t, 'AudioLink');
const controlLink = (f, t) => aLink(f, t, 'ControlLink');

import {Core} from './runtime/core.js';

const core = new Core();

const fullState = [
  'Project',
  {
    currentPatch: 'testSynth',
  },
  [ 'Synth',
    {
      id: 'testSynth',
      title: 'TEST',
      tx: 0,
      ty: 0,
      scale: 1,
    },
    ['Gain', {id: 'gain0', x: 150, y: 0, gain: 0}],
    ['Gain', {id: 'gain1', x: 0, y: 100, gain: 0}],
    ['Osc', {id: 'osc0', x: -150, y: 0, type: 'triangle'}],
    ['ADSR', {id: 'adsr0', x: 0, y: 0, a: 0.5, d: 0.3, s: 0.1, r: 0.5}],
    ['Const', {id: 'const0', x: -100, y: +250, value: 0.2}],
    ['ControlIn', {id: 'control', x: -350, y: -100}],
    ['AudioParam', {id: 'pitch', x: -350, y: 0}],
    ['AudioParam', {id: 'vol', x: -350, y: 100}],
    ['AudioOut', {id: 'out', x: +350, y: 0}],
    ['Delay', {id: 'delay0', x: 100, y: 100}],
    ['Pan', {id: 'pan0', x: 100, y: -100}],
    audioLink('vol', 'gain1'),
    audioLink('const0', 'gain1.gain'),
    audioLink('pitch', 'osc0.pitch'),
    audioLink('osc0', 'adsr0'),
    audioLink('adsr0', 'gain0'),
    audioLink('gain1', 'gain0.gain'),
    audioLink('gain0', 'out'),
    controlLink('control', 'adsr0.control'),
  ],
  [ 'FXPatch',
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
    ['AudioIn', {id: 'inp', x: -350, y: 0, kind: 'audio'}],
    ['AudioParam', {id: 'freq', x: -250, y: -150, kind: 'audio'}],
    ['AudioParam', {id: 'Q', x: -250, y: 150, kind: 'audio'}],
    ['AudioOut', {id: 'out', x: +350, y: 0, kind: 'audio'}],
    audioLink('inp', 'filter0'),
    audioLink('filter0', 'filter1'),
    audioLink('filter1', 'filter2'),
    audioLink('filter2', 'filter3'),
    audioLink('filter3', 'out'),
    audioLink('freq', 'filter0.freq'),
    audioLink('freq', 'filter1.freq'),
    audioLink('freq', 'filter2.freq'),
    audioLink('freq', 'filter3.freq'),
    audioLink('Q', 'filter0.Q'),
    audioLink('Q', 'filter1.Q'),
    audioLink('Q', 'filter2.Q'),
    audioLink('Q', 'filter3.Q'),
  ],
  xl`
  <MainPatch id="main" title="Test" tx=0 ty=0 scale=1>
    <Channel id="channel1" x=-200 y=-150 />
    <Channel id="channel2" x=-200 y=-50 />
    <Channel id="channel3" x=-200 y=+50 />
    <Channel id="channel4" x=-200 y=+150 />
    <Gain id="masterVolume" x=0 y=0 />
    <AudioOut id="out" x=+350 y=0 />
    ${audioLink('channel1', 'masterVolume')}
    ${audioLink('channel2', 'masterVolume')}
    ${audioLink('channel3', 'masterVolume')}
    ${audioLink('channel4', 'masterVolume')}
    ${audioLink('masterVolume', 'out')}
  </MainPatch>
  `,
];

let prevSynthSrc = '';
let prevMainSrc = '';
let mainPatch = null;
let lastSynth = null;

const view = (state, actions) => {
  const {fullState} = state;
  const project = new Project(fullState);
  const patch = project.currentPatch;
  const {$currentElem, $lastError, $portOverParent, $portOverName} = patch.state;
  let status = h('span');
  const {setPatchState} = actions;
  if ($lastError) {
    status = [
      h('span', {
        class: 'x',
        onclick: e => setPatchState({$lastError: null}),
      }, 'x'),
      h('span', {class: 'error'}, $lastError),
    ];
  }
  else if ($portOverParent) {
    const port = patch.all[$portOverParent].getPort($portOverName);
    status = [
      h('span', {class: 'info'}, port.getDesc()),
    ];
  }
  const newNode = new NewNode({state: {x: 350, y: -350, fill: '#C88'}, id: '__new', parent: patch});
  newNode.initProps();
  
  const toEdit = $currentElem === '__new'
    ? newNode
    : patch.getCurrentElem();
  const mainSrc = [...project.main.gen()].join('\n');
  if (mainSrc != prevMainSrc) {
    if (mainPatch) mainPatch.send('cut');
    console.log(mainSrc);
    const mainPatchFunc = new Function('_ctx', mainSrc);
    console.log(mainPatchFunc);
    prevMainSrc = mainSrc;
    mainPatch = mainPatchFunc({core});
    document.onkeydown = mainPatchKeyDown(core, mainPatch, lastSynth);
    document.onkeyup = mainPatchKeyUp(core, mainPatch, lastSynth);
  }
  if (patch instanceof Synth) {
    const synthSrc = [...patch.gen()].join('\n');
    if (synthSrc != prevSynthSrc) {
      const synthFunc = new Function('_ctx', synthSrc);
      console.log(synthFunc);
      prevSynthSrc = synthSrc;
      lastSynth = synthFunc;
    }
    document.onkeydown = synthKeyDown(core, mainPatch, lastSynth);
    document.onkeyup = synthKeyUp(core, mainPatch, lastSynth);
  }
  // document.onkeyup = e => {
  //   if (e.key === 'Backspace' && $currentElem) {
  //     toEdit.onDelete(actions);
  //     // actions.deleteElem({id: $currentElem});
  //   }
  // };
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
        patch.renderSVG(h, actions, [-400, -400, 800, 800]),
        newNode.renderSVG(h, actions),
        // h('g', {transform: 'translate(350, -350)', onclick: e => console.log(e)},
        //   h('circle', {cx: 0, cy: -0, r: 20, fill: 'red'}),
        //   h('path', {d: 'M0 -0 m -15 0 l +30 0 m -15 -15 l 0 30', stroke: 'black', 'stroke-width': 2}),
        // )
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


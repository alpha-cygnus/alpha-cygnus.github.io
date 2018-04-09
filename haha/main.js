import { h, app } from './hyperapp/index.js';

import { snap, rnd, pick, mangleScale, startDragOnMouseDown } from './utils.js';

import {Project} from './project.js';

import {onKeyDown, onKeyUp} from './keys.js';

import * as actions from './actions.js';

//import * as asi from './asi/index.js';

const audioLink = (f, t) => {
  const [from, fromPort = 'out'] = f.split('.');
  const [to, toPort = 'inp'] = t.split('.');
  return ['AudioLink', {id: `l${from}.${fromPort}-${to}.${toPort}`, from, fromPort, to, toPort}];
}

const audio = new AudioContext();

import * as basic from './runtime/basic.js';

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
    ['Gain', {id: 'gain0', x: 150, y: 0}],
    ['Osc', {id: 'osc0', x: -150, y: 0, type: 'triangle'}],
    ['ADSR', {id: 'adsr0', x: 0, y: 0, a: 0.5, d: 0.3, s: 0.1, r: 0.5}],
    ['Const', {id: 'const0', x: 0, y: -150, value: 0.2}],
    ['AudioParam', {id: 'pitch', x: -350, y: 0}],
    ['AudioOut', {id: 'out', x: +350, y: 0}],
    audioLink('const0', 'gain0.gain'),
    audioLink('pitch', 'osc0.pitch'),
    audioLink('osc0', 'adsr0'),
    audioLink('adsr0', 'gain0'),
    audioLink('gain0', 'out'),
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
];

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
  const toEdit = $currentElem ? patch.all[$currentElem] : patch;
  const synthFunc = new Function('_ctx', [...patch.gen()].join('\n'));
  console.log(synthFunc);
  document.onkeydown = onKeyDown(audio, synthFunc);
  document.onkeyup = onKeyUp(audio, synthFunc);
  // document.onkeyup = e => {
  //   if (e.key === 'Backspace' && $currentElem) {
  //     toEdit.onDelete(actions);
  //     // actions.deleteElem({id: $currentElem});
  //   }
  // };
  window.testSynth = (n, v, d, cutAfter) => {
    const synth = synthFunc({audio, basic});
    synth.pitch.value = n - 69;
    console.log(synth.pitch);
    const t = audio.currentTime;
    synth.out.connect(audio.destination);
    synth._on(t);
    synth._off(t + d);
    synth._cut(t + d + (cutAfter || 1));
  }
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


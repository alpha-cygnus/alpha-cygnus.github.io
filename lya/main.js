import {stringifyJsLike, stringifyHsLike, classify} from './lya.js';
import D from 'https://dev.jspm.io/npm:@cycle/dom@22.3.0';
import C from 'https://dev.jspm.io/npm:@cycle/run@5.2.0';
import X from 'https://dev.jspm.io/npm:xstream@11.10.0';

const {default: xs} = X;
//console.log({D, C, xs});
const {div, pre, span, h2, input, label, button} = D;


async function loadText(url) {
  return (await fetch(url)).text();
}

function addLine(txt) {
  const div = document.getElementById('laterm');
  if (!div) return;
  const nl = document.createElement('div');
  nl.innerHTML = txt;
  div.appendChild(nl);
  if (window.MathJax) {
    //MathJax.Hub.Preprocess(nl);
  }
}

let theGrammars = null;

async function main() {
  const grammars = {
    hsLike: {
      text: await loadText('./pegjs/hs-like.pegjs'),
      std: await loadText('./lib/std.hs-like'),
    },
    jsLike: {
      text: await loadText('./pegjs/js-like.pegjs'),
      std: await loadText('./lib/std.js-like'),
    },
  };
  window.grammars = grammars;
  theGrammars = grammars;
  const defs = {};
  for (const [like, gram] of Object.entries(grammars)) {
    const parser = peg.generate(gram.text);
    gram.parse = s => parser.parse(s);
    const gdefs = parser.parse(gram.std);
    console.log(JSON.stringify(defs));
    for (const tn of Object.keys(gdefs)) {
      defs[tn] = classify(gdefs[tn]);
    }
  }
  for (const tn of Object.keys(defs)) {
    defs[tn] = defs[tn].bind(defs);
  }
  for (const tn of Object.keys(defs)) {
    const cf = defs[tn];
    // console.log(tn, '=', cf);
    for (const mode of ['lc', 'hs', 'js']) {
      // console.log(tn + '/' + mode, '=', cf.toStr(mode));
    }
    // console.log(tn + '/db', '=', cf.asDb());
    // addLine('\\( \\mathrm{' + tn + '} = ' + cf.toStr('lc').replace('λ', '\\lambda ') + '\\)');
  }
  const invDefs = {};
  for (const tn of Object.keys(defs)) {
    invDefs[defs[tn].getDbx()] = tn;
  }
  console.log(invDefs);

  const {_:t} = grammars.hsLike.parse('Succ (Succ F)');
  let c = classify(t).bind(defs);
  const steps = [];
  for (let i = 0; i < 10; i++) {
    // console.log('step', i);
    // console.log(c.toStr('lc'));
    // console.log(c.getDbx());
    const rf = c.toRefs(invDefs);
    steps.push(rf);
    console.log(rf.toStr('lc'));
    //debugger;
    const nc = c.betaStep();
    if (nc === c) {
      console.log('done.');
      break;
    }
    c = nc;
  }
  C.run(mainCycle({
    mode: 'lc',
    uncurry: false,
    defs,
    invDefs,
    steps,
    cmd: 'Succ (Succ F)',
  }), { DOM: D.makeDOMDriver('#app')})
}

main();

function reducer(state, action) {
  if (action.SET_MODE) {
    state = {...state, mode: action.SET_MODE};
  }
  if (action.SET_UNCURRY) {
    state = {...state, uncurry: action.SET_UNCURRY.value};
  }
  if (action.ADD_DEF) {
    const {tn, def} = action.ADD_DEF;
    state = {
      ...state,
      defs: {...state.defs, [tn]: def},
      invDefs: {...state.invDefs, [def.getDbx()]: tn},
    };
  }
  if (action.SET_STEPS) {
    state = {...state, steps: action.SET_STEPS};
  }
  if (action.SET_CMD) {
    state = {...state, cmd: action.SET_CMD};
  }
  if (action.CMD_APPLY) {
    const gram = state.mode === 'js' ? theGrammars.jsLike : theGrammars.hsLike;
    try {
      const gdefs = gram.parse(state.cmd);
      for (const tn in gdefs) {
        let def = classify(gdefs[tn]).bind(state.defs);
        const steps = [];
        for (let i = 0; i < 100; i++) {
          const rf = def; //.toRefs(state.invDefs);
          steps.push(rf);
          const nd = def.betaStep();
          if (nd === def) {
            break;
          }
          def = nd;
        }
        if (tn !== '_') state = reducer(state, {ADD_DEF: {tn, def}});
        const frf = def.toRefs(state.invDefs);
        if (frf !== def) steps.push(frf);
        state = {...state, steps};
      }
    } catch(e) {
      console.error(e);
    }
  }
  return state;
}

function tab(cls, id, value, lbl, checked) {
  return span(cls + ' .tab' + (checked ? ' .checked' : ''), {attrs: {id, 'data-value': value}}, lbl);
  const ia = {type: 'radio', id, value, checked};
  if (checked) ia.checked = 'checked';
  return span([input(cls, {attrs: ia}), label({attrs: {'for': id}}, lbl)]);
}

const viewExp = exp => {
  const cs = ['ref', 'var'];
  return exp
    .replace(/([a-zA-Z_][a-z0-9_']*)/g, '#$1#')
    .split('#')
    .map(part => {
      let m;
      if (part.match(/^[a-z]/)) return span('.var', part);
      if (part.match(/^[A-Z_]/)) return span('.ref', part);
      return part;
    });
}

const viewCtl = state => [
  h2('Mode'),
  ...Object.entries({lc: 'λ', hs: 'Hs', js: 'Js'})
    .map(([mode, lbl]) => tab('.modeRadio', 'mode_' + mode, mode, lbl, state.mode === mode)),
  input('.cbUncurry', {attrs: {type: 'checkbox', checked: state.uncurry}}),
  span('uncurry'),
];

const viewDefs = state => [
  h2('Defs'),
  div('.defs.disp', [
    ...Object.entries(state.defs).map(([tn, cf]) => {
      return pre([
        span('.ref', tn),
        ' = ',
        ...viewExp(cf.toStr(state.mode, state.uncurry)),
        //' <=> ' + cf.asDb()
      ]);
    })
  ]),
];

const viewCmd = state => [
  h2('Cmd'),
  input('.cmd', {attrs: {type: 'text', value: state.cmd}}),
  button('.cmdApply', 'do'),
  div('.results.disp', [
    ...state.steps.map((step, i) => 
      pre([
        i + 1,
        ': ',
        ...viewExp(step.toStr(state.mode, state.uncurry)),
        // + ' <=> ' + step.asDb()
      ]),
    ),
  ]),
];

const mainCycle = INIT => ({DOM}) => {
  const modeCheck$ = DOM
    .select('.modeRadio')
    .events('click')
    .map(ev => {
      return {SET_MODE: ev.target.dataset.value};
    });
  const uncurry$ = DOM
    .select('.cbUncurry')
    .events('change')
    .map(ev => {
      return {SET_UNCURRY: {value: ev.target.checked}};
    });
  const cmd$ = DOM
    .select('.cmd')
    .events('input')
    .map(ev => {
      return {SET_CMD: ev.target.value};
    });
  const cmdApply$ = 
    xs.merge(
      DOM.select('.cmdApply').events('click'),
      DOM.select('.cmd').events('keydown').filter(ev => ev.key === 'Enter'),
    )
    .mapTo({CMD_APPLY: 1});
  const action$ = xs.merge(modeCheck$, uncurry$, cmd$, cmdApply$);
  const state$ = action$.fold(reducer, INIT).debug('state');
  const dom$ = state$.map(state =>
    div('.main', [
      div('.left.col', [
        ...viewCtl(state),
        ...viewDefs(state),
      ]),
      div('.right.col', [
        ...viewCmd(state),
      ]),
    ]),
  );

  return { DOM: dom$ };
}

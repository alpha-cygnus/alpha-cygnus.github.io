import {stringifyJsLike, stringifyHsLike, classify} from './lya.js';

console.log(peg);

async function loadText(url) {
  return (await fetch(url)).text();
}

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
    console.log(tn, '=', cf);
    for (const mode of ['lc', 'hs', 'js']) {
      console.log(tn + '/' + mode, '=', cf.toStr(mode));
    }
    console.log(tn + '/db', '=', cf.asDb());
  }
  const invDefs = {};
  for (const tn of Object.keys(defs)) {
    invDefs[defs[tn].getDbx()] = tn;
  }
  console.log(invDefs);

  const {_:t} = grammars.hsLike.parse('Succ (Succ F)');
  let c = classify(t).bind(defs);
  for (let i = 0; i < 10; i++) {
    console.log('step', i);
    console.log(c.toStr('lc'));
    console.log(c.getDbx());
    console.log(c.toRefs(invDefs).toStr('lc'));
    //debugger;
    const nc = c.betaStep();
    if (nc === c) {
      console.log('done.');
      break;
    }
    c = nc;
  }
}

main();
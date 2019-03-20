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
  for (const [like, gram] of Object.entries(grammars)) {
    const parser = peg.generate(gram.text);
    gram.parser = parser;
    const defs = parser.parse(gram.std);
    console.log(JSON.stringify(defs));
    for (const tn of Object.keys(defs)) {
      console.log(tn, '=', classify(defs[tn]).asDB());
      console.log(tn, '=', stringifyJsLike(defs[tn]));
      console.log(tn, '=', stringifyHsLike(defs[tn]));
    }
  }
}

main();
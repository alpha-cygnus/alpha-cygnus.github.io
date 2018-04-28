import parse from './parser/xmllike.js';

export const xl = (strings, ...values) => {
  const ts = [strings[0]];
  for (let i = 1; i < strings.length; i++) {
    ts.push(values[i - 1]);
    ts.push(strings[i]);
  }
  return parse(ts.join(''));
}

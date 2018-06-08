import parse from './parser/xmllike.js';

export {parse};

export function * yieldXL([_t, props = {}, ...subs], prefix = '') {
  const begin = `${prefix}<${_t}${Object.entries(props).map(([k, v]) => {
    if (k.match(/^\$/)) return '';
    if (typeof v === 'number') return ` ${k}=${v}`;
    return ` ${k}="${v}"`;
  }).join('')}`;
  if (subs.length) {
    yield `${begin}>`;
    for (const sub of subs) {
      yield * yieldXL(sub, prefix + '  ');
    }
    yield `${prefix}</${_t}>`;
  } else {
    yield `${begin} />`;
  }
}

export const stringify = obj => [...yieldXL(obj)].join('\n');

export const xl = (strings, ...values) => {
  const ts = [strings[0]];
  for (let i = 1; i < strings.length; i++) {
    const val = values[i - 1];
    if (typeof val === 'string') {
      ts.push(val);
    }
    if (Array.isArray(val)) {
      ts.push(stringify(val));
    }
    ts.push(strings[i]);
  }
  return parse(ts.join(''));
}

export function applyH(data, h) {
  if (Array.isArray(data)) {
    const [tag, props, ...children] = data;
    return h(tag, props, ...children.map(child => applyH(child, h)));
  }
  return data;
}

export const xlh = h => (strings, ...values) => {
  const data = xl(strings, ...values);
  return applyH(data, h);
}

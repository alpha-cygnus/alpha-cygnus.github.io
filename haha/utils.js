export const SNAP_TO = 10;

export const snap = (x, to = SNAP_TO) => Math.round(x / to)*to;

export const rnd = (n, n0 = 0) => Math.floor(Math.random()*n) + n0;
export const pick = arr => arr[rnd(arr.length)];

export const startDragOnMouseDown = (ondown, onmove, onup, mangle = e => e) => e => {
  if (e.button > 1) return;
  const data = ondown(mangle(e));
  document.onmousemove = e => onmove(mangle(e), data);
  document.onmouseup = e => {
    onup(mangle(e), data);
    document.onmousemove = null;
    document.onmouseup = null;
  }
}
  
export const mangleScale = scale => e => {
  return {...e, x: e.x/scale, y: e.y/scale}
};
  
export const isDef = v => typeof v !== 'undefined';

export function * yieldElemXML([_t, props = {}, ...subs], prefix = '') {
  const begin = `${prefix}<${_t}${Object.entries(props).map(([k, v]) => k.match(/^\$/) ? '' : ` ${k}="${v}"`).join('')}`;
  if (subs.length) {
    yield `${begin}>`;
    for (const sub of subs) {
      yield * yieldElemXML(sub, prefix + '  ');
    }
    yield `${prefix}</${_t}>`;
  } else {
    yield `${begin} />`;
  }
}

export const flatten = arr => arr.reduce((result, elem) => result.concat(elem), []);

export const makeObject = (classes, [_t, attrs, ...children]) => {
  const Cls = classes[_t];
  const childObjs = children.map(child => makeObject(classes, child));
  const obj = new Cls(attrs, childObjs);
  childObjs.forEach(child => child.parent = obj);
  return obj;
}

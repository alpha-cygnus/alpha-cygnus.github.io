export const snap = (x, to = 1) => Math.round(x / to)*to;

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


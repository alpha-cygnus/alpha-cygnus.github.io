export function isElem(elem, cond, state) {
  const [eType, eOpts] = elem;
  const [_, sOpts] = state;
  if (typeof cond === 'string') {
    let m;
    if (m = cond.match(/^@([$\w]+)$/)) {
      return eOpts.id === sOpts[m[1]];
    }
    if (m = cond.match(/^#(.+)$/)) {
      return eOpts.id === m[1];
    }
    if (cond.match(/\w+=\w+(&\w+=\w+)*/)) {
      for (const [cn, cv] of cond.split('&').map(c => c.split('='))) {
        if (eOpts[cn] != cv) return false;
      }
      return true;
    }
  }
}

export function normPath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path === 'string') {
    return path.split('/').filter(x => x);
  }
  return path;
}

export function insert(state, path, elem) {
  path = normPath(path);
  const [_t, opts, ...elems] = state;
  if (!path.length) {
    return [_t, opts, ...elems, elem];
  }
  const [cond, ...subPath] = path;
  return [_t, opts, ...elems.map(e => isElem(e, cond, state) ? insert(e, subPath, elem) : e)];
}

export function remove(state, path) {
  path = normPath(path);
  const [_t, opts, ...elems] = state;
  if (path.length === 1) {
    const [cond] = path;
    return [_t, opts, ...elems.filter(e => !isElem(e, cond, state))];
  }
  const [cond, ...subPath] = path;
  return [_t, opts, ...elems.map(e => isElem(e, cond, state) ? remove(e, subPath) : e)];
}

export function setAttr(state, path, attrs) {
  path = normPath(path);
  const [_t, opts, ...elems] = state;
  if (!path.length) {
    return [_t, {...opts, ...attrs}, ...elems];
  }
  const [cond, ...subPath] = path;
  return [_t, opts, ...elems.map(e => isElem(e, cond, state) ? setAttr(e, subPath, attrs) : e)];
}

export function getElems(state, path) {
  path = normPath(path);
  const [_t, opts, ...elems] = state;
  if (!path.length) {
    return [state];
  }
  const [cond, ...subPath] = path;
  return elems.filter(e => isElem(e, cond, state)).reduce((res, e) => [...res, ...getElems(e, subPath)], []);
}

export const wrap = fullState => {
  return {fullState};
};
import {yieldElemXML} from './utils.js';

import {insert, remove, setAttr, wrap, getElems} from './state.js';

const curPatchPath = '@currentPatch';
const projectPath = [];

export const setElemProps = ({id, ...it}) => ({fullState}) => wrap(setAttr(fullState, id ? `${curPatchPath}/#${id}` : `${curPatchPath}/@$currentElem`, it));

export const newElem = elem => ({fullState}) => wrap(insert(fullState, curPatchPath, elem));

export const deleteElem = ({id}) => ({fullState}) => wrap(remove(fullState, `${curPatchPath}/#${id}`));

export const setPatchState = it => ({fullState}) => wrap(setAttr(fullState, curPatchPath, it));

export const setProjectState = it => ({fullState}) => wrap(setAttr(fullState, projectPath, it));

function getPatchProps({fullState}) {
  const [[_t, props]] = getElems(fullState, curPatchPath);
  return props;
}

export const setPortOver = (port) => (state, actions) => {
  if (port) {
    const {parent: {id}, name} = port;
    return actions.setPatchState({$portOverParent: id, $portOverName: name});
  } else {
    return actions.setPatchState({$portOverParent: null, $portOverName: null});
  }
};

export const newLink = ({from, fromPort, all}) => (state, actions) => {
  const topState = getPatchProps(state);
  const {$portOverParent, $portOverName} = topState;
  if ($portOverParent) {
    const [to, toPort] = [$portOverParent, $portOverName];
    let can = true;
    const src = all[from].getPort(fromPort);
    const dst = all[to].getPort(toPort);
    const [connectError, linkClass = 'AudioLink'] = src && dst && src.connectError(dst) || ['NO PORTS'];
    if (connectError && connectError !== 'SWAP') {
      console.error(connectError);
      return actions.setPatchState({$lastError: connectError});
    }
    const state = connectError === 'SWAP'
      ? {
        id: `l${to}.${toPort}-${from}.${fromPort}`,
        from: to, fromPort: toPort, to: from, toPort: fromPort,
      }
      : {
        id: `l${from}.${fromPort}-${to}.${toPort}`,
        from, fromPort, to, toPort,
      }
    ;
    actions.setPatchState({$lastError: null});
    return actions.newElem([linkClass, state]);
  }
  return state;
};

export const selectElem = ({id}) => (state, actions) => {
  actions.setPatchState({$currentElem: id})
};

export const logState = () => state => {
  console.log([...yieldElemXML(state.fullState)].join('\n'));
  return state;
}
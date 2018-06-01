import {yieldElemXML} from './utils.js';

import {insert, remove, setAttr, wrap, getElems} from './state.js';

const curPatchPath = 'patches/@currentPatch';
const patchesPath = 'patches';
const projectPath = [];

const condByProps = ({id, ...props}) => id ? `#${id}` : Object.entries(props).map(([pn, pv]) => [pn, pv].join('=')).join('&');

export const setElemProps = ({id, ...it}) => ({fullState}) => wrap(setAttr(fullState, id ? `${curPatchPath}/#${id}` : `${curPatchPath}/@$currentElem`, it));

export const newElem = elem => ({fullState}) => wrap(insert(fullState, curPatchPath, elem));

export const deleteElem = (props) => ({fullState}) => wrap(remove(fullState, `${curPatchPath}/${condByProps(props)}`));

export const setPatchState = it => ({fullState}) => wrap(setAttr(fullState, curPatchPath, it));

export const setPatchesState = it => ({fullState}) => wrap(setAttr(fullState, patchesPath, it));

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

export const newLink = ({from, fromPort, to, toPort, all}) => (state, actions) => {
  const error = msg => {
    console.error(msg);
    return actions.setPatchState({$lastError: msg});
  }

  const {fullState} = state;
  let can = true;
  const src = all[from].getPort(fromPort);
  const dst = all[to].getPort(toPort);
  if (!src) {
    return error(`Source port not found: ${from}.${fromPort}`);
  }
  if (!dst) {
    return error(`Destination port not found: ${to}.${toPort}`);
  }
  const [connectError, linkClass = 'AudioLink'] = src && dst && src.connectError(dst) || ['NO PORTS'];
  if (connectError && connectError !== 'SWAP') {
    return error(connectError);
  }
  const linkState = connectError === 'SWAP'
    ? {
      // id: `l${to}.${toPort}-${from}.${fromPort}`,
      from: to, fromPort: toPort, to: from, toPort: fromPort,
    }
    : {
      // id: `l${from}.${fromPort}-${to}.${toPort}`,
      from, fromPort, to, toPort,
    }
  ;
  const prevLinks = getElems(fullState, `${curPatchPath}/${condByProps(linkState)}`);
  if (prevLinks.length) {
    return actions.deleteElem(linkState);
  }
  actions.setPatchState({$lastError: null});
  return actions.newElem([linkClass, linkState]);
};

export const selectElem = ({id}) => (state, actions) => {
  actions.setPatchState({$currentElem: id})
};

export const logState = () => state => {
  console.log([...yieldElemXML(state.fullState)].join('\n'));
  return state;
}
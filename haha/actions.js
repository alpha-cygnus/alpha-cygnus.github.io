import {yieldElemXML} from './utils.js';

import {insert, remove, setAttr, wrap, getElems} from './state.js';

const curModPath = '@currentSynth/@currentModule';

export const setElemProps = ({id, ...it}) => ({fullState}) => wrap(setAttr(fullState, `${curModPath}/#${id}`, it));

export const newElem = elem => ({fullState}) => wrap(insert(fullState, curModPath, elem));

export const deleteElem = ({id}) => ({fullState}) => wrap(remove(fullState, `${curModPath}/#${id}`));

export const setModuleState = it => ({fullState}) => wrap(setAttr(fullState, curModPath, it));

function getModuleProps({fullState}) {
  const [[_t, props]] = getElems(fullState, curModPath);
  return props;
}

export const setPortOver = (port) => (state, actions) => {
  if (port) {
    const {parent: {id}, name} = port;
    return actions.setModuleState({$portOverParent: id, $portOverName: name});
  } else {
    return actions.setModuleState({$portOverParent: null, $portOverName: null});
  }
};

export const newLink = ({from, fromPort, all}) => (state, actions) => {
  const topState = getModuleProps(state);
  const {$portOverParent, $portOverName} = topState;
  if ($portOverParent) {
    const [to, toPort] = [$portOverParent, $portOverName];
    let can = true;
    const src = all[from].getPort(fromPort);
    const dst = all[to].getPort(toPort);
    const [connectError, linkClass = 'AudioLink'] = src && dst && src.connectError(dst) || ['NO PORTS'];
    if (connectError && connectError !== 'SWAP') {
      console.error(connectError);
      return actions.setModuleState({$lastError: connectError});
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
    actions.setModuleState({$lastError: null});
    return actions.newElem([linkClass, state]);
  }
  return state;
};

export const selectElem = ({id}) => (state, actions) => {
  actions.setModuleState({$currentElem: id})
};

export const logState = () => state => {
  console.log([...yieldElemXML(state.fullState)].join('\n'));
  return state;
}
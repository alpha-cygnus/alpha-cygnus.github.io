import {updateElem, updateModuleElems, updateModuleProps, updateModuleState, getModuleProps} from './state.js';

export const setElemProps = ({id, ...it}) => fullState => {
  return updateElem(fullState, ([_t, props, ...subs]) => [_t, {...props, ...it}, ...subs], id);
};

//export const newElem = ([_t, {id, ...it}]) => fullState => updateModuleElems(fullState, () => ({[id]: [_t, it]}));
export const newElem = elem => fullState => updateModuleElems(fullState, elems => [...elems, elem]);

export const deleteElem = ({id}) => fullState => updateModuleElems(fullState, elems => elems.filter(([_t, props]) => props.id !== id));

export const setModuleState = (it) => (state) => {
  return updateModuleProps(state, () => it);
};

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
    console.log('newLink', all);
    if (all) {
      const src = all[from].getPort(fromPort);
      const dst = all[to].getPort(toPort);
      const connectError = src && dst && src.connectError(dst);
      if (connectError) {
        console.error(connectError);
        return actions.setModuleState({$lastError: connectError});
      }
    }
    const state = {
      id: `l${from}.${fromPort}-${to}.${toPort}`,
      from, fromPort, to, toPort,
    };
    actions.setModuleState({$lastError: null});
    return actions.newElem(['DirectLink', state]);
  }
  return state;
};

export const selectElem = ({id}) => (state, actions) => {
  actions.setModuleState({$currentElem: id})
};

export const logState = () => state => {
  //console.log(JSON.stringify(state, (key, value) => key.match(/^\$/) ? undefined : value, '  '));
  function * logElem([_t, props, ...subs], prefix = '') {
    const begin = `${prefix}<${_t}${Object.entries(props).map(([k, v]) => k.match(/^\$/) ? '' : ` ${k}="${v}"`).join('')}`;
    if (subs.length) {
      yield `${begin}>`;
      for (const sub of subs) {
        yield * logElem(sub, prefix + '  ');
      }
      yield `${prefix}</${_t}>`;
    } else {
      yield `${begin} />`;
    }
  }
  console.log([...logElem(state.fullState)].join('\n'));
  return state;
}
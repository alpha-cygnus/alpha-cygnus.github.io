import {getElems} from './state.js';

export class ParamEditor {
  constructor(attrs, children) {
    this.attrs = attrs;
    this.children = children
    this.name = attrs.name;
    this.label = attrs.label || attrs.name;
  }
  renderEditor(h, actions, value) {
    return [];
  }
  render(h, actions, value) {
    return h('div', {}, h('label', {}, this.label, ' ', this.renderEditor(h, actions, value)));
  }
}

export class Float extends ParamEditor {
  renderEditor(h, actions, value) {
    const {name} = this;
    return h('input', {name, type: 'number', step: 0.1, value, onchange: e => {
      actions.setElemProps({[this.name]: e.target.value});
      //console.log(e.target.value);
    }});
  }
}

export class Select extends ParamEditor {
  renderEditor(h, actions, value) {
    const {name} = this;
    return [h('select', {
        name,
        onchange: e => {
          //console.log(e.target.value);
          actions.setElemProps({[this.name]: e.target.value});
        }
      },
      this.children.map(({attrs: {value: v, label}}) => h('option', {value: v, selected: v === value}, label))
    )];
  }
}

export class Option extends ParamEditor {
}
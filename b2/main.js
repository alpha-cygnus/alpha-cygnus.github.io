(() => {
class BaseNode {
	constructor(b2) {
		this.b2 = b2;
	}
	getInput() {
		return null;
	}
	getOutput() {
		return null;
	}
}
class Attr extends BaseNode {
	constructor(b2, node, name) {
		super(b2);
		this.set = (val) => node[name] = b2.normVal(val).v;
	}
}
class B2 {
	constructor (context) {
		this.context = context || new AudioContext();
		this.nodeTypes = {};
		this.onCreate = {
			Oscillator: (node, b2) => node.start(),
			ConstantSource: (node, b2) => node.start(),
		};
	}
	getNodeKinds(node) {
		if (typeof node === 'object') {
			if (window.Kefir) {
				if (node instanceof Kefir.Observable) return ['kefir', 'isOutput'];
			}
			if (node instanceof AudioParam) return ['aparam', 'isInput'];
			if (node instanceof AudioNode) {
				const res = ['anode', 'isInput', 'isOutput'];
				if (node instanceof AudioScheduledSourceNode) res.push('triggerable');
				return res;
			}
			if (node instanceof BaseNode) {
				const res = [];
				if (node.getInput()) res.push('hasInput');
				if (node.getOutput()) res.push('hasOutput');
				for (let proto = node; proto !== BaseNode; proto = Object.getPrototypeOf(proto)) {
					res.push(proto.constructor.name.toLowerCase());
				}
				return res;
			}
			return 'unknown';
		}
		return typeof node;
	}
	getConnector(from, to) {
		const fromKinds = this.getNodeKinds(from);
		const toKinds = this.getNodeKinds(to);
		for (let fk of fromKinds) {
			for (let tk of toKinds) {
				const func = this[`connect_${fk}2${tk}`];
				if (func) return func;
			}
		}
		throw `cannot connect from ${fromKinds[0]} to ${toKinds[0]}`;
	}
	connect(from, to) {
		const func = this.getConnector(from, to);
		func.call(this, from, to);
	}
	get currentTime() {
		return this.context.currentTime;
	}
	normVal(val) {
		const ct = this.currentTime;
		if (val && typeof val === 'object') {
			const {t = ct, v = 0, c = '', a = []} = val;
			return {t, v, c, a};
		}
		if (typeof val === 'number') return {t: ct, v: val};
		return {t: ct, v: 0, c: '', a: []};
	}
	setValueToParam(val, param) {
		if (Array.isArray(val)) {
			for (let v of val) this.setValueToParam(v, param);
			return;
		}
		let {t, v, c, a} = this.normVal(val); // time, value, command, additional params
		a = a || [];
		if (!Array.isArray(a)) a = [a];
		switch (c) {
			case 'l':
				return param.linearRampToValueAtTime(v, t);
			case 'e':
			case 'x':
				return param.exponentialRampToValueAtTime(v, t);
			case 'c':
				return param.cancelAndHoldAtTime(t);
				//return param.cancelScheduledValues(t);
			case 't':
				console.log('setTargetAtTime', v, t, a[0] || 0);
				return param.setTargetAtTime(v, t, a[0] || 0);
			case 's':
			default:
				return param.setValueAtTime(v, t);
		}
	}
	create(nodeType, ...args) {
		let creator = null;
		if (this.nodeTypes[nodeType]) creator = (...args) => new this.nodeTypes[nodeType](this, ...args);
		else if (this.context[`create${nodeType}`]) creator = (...args) => this.context[`create${nodeType}`](...args);
		if (!creator) throw `unknown node type: ${nodeType}`;
		const node = creator(...args);
		if (this.onCreate[nodeType]) this.onCreate[nodeType](node, this);
		return node;
	}
	createConst(v) {
		return this.create('ConstantSource', v);
	}
	createGain(v) {
		const g = this.create('Gain');
		g.gain.value = v;
		return g;
	}
	connect_kefir2aparam(from, to) {
		from.onValue(v => this.setValueToParam(v, to));
	}
	connect_kefir2anode(from, to) {
		connect_kefir2aparam(from, c.offset);
		c.connect(to);
	}
	connect_audio(from, to) {
		from.connect(to);
	}
	connect_anode2anode(from, to) {
		this.connect_audio(from, to);
	}
	connect_anode2aparam(from, to) {
		this.connect_audio(from, to);
	}
	connect_number2aparam(from, to) {
		this.makeConst(from).connect(to);
	}
	connect_number2anode(from, to) {
		this.makeConst(from).connect(to);
	}
	connect_kefir2triggerable(from, to) {
		from.onValue(val => {
			const {v, t} = this.normVal(val);
			if (v) to.start(t);
			else to.stop(t);
		});
	}
	connect_kefir2attr(from, to) {
		from.onValue(val => {
			const {v} = this.normVal(val);
			to.set(v);
		});
	}
	connect_hasOutput2isInput(from, to) {
		this.connect(from.getOutput(), to);
	}
	connect_isOutput2hasInput(from, to) {
		this.connect(from, to.getInput());
	}
	connect_hasOutput2hasInput(from, to) {
		this.connect(from.getOutput(), to.getInput());
	}
}

window.B2 = B2;
})();

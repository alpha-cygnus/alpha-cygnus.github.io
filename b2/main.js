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
	normVal(val) {
		const ct = this.context.currentTime;
		if (val && typeof val === 'object') {
			const {t = ct, v = 0, k = ''} = val;
			return {t, v, k};
		}
		if (typeof val === 'number') return {t: ct, v: val};
		return {t: ct, v: 0};
	}
	setValueToParam(val, param) {
		let {t, v, k} = this.normVal(val);
		if (!t) t = this.context.currentTime;
		switch (k) {
			case 'l':
				param.linearRampToValueAtTime(v, t);
			case 'e':
			case 'x':
				param.exponentialRampToValueAtTime(v, t);
			case 's':
			default:
				param.setValueAtTime(v, t);
				return;
		}
	}
	makeNode(nodeType, options = {}) {
		const nodeCons = this.nodeTypes[nodeType] || window[`${nodeType}Node`];
		if (!nodeCons) throw `known node type: ${nodeType}`;
		const node = new nodeCons(this.context, options);
		if (this.onCreate[nodeType]) this.onCreate[nodeType](node, this);
		return node;
	}
	makeConst(v) {
		return this.makeNode('ConstantSource', {offset: v});
	}
	makeGain(g) {
		return this.makeNode('Gain', {gain: g});
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
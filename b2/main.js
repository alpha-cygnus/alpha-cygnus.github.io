(() => {
class B2 {
	constructor (context) {
		this.context = context || new AudioContext();
		this.nodeTypes = {};
	}
	getNodeKind(node) {
		if (typeof node === 'object') {
			if (window.Kefir) {
				if (node instanceof Kefir.Observable) return 'kefir';
			}
			if (node instanceof AudioParam) return 'aparam';
			if (node instanceof AudioNode) return 'anode';
			return 'unknown';
		}
		return typeof node;
	}
	connect(from, to) {
		const fromKind = this.getNodeKind(from);
		const toKind = this.getNodeKind(to);
		const func = this[`connect_${fromKind}2${toKind}`];
		if (!func) throw `cannot connect from ${fromKind} to ${toKind}`;
	}
	setValueToParam(val, param) {
		if (typeof val === 'number') {
			param.value = val; return;
		}
		if (typeof val === 'object') {
			let {t, v, k} = val;
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
	}
	makeNode(nodeType, options = {}) {
		const nodeCons = this.nodeTypes[nodeType] || window[`${nodeType}Node`];
		if (!nodeCons) throw `known node type: ${nodeType}`;
		return new nodeCons(this.context, options);
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
		const g = this.makeGain(0.0);
		const c = this.makeConst(1.0);
		c.connect(g);
		g.connect(to);
		connect_kefir2aparam(from, g.gain);
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
}

window.B2 = B2;
})();

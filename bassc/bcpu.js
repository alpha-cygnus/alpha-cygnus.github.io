// Bass C Parsing Utils
(function(global) {
	"use strict";

	function noteToInt(n) {
		var m;
		var n2i = {C: 0, D:2, E:4, F: 5, G: 7, H: 9, A: 9, B: 11};
		var a2i = {'#': 1, 'b': -1, '-': 0};
		if (m = n.match(/([A-H])([b#-])?([0-9])?/)) {
			var i = n2i[m[1]];
			i += a2i[m[2] || '-'];
			i += 12*(m[3] || '5');
		}
		return i;
	}
	function makeRange(a, b) {
		var res = [a];
		if (b === null) b = a;
		if (b < a) return res;
		for (var i = a + 1; i <= b; i++) res.push(i);
		return res;
	}
	var _abcState = {};
	
	class SyntaxElem {
		constructor() {
			this.location = BCPU.location();
		}
		toMeta() {}
		error(msg) {
			console.error(msg, this.location);
			debugger;
			BC.meta.error(msg, this.location);
		}
	}
	class Module extends SyntaxElem {
		constructor(name, items) {
			super();
			this.name = name;
			this.items = items;
		}
		toMeta() {
			var mod = BC.meta.byName(this.name);
			if (mod) this.error(`${this.name} is already defined`);
			mod = BC.meta.newModule(this.name);
			for (var item of this.items) {
				item.toMeta(mod);
			}
		}
	}
	class EnumDef extends SyntaxElem {
		constructor(vals) {
			super();
			this.values = vals;
		}
		toMeta(_cc) {
			var cv = 0;
			_cc.values = {}
			for (var ev of this.values) {
				if (ev.val !== null) cv = ev.val;
				_cc.values[ev.name] = cv++;
			}
		}
	}
	class EnumValDef extends SyntaxElem {
		constructor(name, val) {
			super();
			this.name = name;
			this.val = val;
		}
	}
	class Layout extends SyntaxElem {
		constructor(lyt) {
			super();
			this.layout = lyt;
		}
		toMeta(_cc) {
			_cc.addLayout(this.layout);
		}
	}
	class Chain extends SyntaxElem {
		constructor(head, links) {
			super();
			this.head = head;
			this.links = links;
		}
		toMeta(_cc) {
			var io = this.head.toMeta(_cc);
			for (var lnk of this.links) {
				io = lnk.toMeta(_cc, io);
			}
			return io;
		}
	}
	class ChainLink extends SyntaxElem {
		constructor(arrow, point) {
			super();
			this.arrow = arrow;
			this.point = point;
		}
		toMeta(_cc, io0) {
			var io1 = this.point.toMeta(_cc);
			this.arrow.toMeta(_cc, io0.outs, io1.inps);
			return {inps: io0.inps, outs: io1.outs};
		}
	}
	class ChainArrow extends SyntaxElem {
		constructor(par) {
			super();
			this.par = par;
		}
		toMeta(_cc, outs, inps) {
			var linkOutInp = (out, inp) => {
				let a0 = out.split('.');
				let n0 = a0[0];
				let e0 = a0[1];
				let c0 = _cc.nodes[n0].type;
				if (!c0) debugger;
				if (e0.match(/^\d+$/)) e0 = c0.outList[e0];
				let t0 = c0.nodes[e0] && c0.nodes[e0].outType;
				if (!t0) debugger;
				if (!t0) this.error(`Output ${a0[1]} is not defined for ${n0}:${c0.name} in ${_cc.name}`);
				
				let a1 = inp.split('.');
				let n1 = a1[0];
				let e1 = a1[1];
				let c1 = _cc.nodes[n1].type;
				if (!c1) debugger;
				if (e1.match(/^\d+$/)) e1 = c1.inpList[e1];
				let t1 = c1.nodes[e1] && c1.nodes[e1].inpType;
				if (!t1) debugger;
				if (!t1) this.error(`Input ${a1[1]} is not defined for ${n1}:${c1.name} in ${_cc.name}`);
				if (t0 != t1) {
					this.error(`Incompatible connection for ${n0}[${e0}](${t0})->[${e1}]${n1}(${t1}) in ${_cc.name}`);
				}

				let lid = [n0, e0, e1, n1];

				_cc.links[lid.join(',')] = { n0, n1, e0, e1, t: t0 };
			}
			if (this.par) {
				var olen = outs.length;
				var ilen = inps.length;
				if (olen != ilen) this.error('Input-output list length mismatch:' + outs.toString() + ',' + JSON.stringify(inps));
				for (var i = 0; i < ilen; i++) {
					linkOutInp(outs[i], inps[i]);
				};
			} else {
				for (let out of outs) {
					for (let inp of inps) {
						linkOutInp(out, inp);
					}
				}
			}
		}
	}
	class Point extends SyntaxElem {
		constructor(items) {
			super();
			this.items = items;
		}
		toMeta(_cc) {
			var state = {};
			var inps = [];
			var outs = [];
			for (var item of this.items) {
				var next = item.toMeta(_cc, state);
				var inps = inps.concat(next.inps);
				var outs = outs.concat(next.outs);
				state = next.state || {};
			}
			return {inps, outs};
		}
	}
	class Node extends SyntaxElem {
		constructor(inps, decl, outs) {
			super();
			this.inps = inps;
			this.decl = decl;
			this.outs = outs;
		}
		toMeta(_cc, state) {
			var _ci = this.inps || state._ci || [0];
			var _co = this.outs || state._co || [0];
			var res = this.decl.toMeta(_cc, state);
			var _ct = res._ct;
			var ids = res.ids;
			var inps = [];
			var outs = [];
			if (!ids) debugger;
			for (var id of ids) {
				for (var ci of _ci) inps.push(id + '.' + ci);
				for (var co of _co) outs.push(id + '.' + co);
			}
			return {
				inps, outs, _ci, _co, _ct
			}
		}
	}
	class Ref extends SyntaxElem {
		constructor(ids, title) {
			super();
			this.ids = ids;
			this.title = title;
		}
		toMeta(_cc, state) {
			var _ct = state._ct;
			var title = this.title;
			for (var id of this.ids) {
				if (_ct) {
					if (_cc.nodes[id]) this.error(id + " is already defined");
					_cc.addNode(_ct, id, title);
				}
				if (!_cc.nodes[id]) this.error(id + " is not defined");
			}
			return {ids: this.ids, _ct};
		}
	}
	class Decl extends SyntaxElem {
		constructor(cons, ids, title) {
			super();
			this.cons = cons;
			this.ids = ids;
			this.title = title;
		}
		toMeta(_cc, state) {
			var _ct = this.cons.toMeta(_cc);
			var title = this.title;
			var ids;
			if (this.ids) {
				ids = this.ids.map(id => _cc.fixId(_ct, id));
			} else {
				ids = [_cc.fixId(_ct)];
			}
			for (var id of ids) {
				if (_cc.nodes[id]) this.error(id + " is already defined");
				_cc.addNode(_ct, id, title);
			}
			return {ids, _ct};
		}
	}
	
	class Cons extends SyntaxElem {
	}
	class ConsRef extends Cons {
		constructor(name, params) {
			super();
			this.name = name;
			this.params = params;
		}
		toMeta(_cc) {
			var m = BC.meta.byName(this.name);
			if (!m) this.error(`Type ${this.name} not defined`);
			var params = [];
			return { type: m, params: (this.params || []).map(p => p.toMeta(_cc)) };
		}
	}
	class ConsConst extends ConsRef {
		constructor(v) {
			super('Const', [new ParamNum(v)]);
		}
	}
	class ConsGain extends ConsRef {
		constructor(v) {
			super('Gain', [new ParamNum(v)]);
		}
	}
	class ConsProc extends Cons {
		constructor(proc) {
			super();
			this.proc = proc;
		}
		toMeta() {
			var m = BC.meta.newProc(this.proc);
			return { type: m, params: [] };
		}
	}
	class Proc extends Cons {
		constructor(params, body) {
			super();
			this.params = params;
			this.body = body;
		}
	}
	class ProcParam extends SyntaxElem {
		constructor(agr, name, def) {
			super();
			this.agr = agr;
			this.name = name;
			this.def = def;
		}
	}
	
	class TypeParam extends SyntaxElem {
	}
	
	class ParamNum extends TypeParam {
		constructor(v) {
			super();
			this.value = v;
		}
	}
	class ParamProc extends TypeParam {
		constructor(proc) {
			super();
			this.proc = proc;
		}
	}
	class ParamRef extends TypeParam {
		constructor(ids) {
			super();
			this.ids = ids;
		}
	}
	class ParamEnum extends TypeParam {
		constructor(name) {
			super();
			this.name = name;
		}
	}
	
	class Main extends Module {
		constructor(items) {
			super('Main', items);
		}
		toMeta() {
			var mod = BC.meta.getMain();
			for (var item of this.items) {
				item.toMeta(mod);
			}
		}
	}
	
	global.BCPU = {
		cls: {
			SyntaxElem,
			Module,
			EnumDef,
			EnumValDef,
			Chain,
			ChainLink,
			ChainArrow,
			Layout,
			Point,
			Node,
			Decl,
			Ref,
			ConsRef,
			ConsConst,
			ConsGain,
			ConsProc,
			Proc,
			ProcParam,
			ParamNum,
			ParamProc,
			ParamRef,
			ParamEnum,
			Main,
		},
		fun: {
			noteToInt,
			makeRange,
			_abcState,
		},
		location: () => '?', // stub, to be filled by parser
		error: () => '!', // stub, to be filled by parser
	}
})(this);
"use strict";

class KNBase extends Basis {
}

var knMeta = {}
var knProcCount = 0;

function knFillParams(res, ps) {
	var params = [];
	var opts = {};
	var i = 0;
	for (let p of (ps || [])) {
		let n = p.n;
		if (n) opts[n] = p.v;
		else {
			if ($.isArray(p.v)) {
				params.push.apply(params, p.v);
			} else params.push(p.v);
		}
	}
	res.params = params;
	res.opts = opts;
	return res;
}


class KNMeta {
	constructor(name) {
		knMeta[name] = this;
		this.name = name;
	}
	setOpt(name, val) {
		if (val === undefined) val = true;
		this[name] = val;
		return this;
	}
	compileToSource() {
		var res = [`class ${this.name} extends KNBase {`];
		res.push('\tconstructor() {');
		res.push('\t\tsuper();');
		this.compileCons(res);
		res.push('\t}');
		res.push('}');
		return res.join('\n');
	}
	compile() {
		var src = this.compileToSource();
		var cc = eval(src);
		this.cc = cc;
		window[this.name] = cc;
	}
	compileCons(res) {
		return;
	}
}

class KNClassMeta extends KNMeta {
	constructor(name) {
		super(name);
		this.links = {};
		this.uses = {};
		this.nodes = {};
		this.inpList = [];
		this.outList = [];
	}
	compileCons(res) {
		for (var nn in this.nodes) {
			var t = this.nodes[nn];
			var ps = t.params;
			res.push(`\t\tthis.${nn} = new ${t.type}(${ps.join(', ')});`);
			if (t.name) {
				res.push(`\t\tthis.${nn}.name = '${t.name}';`);
			}
			if (t.title) {
				res.push(`\t\tthis.${nn}.title = ${t.title};`);
			}
			for (var na in t.opts) {
				res.push(`\t\tthis.${nn}.${na} = ${t.opts[na]};`);
			}
		}
		for (var ln in this.links) {
			var li = this.links[ln];
			res.push(`\t\tthis.${li.n0}.${li.e0}.connectTo(this.${li.n1}.${li.e1});`);
		}
	}
	addNode(type, id, title, params) {
		var t = Object.create(type);
		if (params) knFillParams(t, params);
		var wasId = id;
		var ci = this.uses[t.type] || 0;
		if (!id) id = '_' + t.type + '_' + (++ci);
		this.uses[t.type] = ci;
		this.nodes[id] = t;
		if (wasId) t.name = id;
		if (title) t.title = title;
		if (knMeta[t.type] && knMeta[t.type].inpType) this.addInp(t);
		if (knMeta[t.type] && knMeta[t.type].outType) this.addOut(t);
		return id;
	}
	addInp(inp) {
		inp.inpIdx = this.inpList.push(inp.name) + 1;
		inp.inpType = knMeta[inp.type].inpType;
	}
	addOut(out) {
		out.outIdx = this.outList.push(out.name) + 1;
		out.outType = knMeta[out.type].outType;
	}
	getVertices() {
		var res = [];
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			var nc = knMeta[n.type];
			res.push({
				id: nn,
				label: n.title || n.name || n.type,
				shape: 'box',
				font:{size:30},
				size:40,
			});
			if (!nc.inpList) debugger;
			for (let e of nc.inpList) {
				res.push({
					id: nn + '.' + e,
					label: e,
					shape: 'dot',
					size:10,
				});
			}
			for (let e of nc.outList) {
				res.push({
					id: nn + '.' + e,
					label: e,
					shape: 'diamond',
					size:10,
				});
			}
		}
		return res;
	}
	getEdges() {
		var res = [];
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			var nc = knMeta[n.type];
			for (let e of nc.inpList) {
				res.push({
					from: nn + '.' + e,
					to: nn,
					arrows: 'to',
					length: 10,
				});
			}
			for (let e of nc.outList) {
				res.push({
					from: nn,
					to: nn + '.' + e,
					arrows: 'to',
					length: 10,
				});
			}
		}
		for (var ln in this.links) {
			var li = this.links[ln];
			res.push({
				from: `${li.n0}.${li.e0}`,
				to: `${li.n1}.${li.e1}`,
				arrows: 'to',
				length: 40,
			});
		}
		return res;
	}
	getPlant() {
		var res = ['@startuml'];
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			var nc = knMeta[n.type];
			res.push(`object ${nn} {`);
			for (let e of nc.inpList) {
				res.push(`${nc.nodes[e].type} ${e}`);
			}
			for (let e of nc.outList) {
				res.push(`${nc.nodes[e].type} ${e}`);
			}
			res.push(`}`);
		}
		for (var ln in this.links) {
			var li = this.links[ln];
			res.push(`${li.n0} "${li.e0}" --> "${li.e1}" ${li.n1}`);
		}
		return res.join('\n');
	}
	getCyEles() {
		var res = [];
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			res.push({
				data: { id: nn, label: n.title || n.name || n.type, }
			});
			var nc = knMeta[n.type];
			for (let e of nc.inpList) {
				res.push({
					data: { id: nn + '.' + e, label: e, parent0: nn }
				});
				res.push({
					data: { id: nn + '.' + e + '.lnk', source: nn + '.' + e, target: nn }
				});
			}
			for (let e of nc.outList) {
				res.push({
					data: { id: nn + '.' + e, label: e, parent0: nn }
				});
				res.push({
					data: { id: nn + '.' + e + '.lnk', source: nn, target: nn + '.' + e }
				});
			}
		}
		for (var ln in this.links) {
			var li = this.links[ln];
			res.push({
				data: {
					id: ln,
					source: `${li.n0}.${li.e0}`,
					target: `${li.n1}.${li.e1}`,
				}
			});
		}
		return res;
	}
}

class KNProcMeta extends KNClassMeta {
	constructor(proc) {
		var name = `Proc_${++knProcCount}`;
		super(name);
		this.proc = proc;
	}
	compileCons(res) {
		var proc = this.proc;
		var body = proc.body || '';
		if (body.match(/return/)) body = `{ ${body} }`;
		for (var n of Object.getOwnPropertyNames(Math)) {
			if (body.indexOf(n) < 0) continue;
			res.push(`\t\tvar ${n} = Math.${n};`);
		}
		var pns = [];
		var i = 0;
		for (var p of proc.params) {
			var agr = p.agr || '+';
			if (!p.name) p.name = '$' + ++i;
			var af = {
				'+': ['a + b', 0],
				'*': ['a * b', 1],
				'_': ['min(a, b)', 100000],
				'^': ['max(a, b)', -100000],
			}[agr];
			var def = p.def || af[1];
			res.push(`\t\tthis.${p.name} = new PIN(${def}, (a, b) => ${af[0]}, ${af[1]})`);
		}
		if (!body) body = proc.params.map(p => p.name).join(' + ');
		res.push('\t\tthis.out = new POUT();')
		res.push(`\t\tthis.out.plug(Kefir.combine([${proc.params.map(p => 'this.' + p.name + '.stream').join(', ')}], (${proc.params.map(p => p.name).join(', ')}) => ${body}))`);
	}
}

var knNewClass = function newCls(name) {
	// var c = { name: name, nodes: {}, links: {}, uses: {} };
	// knMeta[name] = c;
	// return c;
	return new KNClassMeta(name);
}

var knNewProc = function newProc(proc) {
	//var c = knMeta[name] = {name, proc};
	//return c;
	return new KNProcMeta(proc);
}

const knMainClass = '__main';

knNewClass(knMainClass);
(function (types){
	for (let t of types) {
		knNewClass(t + 'IN').setOpt('inpType', t);
		knNewClass(t + 'OUT').setOpt('outType', t);
		knMeta[t + 'IN'].addNode({type: t + 'IN'}, 'inp');
		knMeta[t + 'IN'].addNode({type: t + 'OUT'}, 'out');
		knMeta[t + 'OUT'].addNode({type: t + 'IN'}, 'inp');
		knMeta[t + 'OUT'].addNode({type: t + 'OUT'}, 'out');
	}
})(['A', 'P', 'MIDI'])


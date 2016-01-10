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

		res.push('\tgetHTML() {');
		this.compileGetHTML(res);
		res.push('\t}');

		res.push('\tonStartUI() {');
		this.compileOnStartUI(res);
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
	compileGetHTML(res) {
		return;
	}
	compileOnStartUI(res) {
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
		this.layouts = [];
		this.melodies = [];
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
	compileGetHTML(res) {
		res.push(`\t\tvar html = [];`);
		res.push(`\t\tvar s;`);
		function compileLayout(ly, isVert) {
			res.push(`\t\thtml.push('<div class="layout${isVert ? 'V' : 'H'}">');`)
			for (var ln of ly) {
				if ($.isArray(ln)) {
					compileLayout(ln, !isVert);
				} else {
					res.push(`\t\tif (s = this.${ln}.getHTML(this)) html.push(s);`);
				}
			}
			res.push(`\t\thtml.push('</div>');`)
		}
		for (var ly of this.layouts) {
			res.push(`\t\thtml.push('<div class="layoutH">');`)
			compileLayout(ly);
			res.push(`\t\thtml.push('</div>');`)
		}
		res.push(`\t\treturn html.join('')`);
		// for (var nn in this.nodes) {
		// 	var t = this.nodes[nn];
		// 	var ps = t.params;
		// 	res.push(`\t\tif (s = this.${nn}.getHTML(this)) html.push(s);`);
		// }
	}
	compileOnStartUI(res) {
		for (var nn in this.nodes) {
			var t = this.nodes[nn];
			var ps = t.params;
			res.push(`\t\tthis.${nn}.onStartUI(this);`);
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
		t.id = id;
		if (wasId) t.name = id;
		if (title) t.title = title;
		if (knMeta[t.type] && knMeta[t.type].inpType) this.addInp(t);
		if (knMeta[t.type] && knMeta[t.type].outType) this.addOut(t);
		return id;
	}
	addInp(inp) {
		inp.inpIdx = this.inpList.push(inp.id) - 1;
		inp.inpType = knMeta[inp.type].inpType;
	}
	addOut(out) {
		out.outIdx = this.outList.push(out.id) - 1;
		out.outType = knMeta[out.type].outType;
	}
	addLayout(l) {
		this.layouts.push(l);
	}
	addMelody(m) {
		this.melodies.push(m);
	}
	// getVertices() {
	// 	var res = [];
	// 	for (let nn in this.nodes) {
	// 		var n = this.nodes[nn];
	// 		var nc = knMeta[n.type];
	// 		res.push({
	// 			id: nn,
	// 			label: n.title || n.name || n.type,
	// 			shape: 'box',
	// 			font:{size:30},
	// 			size:40,
	// 		});
	// 		if (!nc.inpList) debugger;
	// 		for (let e of nc.inpList) {
	// 			res.push({
	// 				id: nn + '.' + e,
	// 				label: e,
	// 				shape: 'dot',
	// 				size:10,
	// 			});
	// 		}
	// 		for (let e of nc.outList) {
	// 			res.push({
	// 				id: nn + '.' + e,
	// 				label: e,
	// 				shape: 'diamond',
	// 				size:10,
	// 			});
	// 		}
	// 	}
	// 	return res;
	// }
	// getEdges() {
	// 	var res = [];
	// 	for (let nn in this.nodes) {
	// 		var n = this.nodes[nn];
	// 		var nc = knMeta[n.type];
	// 		for (let e of nc.inpList) {
	// 			res.push({
	// 				from: nn + '.' + e,
	// 				to: nn,
	// 				arrows: 'to',
	// 				length: 10,
	// 			});
	// 		}
	// 		for (let e of nc.outList) {
	// 			res.push({
	// 				from: nn,
	// 				to: nn + '.' + e,
	// 				arrows: 'to',
	// 				length: 10,
	// 			});
	// 		}
	// 	}
	// 	for (var ln in this.links) {
	// 		var li = this.links[ln];
	// 		res.push({
	// 			from: `${li.n0}.${li.e0}`,
	// 			to: `${li.n1}.${li.e1}`,
	// 			arrows: 'to',
	// 			length: 40,
	// 		});
	// 	}
	// 	return res;
	// }
	getPlant() {
		var res = ['@startuml'];
		var links = [];
		var used = {};
		for (var ln in this.links) {
			var li = this.links[ln];
			//res.push(`${li.n0} "${li.e0}" --> "${li.e1}" ${li.n1}`);
			var from = `${li.n0}.${li.e0}`;
			var to = `${li.n1}.${li.e1}`;
			// used[from] = 1;
			// used[to] = 1;
			if (li.e0 == knMeta[this.nodes[li.n0].type].outList[0]) from = '[' + li.n0 + ']';
			else {
				used[from] = 1;
				from = `(${from})`;
			}
			if (li.e1 == knMeta[this.nodes[li.n1].type].inpList[0]) to = '[' + li.n1 + ']';
			else {
				used[to] = 1;
				to = `(${to})`;
			}
			res.push(`${from} ---> ${to}`);
		}
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			var nc = knMeta[n.type];
			var label = n.title;
			if (!label) {
				if (n.type == 'Const') {
					label = n.params.join(', ');
				} else {
					label = n.type;
					if (n.params && n.params.length) {
						label += '(' + n.params.join(', ') + ')';
					}
				}
				if (n.name) label += ' ' + n.name;
				if (n.inpType) label += ' <<' + n.inpType + '>>';
				if (n.outType) label += ' <<' + n.outType + '>>';
			}
			res.push(`[${label}] as ${nn}`);
			let e0 = nc.inpList[0];
			for (let e of nc.inpList) {
				//if (e == e0) continue;
				if (!used[`${nn}.${e}`]) continue;
				res.push(`(${e}) as (${nn}.${e})`);
				res.push(`(${nn}.${e}) --* ${nn}`)
			}
			e0 = nc.outList[0];
			for (let e of nc.outList) {
				//if (e == e0) continue;
				if (!used[`${nn}.${e}`]) continue;
				res.push(`(${e}) as (${nn}.${e})`);
				res.push(`${nn} --* (${nn}.${e})`)
			}
			// res.push(`}`);
		}
		return res.join('\n');
	}
	// getCyEles() {
	// 	var res = [];
	// 	for (let nn in this.nodes) {
	// 		var n = this.nodes[nn];
	// 		res.push({
	// 			data: { id: nn, label: n.title || n.name || n.type, }
	// 		});
	// 		var nc = knMeta[n.type];
	// 		for (let e of nc.inpList) {
	// 			res.push({
	// 				data: { id: nn + '.' + e, label: e, parent0: nn }
	// 			});
	// 			res.push({
	// 				data: { id: nn + '.' + e + '.lnk', source: nn + '.' + e, target: nn }
	// 			});
	// 		}
	// 		for (let e of nc.outList) {
	// 			res.push({
	// 				data: { id: nn + '.' + e, label: e, parent0: nn }
	// 			});
	// 			res.push({
	// 				data: { id: nn + '.' + e + '.lnk', source: nn, target: nn + '.' + e }
	// 			});
	// 		}
	// 	}
	// 	for (var ln in this.links) {
	// 		var li = this.links[ln];
	// 		res.push({
	// 			data: {
	// 				id: ln,
	// 				source: `${li.n0}.${li.e0}`,
	// 				target: `${li.n1}.${li.e1}`,
	// 			}
	// 		});
	// 	}
	// 	return res;
	// }
	getDot() {
		var res = [`digraph ${this.name} {`, 'node [width=0.1,height=0.1];', 'rankdir=LR;', 'size="20,20"'];
		for (let nn in this.nodes) {
			var n = this.nodes[nn];
			var nc = knMeta[n.type];
			var label = n.title;
			if (!label) {
				if (n.type == 'Const') {
					label = n.params.join(', ');
				} else {
					label = n.type;
					if (n.params && n.params.length) {
						label += '(' + n.params.join(', ') + ')';
					}
				}
				if (n.name) label += ' ' + n.name;
				// if (n.inpType) label += ' <<' + n.inpType + '>>';
				// if (n.outType) label += ' <<' + n.outType + '>>';
			}
			var s = '{{';
			s += nc.inpList.map(e => `<${e}> ${e}`).join('|');
			s += '}|' + label + '|{';
			s += nc.outList.map(e => `<${e}> ${e}`).join('|');
			s += '}}';
			res.push(`n_${nn}[id="${nn}",shape=record,label="${s}"];`);
		}
		res.push('{ rank = source; ');
		res.push(this.inpList.map(e => `n_${e}`).join(';'));
		res.push('};');
		res.push('{ rank = sink; ');
		res.push(this.outList.map(e => `n_${e}`).join(';'));
		res.push('};');
		for (var ln in this.links) {
			var li = this.links[ln];
			res.push(`n_${li.n0}:${li.e0} -> n_${li.n1}:${li.e1};`);
		}
		res.push('}');
		return res.join('\n');
	}
}

class KNProcMeta extends KNClassMeta {
	constructor(proc) {
		var name = `Proc_${++knProcCount}`;
		super(name);
		this.proc = proc;
		var i = 0;
		for (var p of proc.params) {
			if (!p.name) p.name = '$' + ++i;
			this.addNode({type: 'PIN'}, p.name);
		}
		this.addNode({type: 'POUT'}, 'out');
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
		for (var p of proc.params) {
			var agr = p.agr || '+';
			var af = {
				'+': ['a + b', 0],
				'*': ['a * b', 1],
				'_': ['Math.min(a, b)', 100000],
				'^': ['Math.max(a, b)', -100000],
			}[agr];
			var def = p.def || af[1];
			res.push(`\t\tthis.${p.name} = new PIN(${def}, (a, b) => ${af[0]}, ${af[1]})`);
		}
		if (!body) body = proc.params.map(p => p.name).join(' + ');
		res.push('\t\tthis.out = new POUT();')
		res.push(`\t\tthis.out.plug(Kefir.combine([${proc.params.map(p => 'this.' + p.name + '.stream').join(', ')}], (${proc.params.map(p => p.name).join(', ')}) => ${body}).filter(v => v !== null))`);
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


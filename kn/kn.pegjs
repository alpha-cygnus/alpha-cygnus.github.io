{
	var classes = window.knMeta;
	var _cc = null;
	var _ct = null;
	var _cp = null;
	var _ci = 0;
	var _co = 0;
	var _cvi = 0;
	var newCls = window.knNewClass;
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
	function concatIO(head, tail) {
		var res = head;
		for (var p of tail) {
			res[0] = res[0].concat(p[0]);
			res[1] = res[1].concat(p[1]);
		}
		//console.log('concatIO', head, tail, res);
		return res;
	}
	function linkPoints(p0, p1) {
		//console.log('linking', p0.toString(), p1.toString());
		for (let out of p0[1]) {
			let a = out.split('.');
			let n0 = a[0];
			let e0 = a[1];
			let c0 = knMeta[_cc.nodes[n0].type];
			if (!c0) debugger;
			if (e0.match(/^\d+$/)) e0 = c0.outList[e0];
			let t0 = c0.nodes[e0] && c0.nodes[e0].outType;
			if (!t0) debugger;
			if (!t0) error(`Output ${a[1]} is not defined for ${n0}:${c0.name} in ${_cc.name}`);
			for (let inp of p1[0]) {
				let a = inp.split('.');
				let n1 = a[0];
				let e1 = a[1];
				let c1 = knMeta[_cc.nodes[n1].type];
				if (!c1) debugger;
				if (e1.match(/^\d+$/)) e1 = c1.inpList[e1];
				let t1 = c1.nodes[e1] && c1.nodes[e1].inpType;
				if (!t1) debugger;
				if (!t1) error(`Input ${a[1]} is not defined for ${n1}:${c1.name} in ${_cc.name}`);
				if (t0 != t1) {
					error(`Incompatible connection for ${n0}[${e0}](${t0})->[${e1}]${n1}(${t1}) in ${_cc.name}`);
				}

				let lid = [n0, e0, e1, n1];

				_cc.links[lid.join(',')] = { n0, n1, e0, e1, t: t0 };
			}
		}
		return [p0[0], p1[1]];
	}
}

S = ss:statement* { return [classes, ss]; }

statement = cls
	/ &{ _cc = classes[knMainClass]; return 1 } chain 
	/ &{ _cc = classes[knMainClass]; return 1 } layout:layout { _cc.addLayout(layout) }

cls
	= name:Id COPEN &{
		_cc = newCls(name);
		return true;
	} 
	(
	values:values { _cc.values = values || {} }
	/
	layout:layout { _cc.addLayout(layout) }
	/
	chain:chain
	)*
	CCLOSE { return ["Class", { name }] }

values = ENUM &{ _cvi = 0; return true; } head:v_val tail:(COMMA v:v_val { return v; })* {
	return [head].concat(tail).reduce((res, v) => (res[v.name] = v.val, res), {});
}
v_val = name:Id val:(EQ v:INT {return v})? { 
	if (val !== null) _cvi = val;
	return {name, val: _cvi++ }; 
}

chains = head:chain tail:(SEMI? c:chain { return c} )* { return concatIO(head, tail); }

//chain = head:point &{ _cp = head; return 1; } tail:chain_tail? { return _cp; }
//chain_tail = (lnk:arrow p:point
//	{
//		// p0, p1 == [{inps}, {outs}]
//		let p0 = _cp;
//		let p1 = p;
//	})
//	chain_tail?
chain 
	= head:point tail:(arrow p:point {return p})* {
		return tail.reduce(linkPoints, head);
	}

layout = UI l:l_decls { return l }
l_decls = head:l_decl tail:(PIPE d:l_decl { return d })* { return [head].concat(tail) }
l_decl
	= COPEN ids:l_decls CCLOSE { return ids }
	/ id:decl

arrow
	= ARROW
	//= e0:(end?) ws '-'+ '>' ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0} }
	//= e0:(end?) ws '-'+ w:weight? '-'* '>' ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1} }
	/// e0:(end?) ws '<' ('-' &[-(])* w:weight? '-'+ ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1, back: true} }

//weight = '(' n:(num/id) ')' { return n }

end = BOPEN id:id BCLOSE { return id }

point
	= &{ _ci = _co = _ct = null; return true; } head:node tail:(COMMA node:node { return node; })* { 
		return concatIO(head, tail);
	}
	/ sub_chains

sub_chains = POPEN chains:chains PCLOSE { return chains; }

node = (inp:end? { _ci = inp || _ci; }) id:decl (out:end? { _co = out || _co; }) {
		return [
			[id + '.' + (_ci || 0)],
			[id + '.' + (_co || 0)],
		];
	}
	

decl
	= type:Type id:id? title:title? {
		if (id && _cc.nodes[id]) error(id + " is already defined");
		_ct = type;
		return _cc.addNode(_ct, id, title);
	}
	/ id:id title:title? {
		if (_ct) {
			if (_cc.nodes[id]) error(id + " is already defined");
			return _cc.addNode(_ct, id, title);
		}
		if (!_cc.nodes[id]) error(id + " is not defined");
		return id;
	}

Type
	= type:Id &{
		if (!knMeta[type]) error(`Type ${type} is not defined!`);
		_ct = {type};
		return true;
	}
	ps:params? {
		return knFillParams(_ct, ps);
	}
	/ 
	n:num {
		return {
			type: 'Const',
			params: [n],
			opts: {},
		}
	}
	/
	MUL n:num? {
		return {
			type: 'Gain',
			params: n === null ? [] : [n],
			opts: {},
		}
	}
	/
	p:processing {
		console.log(p);
		// var cp = compileProc(p);
		// console.log(cp);
		return {
			type: knNewProc(p).name,
			params: [],
			opts: {},
		}
	}


processing = COPEN params:proc_params body:(PIPE b:proc_body {return b})? CCLOSE { return {params, body}; }
proc_params = h:proc_param t:(COMMA p:proc_param {return p})* { return [h].concat(t); }
proc_param = agr:AGR? name:id? def:(EQ v:num {return v})? { return {agr, name, def}; }
proc_body = CODE

params = AOPEN 
	head:param tail:(COMMA? p:param { return p })* ACLOSE { return [head].concat(tail) }

param = n:(n:id (EQ/COLON) { return n})?
	v:pval { return {n:n, v: v} }

pval 
	= num
	/ str
	/// note
	/ id:Id {
		if (!_ct) error('No current type??');
		var cls = knMeta[_ct.type];
		var v = cls.values[id];
		if (v === undefined) error(`${id} is not enumerated for ${_ct.type}!`);
		return v;
	}
	/// tseq

num = NUM
str = STR
note = n:NOTE { return noteToInt(n) }
tseq = TSEQ
title = STR2

code = '{' code:CODE '}' { return code; };

abc_melody = abc_sep? abc_point (abc_sep? abc_point)* abc_sep
abc_point = abc_pitch / abc_chord / abc_in_dir / abc_legato
abc_legato = '(' abc_sep ? abc_pitch (abc_sep? abc_pitch)* ')'
abc_pitch = abc_accidental? abc_note abc_octave* abc_duration?
abc_chord = '[' abc_pitch+ ']'
abc_in_dir = '[' abc_dir ']'
abc_sep = '|' / '||' / '[|' / '|]' / ':]' / ':|' / '|:' / '[:' / space
abc_note = [a-g] / [A-G]
abc_accidental = '_' '_'? / '^' '^'? / '='
abc_octave = ',' / "'"
abc_duration = abc_ratio
abc_ratio = INT ('/' INT)? / '/' INT
abc_dir
	= 'L:' abc_ratio
	/ 'K:' abc_key
abc_key = abc_note ('#' / 'b')? ('m' / 'min' / 'maj' / 'mix')?


//--"lexer"

space = [ \t\r\n]
comment = '#' [^\r\n]*
ws "" = (space/comment)*
COPEN = ws '{' ws
CCLOSE = ws '}' ws
UPPER = [A-Z]
LOWER = [a-z]
LETTER = UPPER / LOWER
DIGIT = [0-9]
IDSYM = LETTER / DIGIT / '_'
Id "Identifier" = ws id:$(UPPER IDSYM*) ws { return id; }
id "ident" = ws id:$(LOWER IDSYM*) ws { return id; }
INT "integer" = ws num:$(('+'/'-')? DIGIT+) ws { return parseInt(num, 10); }
NUM "number" = ws num:$(('+'/'-')? DIGIT+ ('.' DIGIT+)?) ws { return parseFloat(num); }
COLON = ws ':' ws
SEMI = ws ';' ws
ARROW "->" = ws '-'+ '>' ws
BOPEN = ws '[' ws
BCLOSE = ws ']' ws
COMMA = ws ',' ws
POPEN = ws '(' ws
PCLOSE = ws ')' ws
AOPEN = ws '<' ws
ACLOSE = ws '>' ws
PIPE = ws '|' ws
EQ = ws '=' ws
STR "string" 
	= ws "'" s:$([^']*) "'" ws { return "'" + s + "'"; }
STR2 "string2" 
	= ws '"' s:$([^"]*) '"' ws { return '"' + s + '"'; }
NOTE = ws n:$([A-H] [#-b]? DIGIT?) ws { return n }
TSEQ = ws s:$([x.]+) ws { return s.split('').map(c => c == 'x' ? 1 : 0) }
ENUM = ws '@enum' ws
UI = ws '@' ('ui'/'UI') ws
AGR = ws a:[*_^+] ws { return a }
MUL = ws '*' ws

CODE = $(([^{}] / '{' CODE '}')*)

{
	var classes = window.knClasses;
	var _cc = null;
	var _ct = null;
	var _cp = null;
	var _ci = 0;
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
	function fillParams(res, ps) {
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
}

S = ss:statement* { return [classes, ss]; }

statement = cls / &{ _cc = classes[knMainClass]; return 1 } chain

cls
	= name:Id COPEN &{
		_cc = newCls(name);
		return true;
	} 
	values:values? &{ _cc.values = values || {}; return true; }
	chains:chains CCLOSE { return ["Class", { name, chains, values }] }

values = ENUM &{ _cvi = 0; return true; } head:v_val tail:(COMMA v:v_val { return v; })* {
	return [head].concat(tail).reduce((res, v) => (res[v.name] = v.val, res), {});
}
v_val = name:Id val:(EQ v:INT {return v})? { 
	if (val !== null) _cvi = val;
	return {name, val: _cvi++ }; 
}

chains = head:chain tail:(SEMI? c:chain { return c} )* { return [head].concat(tail); }

chain = head:point &{ _cp = head; return 1; } chain_tail?
chain_tail = lnk:arrow p:point
	&{
		let p0 = _cp;
		let p1 = p;
		var e0 = lnk.e0;
		var e1 = lnk.e1;
		var w = lnk.w;
		if (typeof w == 'string') {
			if (_cc.nodes[w]) error(w + " is already defined");
		}
		for (let n0 of p0) {
			for (let n1 of p1) {
				let lid = lnk.back
					? [n1, e1, e0, n0]
					: [n0, e0, e1, n1]
				;
				_cc.links[lid.join(',')] = { n0, n1, e0, e1, w };
			}
		}
		_cp = p;
		return 1;
	} chain_tail?

arrow
	= e0:(end?) ws '-'+ w:weight? '-'* '>' ws e1:(end?) { return {e0: e0 || 'out', e1: e1 || 'inp', w: w || 1} }
	/// e0:(end?) ws '<' ('-' &[-(])* w:weight? '-'+ ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1, back: true} }

weight = '(' n:(num/id) ')' { return n }

end = BOPEN id:id BCLOSE { return id }

point = &{ _ct = null; return true; } head:node tail:(COMMA node:node { return node; })* { return [head].concat(tail); }

node = decl

decl
	= type:Type id:id? title:title? {
		_ct = type;
		var wasId = id;
		var ci = _cc.uses[_ct.type] || 0;
		if (!id) id = '_' + _ct.type + '_' + (++ci);
		_cc.uses[_ct.type] = ci;
		if (_cc.nodes[id]) error(id + " is already defined");
		_cc.nodes[id] = Object.create(_ct);
		if (wasId) _cc.nodes[id].name = id;
		if (title) _cc.nodes[id].title = title;
		return id;
	}
	/ id:id ps:params? title:title? {
		if (_ct) {
			if (_cc.nodes[id]) error(id + " is already defined");
			var t = Object.create(_ct);
			if (ps) fillParams(t, ps);
			_cc.nodes[id] = t;
			_cc.nodes[id].name = id;
			if (title) _cc.nodes[id].title = title;
			return id;
		}
		if (!_cc.nodes[id]) error(id + " is not defined");
		return id;
	}

Type
	= type:Id &{
		if (!knClasses[type]) error(`Type ${type} is not defined!`);
		_ct = {type};
		return true;
	}
	ps:params? {
		return fillParams(_ct, ps);
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
proc_param = agr:AGR? name:id def:(EQ v:num {return v})? { return {agr, name, def}; }
proc_body = CODE

params = POPEN 
	& {if (!_ct) error("Can't change params after creation"); return true; }
	head:param tail:(COMMA? p:param { return p })* PCLOSE { return [head].concat(tail) }

param = n:(n:id (EQ/COLON) { return n})? v:pval { return {n:n, v: v} }

pval 
	= num
	/ str
	/// note
	/ id:Id {
		if (!_ct) error('No current type??');
		var cls = knClasses[_ct.type];
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
INT "integer" = ws num:$('-'? DIGIT+) ws { return parseInt(num, 10); }
NUM "number" = ws num:$('-'? DIGIT+ ('.' DIGIT+)?) ws { return parseFloat(num); }
COLON = ws ':' ws
SEMI = ws ';' ws
ARROW "->" = ws '-'+ '>'
BOPEN = ws '[' ws
BCLOSE = ws ']' ws
COMMA = ws ',' ws
POPEN = ws '(' ws
PCLOSE = ws ')' ws
PIPE = ws '|' ws
EQ = ws '=' ws
STR "string" 
	= ws "'" s:$([^']*) "'" ws { return "'" + s + "'"; }
STR2 "string2" 
	= ws '"' s:$([^"]*) '"' ws { return '"' + s + '"'; }
NOTE = ws n:$([A-H] [#-b]? DIGIT?) ws { return n }
TSEQ = ws s:$([x.]+) ws { return s.split('').map(c => c == 'x' ? 1 : 0) }
ENUM = ws '@enum' ws
AGR = ws a:[*_^+] ws { return a }

CODE = $(([^{}] / '{' CODE '}')*)

{
	var classes = window.knClasses;
	var _cc = null;
	var _ct = null;
	var _cp = null;
	var _ci = 0;
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
}

S = ss:statement* { return [classes, ss]; }

statement = cls / &{ _cc = classes[knMainClass]; return 1 } chain

cls
	= name:Id COPEN &{
		_cc = newCls(name);
		return true;
	} chains:chains CCLOSE { return ["Class", { name: name, chains: chains }] }

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
		if (!id) id = '__' + (++_ci);
		if (_cc.nodes[id]) error(id + " is already defined");
		_cc.nodes[id] = Object.create(_ct);
		if (wasId) _cc.nodes[id].name = id;
		if (title) _cc.nodes[id].title = title;
		return id;
	}
	/ id:id title:title? {
		if (_ct) {
			if (_cc.nodes[id]) error(id + " is already defined");
			_cc.nodes[id] = Object.create(_ct);
			_cc.nodes[id].name = id;
			if (title) _cc.nodes[id].title = title;
			return id;
		}
		if (!_cc.nodes[id]) error(id + " is not defined");
		return id;
	}

Type
	= n:Id ps:params? {
		var params = []; //{};
		var opts = {};
		var res = {type: n, params, opts};
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
		return res
	} / 
	n:num {
		return {
			type: 'Const',
			params: [n],
			opts: {},
		}
	}

params = POPEN head:param tail:(COMMA? p:param { return p })* PCLOSE { return [head].concat(tail) }

param = n:(n:id (EQ/COLON) { return n})? v:pval { return {n:n, v: v} }

pval = num / str / note / tseq

num = NUM
str = STR
note = NOTE
tseq = TSEQ
title = STR2

//--"lexer"

space = [ \t\r\n]
comment = '#' [^\r\n]*
ws "" = (space/comment)*
COPEN = ws '{' ws
CCLOSE = ws '}' ws
UPPER = [A-Z] / '$'
LOWER = [a-z] / '_'
LETTER = UPPER / LOWER
DIGIT = [0-9]
IDSYM = LETTER / DIGIT
Id "Identifier" = ws id:$(UPPER IDSYM*) ws { return id; }
id "ident" = ws id:$(LOWER IDSYM*) ws { return id; }
NUM "number" = ws num:$('-'? DIGIT+ ('.' DIGIT+)?) ws { return parseFloat(num); }
COLON = ws ':' ws
SEMI = ws ';' ws
ARROW "->" = ws '-'+ '>'
BOPEN = ws '[' ws
BCLOSE = ws ']' ws
COMMA = ws ',' ws
POPEN = ws '(' ws
PCLOSE = ws ')' ws
EQ = ws '=' ws
STR "string" 
	= ws "'" s:$([^']*) "'" ws { return "'" + s + "'"; }
STR2 "string2" 
	= ws '"' s:$([^"]*) '"' ws { return '"' + s + '"'; }
NOTE = ws n:$([A-H] [#-b]? DIGIT?) { return noteToInt(n) }
TSEQ = ws s:$([x.]+) ws { return s.split('').map(c => c == 'x' ? 1 : 0) }


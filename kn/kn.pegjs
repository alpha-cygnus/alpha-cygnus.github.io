{
	var classes = { };
	var _cc = null;
	var _ct = null;
    var _cp = null;
	var _ci = 0;
    
    function newCls(name) {
		var c = { name: name, nodes: {}, links: {} };
		classes[name] = c;
        return c;
    }
    newCls('@main');
}

S = ss:statement* { return [classes, ss]; }

statement = cls / &{ _cc = classes['@main']; return 1 } chain

cls
	= name:Id &{
    	_cc = newCls(name);
		return true;
	} COPEN chains:chains CCLOSE { return ["Class", { name: name, chains: chains }] }

chains = head:chain tail:(SEMI? c:chain { return c} )* { return [head].concat(tail); }

chain = head:point &{ _cp = head; return 1; } chain_tail?
chain_tail = lnk:arrow p:point &{
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
				_cc.links[lid.join(',')] = { w: w };
			}
		}
        _cp = p;
        return 1;
	} chain_tail?

arrow
	= e0:(end?) ws '-'+ w:weight? '-'* '>' ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1} }
	/ e0:(end?) ws '<' ('-' &[-(])* w:weight? '-'+ ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1, back: true} }

weight = '(' n:(num/id) ')' { return n }

end = BOPEN id:id BCLOSE { return ["End", id] }

point = &{ _ct = null; return true; } head:node tail:(COMMA node:node { return node; })* { return [head].concat(tail); }

node = decl

decl
	= type:Type id:id? {
		_ct = type;
		if (!id) id = '@' + (++_ci);
		if (_cc.nodes[id]) error(id + " is already defined");
		_cc.nodes[id] = _ct;
		return id;
	}
	/ id:id {
		if (_ct) {
			if (_cc.nodes[id]) error(id + " is already defined");
			_cc.nodes[id] = _ct;
			return id;
		}
		if (!_cc.nodes[id]) error(id + " is not defined");
		return id;
	}

Type
	= n:Id ps:params? {
		var params = {};
		var res = [n, params];
		var i = 0;
		for (let p of (ps || [])) {
			let n = p.n;
			if (!n) n = i++;
			params[n] = p.v;
		}
		return res
	}
	/ num

params = POPEN head:param tail:(COMMA p:param { return p })* PCLOSE { return [head].concat(tail) }

param = n:(n:id (EQ/COLON) { return n})? v:val { return {n:n, v: v} }

val = num / str

num = NUM
str = STR

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
STR "string" = ws "'" s:$([^']*) "'" ws { return s }



{
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
			this.location = location();
		}
	}
	class Module extends SyntaxElem {
		constructor(items) {
			super();
			this.items = items;
		}
	}
	class EnumDef extends SyntaxElem {
		constructor(vals) {
			super();
			this.values = vals;
		}
	}
	class EnumValDef extends SyntaxElem {
		constructor(name, val) {
			super();
			this.name = name;
			this.val = val;
		}
	}
	class Chain extends SyntaxElem {
		constructor(head, links) {
			super();
			this.head = head;
			this.links = links;
		}
	}
	class ChainLink extends SyntaxElem {
		constructor(arrow, point) {
			super();
			this.arrow = arrow;
			this.point = point;
		}
	}
	class Layout extends SyntaxElem {
		constructor(lyt) {
			super();
			this.layout = lyt;
		}
	}
	class Point extends SyntaxElem {
		constructor(items) {
			super();
			this.items = items;
		}
	}
	class Node extends SyntaxElem {
		constructor(inp, decl, out) {
			super();
			this.inp = inp;
			this.decl = decl;
			this.out = out;
		}
	}
	class Decl extends SyntaxElem {
		constructor(type, ids, title) {
			super();
			this.type = type;
			this.ids = ids;
			this.title = title;
		}
	}
	class Ref extends SyntaxElem {
		constructor(ids, title) {
			super();
			this.ids = ids;
			this.title = title;
		}
	}
	class TypeRef extends SyntaxElem {
		constructor(name, params) {
			super();
			this.name = name;
			this.params = params;
		}
	}
	class TypeConst extends SyntaxElem {
		constructor(v) {
			super();
			this.value = v;
		}
	}
	class TypeGain extends SyntaxElem {
		constructor(v) {
			super();
			this.value = v;
		}
	}
	class TypeProc extends SyntaxElem {
		constructor(proc) {
			super();
			this.proc = proc;
		}
	}
	class Proc extends SyntaxElem {
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
	class ParamNum extends SyntaxElem {
		constructor(v) {
			super();
			this.value = v;
		}
	}
	class ParamProc extends SyntaxElem {
		constructor(proc) {
			super();
			this.proc = proc;
		}
	}
	class ParamRef extends SyntaxElem {
		constructor(ids) {
			super();
			this.ids = ids;
		}
	}
	class ParamEnum extends SyntaxElem {
		constructor(name) {
			super();
			this.name = name;
		}
	}
}

S = head:statement? tail:(ST_SEP+ s:statement { return s; })* { return [head].concat(tail); }

statement = module
	/ chain
	/ layout:layout

module
	= name:Id COPEN
	items:(
	values:values
	/
	layout:layout
	/
	chain:chain
	)*
	CCLOSE { return new Module(name, items) }

values = ENUM head:v_val tail:(COMMA v:v_val { return v; })* {
	return new EnumDef([head].concat(tail));
}
v_val = name:Id val:(EQ v:INT {return v})? { 
	return new EnumValDef(name, val);
}

//chains = head:chain tail:(SEMI c:chain { return c} )* { return [head].concat(tail); }

layout = UI l:l_decls { return new Layout(l); }
l_decls = head:l_decl tail:(PIPE d:l_decl { return d })* { return [head].concat(tail) }
l_decl
	= COPEN ids:l_decls CCLOSE { return ids }
	/ ids:decl

chain 
	= head:point links:(a:arrow p:point { return new ChainLink(a, p); })* {
		return new Chain(head, links);
	}

arrow
	= ARROW { return { p: false } }
	/ PARROW { return { p: true } }

range = a:INT b:('-' i:INT { return i; })? { return makeRange(a, b) }

idrng = '$' r:range { return r.map(i => '$' + i); }

idr
	= id:id r:idrng? {
		if (!r) return [id];
		return r.map(i => id + i);
	}
	/ r:idrng

ports = BOPEN h:port1 t:(COMMA e:port1 {return e})* BCLOSE { return t.reduce((a, b) => a.concat(b), h); }
port1
	= idr:idr { return idr }
	/ range
	
point
	= head:item tail:(COMMA item:item { return item; })* { 
		return new Point([head].concat(tail));
	}
	/// sub_chains

item
	= node
	/ POPEN c:chain PCLOSE { return c; }

//sub_chains = POPEN chains:chains PCLOSE { return chains; }

node = inp:ports? decl:decl out:ports? {
		return new Node(inp, decl, out);
	}
	

decl
	= type:Type idr:idr? title:title? {
		return new Decl(type, idr, title);
	}
	/ idr:idr title:title? {
		return new Ref(idr, title);
	}

Type
	= type:Id ps:params? {
		return new TypeRef(type, ps);
	}
	/ 
	n:num {
		return new TypeConst(n);
	}
	/
	MUL n:num? {
		return new TypeGain(n);
	}
	/
	p:processing {
		console.log(p);
		return new TypeProc(p);
	}

processing = COPEN params:proc_params body:(PIPE b:proc_body {return b})? CCLOSE { return new Proc(params, body); }
proc_params = h:proc_param t:(COMMA p:proc_param {return p})* { return [h].concat(t); }
proc_param = agr:AGR? name:id? def:(EQ v:num {return v})? { return new ProcParam(agr, name, def); }
proc_body = CODE

params = AOPEN head:param tail:(COMMA? p:param { return p })* COMMA? ACLOSE { return [head].concat(tail) }

param = pval
	// n:(n:id (EQ/COLON) { return n})?
	// v:pval { return {n:n, v: v} }

pval 
	= n:num { return new ParamNum(n); }
	/ p:processing { return new ParamProc(p); }
	/ idr:idr { return new ParamRef(ids); }
	/// str
	/// note
	/ id:Id { return new ParamEnum(id); }

num = HEX / BIN / QNUM / OCT / NUM
str = STR
note = n:NOTE { return noteToInt(n) }
tseq = TSEQ
title = STR2

code = '{' code:CODE '}' { return code; };

//--"lexer"

space = [ \t\r\n]
space0 = [ \t]
comment = '#' [^\r\n]*
ws "" = (space/comment)*
ws0 "" = (space0/comment)*
EOL = [\r\n]+
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
HEX "hexadecimal" =  ws '0x' hex:$([0-9A-Fa-f]+) ws { return parseInt(hex, 16); }
BIN "binary" =  ws '0b' hex:$([01]+) ws { return parseInt(hex, 2); }
QNUM "quaternary" =  ws '0q' n:$([0-3]+) ws { return parseInt(n, 4); }
OCT "binary" =  ws '0o' n:$([0-7]+) ws { return parseInt(n, 8); }
NUM "number" = ws num:$(('+'/'-')? DIGIT+ ('.' DIGIT+)?) ws { return parseFloat(num); }
COLON = ws ':' ws
SEMI = ws ';' ws
ARROW "->" = ws '-'+ '>' ws
PARROW "=>" = ws '='+ '>' ws
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

ST_SEP = SEMI

START_ABC = ('@start_abc' / '@startABC') ws0 EOL ws
END_ABC = ('@end_abc' / '@endABC') ws

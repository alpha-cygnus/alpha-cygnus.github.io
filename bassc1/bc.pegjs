{
	var classes = window.bcMeta;
	var _cc = null;
	var _ct = null;
	var _cp = null;
	var _ci = 0;
	var _co = 0;
	var _cvi = 0;
	var newCls = window.bcNewClass;
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
	function linkOutInp(out, inp) {
		let a0 = out.split('.');
		let n0 = a0[0];
		let e0 = a0[1];
		let c0 = bcMeta[_cc.nodes[n0].type];
		if (!c0) debugger;
		if (e0.match(/^\d+$/)) e0 = c0.outList[e0];
		let t0 = c0.nodes[e0] && c0.nodes[e0].outType;
		if (!t0) debugger;
		if (!t0) error(`Output ${a0[1]} is not defined for ${n0}:${c0.name} in ${_cc.name}`);
		
		let a1 = inp.split('.');
		let n1 = a1[0];
		let e1 = a1[1];
		let c1 = bcMeta[_cc.nodes[n1].type];
		if (!c1) debugger;
		if (e1.match(/^\d+$/)) e1 = c1.inpList[e1];
		let t1 = c1.nodes[e1] && c1.nodes[e1].inpType;
		if (!t1) debugger;
		if (!t1) error(`Input ${a1[1]} is not defined for ${n1}:${c1.name} in ${_cc.name}`);
		if (t0 != t1) {
			error(`Incompatible connection for ${n0}[${e0}](${t0})->[${e1}]${n1}(${t1}) in ${_cc.name}`);
		}

		let lid = [n0, e0, e1, n1];

		_cc.links[lid.join(',')] = { n0, n1, e0, e1, t: t0 };
	}
	function linkPoints(p0, p1) {
		//console.log('linking', p0.toString(), p1.toString());
		for (let out of p0[1]) {
			for (let inp of p1[0]) {
				linkOutInp(out, inp);
			}
		}
		return [p0[0], p1[1]];
	}
	function linkPointsP(p0, p1) {
		var olen = p0[1].length;
		var ilen = p1[0].length;
		if (olen != ilen) error('Input-output list length mismatch:' + p0[1].toString() + ',' + JSON.stringify(p1[0]));
		for (var i = 0; i < ilen; i++) {
			linkOutInp(p0[1][i], p1[0][i]);
		};
		return [p0[0], p1[1]];
	}
	function makeRange(a, b) {
		var res = [a];
		if (b === null) b = a;
		if (b < a) return res;
		for (var i = a + 1; i <= b; i++) res.push(i);
		return res;
	}
	var _abcState = {};
}

S = ss:statement* { return [classes, ss]; }

statement = cls
	/ &{ _cc = classes[bcMainClass]; return 1 } chain 
	/ &{ _cc = classes[bcMainClass]; return 1 } layout:layout { _cc.addLayout(layout) }
	/ &{ _cc = classes[bcMainClass]; return 1 } melody:melody { _cc.addMelody(melody) }

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

melody = START_ABC m:abc_melody END_ABC { return m }

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
layout = UI l:l_decls { return l }
l_decls = head:l_decl tail:(PIPE d:l_decl { return d })* { return [head].concat(tail) }
l_decl
	= COPEN ids:l_decls CCLOSE { return ids }
	/ ids:decl

chain 
	= head:point tail:(a:arrow p:point {return [a, p]})* {
		return tail.reduce((res, ap) => {
			var a = ap[0], p = ap[1];
			return a.p ? linkPointsP(res, p) : linkPoints(res, p);
		}, head);
	}

arrow
	= ARROW { return { p: false } }
	/ PARROW { return { p: true } }
	//= e0:(end?) ws '-'+ '>' ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0} }
	//= e0:(end?) ws '-'+ w:weight? '-'* '>' ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1} }
	/// e0:(end?) ws '<' ('-' &[-(])* w:weight? '-'+ ws e1:(end?) { return {e0: e0 || 0, e1: e1 || 0, w: w || 1, back: true} }

//weight = '(' n:(num/id) ')' { return n }

end = BOPEN id:(id/INT) BCLOSE { return id }

idr = id:id r:('$' a:INT b:('-' i:INT { return i; })? { return makeRange(a, b); })? {
	if (!r) return [id];
	return r.map(i => id + '$' + i);
}

ends = BOPEN h:end1 t:(COMMA e:end1 {return e})* BCLOSE { return t.reduce((a, b) => a.concat(b), h); }
end1
	= idr:idr { return idr }
	/ a:INT b:('-' i:INT { return i; })? { return makeRange(a, b) }
	
point
	= &{ _ci = _co = _ct = null; return true; } head:node tail:(COMMA node:node { return node; })* { 
		//if (tail.length) debugger;
		return concatIO(head, tail);
	}
	/ sub_chains

sub_chains = POPEN chains:chains PCLOSE { return chains; }


node = (inp:ends? { _ci = inp || _ci; }) idr:decl (out:ends? { _co = out || _co; }) {
		var cis = _ci || [0];
		var cos = _co || [0];
		var res = [[], []];
		for (var id of idr) {
			for (var ci of cis) res[0].push(id + '.' + ci);
			for (var co of cos) res[1].push(id + '.' + co);
		}
		return res;
		// return [
		// 	[id + '.' + (_ci || 0)],
		// 	[id + '.' + (_co || 0)],
		// ];
	}
	

decl
	= type:Type idr:idr? title:title? {
		_ct = type;
		if (!idr) return [_cc.addNode(_ct, null, title)];
		for (var id of idr) {
			if (_cc.nodes[id]) error(id + " is already defined");
			_cc.addNode(_ct, id, title)
		}
		return idr;
	}
	/ idr:idr title:title? {
		for (var id of idr) {
			if (_ct) {
				if (_cc.nodes[id]) error(id + " is already defined");
				_cc.addNode(_ct, id, title);
			}
			if (!_cc.nodes[id]) error(id + " is not defined");
		}
		return idr;
	}

Type
	= type:Id &{
		if (!bcMeta[type]) error(`Type ${type} is not defined!`);
		_ct = {type};
		return true;
	}
	ps:params? {
		return bcFillParams(_ct, ps);
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
			type: bcNewProc(p).name,
			params: [],
			opts: {},
		}
	}


processing = COPEN params:proc_params body:(PIPE b:proc_body {return b})? CCLOSE { return {params, body}; }
proc_params = h:proc_param t:(COMMA p:proc_param {return p})* { return [h].concat(t); }
proc_param = agr:AGR? name:id? def:(EQ v:num {return v})? { return {agr, name, def}; }
proc_body = CODE

params = AOPEN 
	head:param tail:(COMMA? p:param { return p })* COMMA? ACLOSE { return [head].concat(tail) }

param = n:(n:id (EQ/COLON) { return n})?
	v:pval { return {n:n, v: v} }

pval 
	= num
	/ str
	/// note
	/ id:Id {
		if (!_ct) error('No current type??');
		var cls = bcMeta[_ct.type];
		var v = cls.values[id];
		if (v === undefined) error(`${id} is not enumerated for ${_ct.type}!`);
		return v;
	}
	/// tseq

num = HEX / BIN / QNUM / OCT / NUM
str = STR
note = n:NOTE { return noteToInt(n) }
tseq = TSEQ
title = STR2

code = '{' code:CODE '}' { return code; };


abc_note
	= ds:abc_deco* pitch:(abc_pitch / abc_chord) len:abc_length? {
		var deco = ds.reduce((res, d) => { res[d] = 1; return res }, {})
		if (len) {
			len[0] *= _abcState.len[0];
			len[1] *= _abcState.len[1];
		} else {
			len = [_abcState.len[0], _abcState.len[1]];
		}
		return {k: 'note', deco, pitch, len, legato: _abcState.legato};
	}
abc_deco
	= '.' { return '.' }
	/ 'L' { return '>' }
	/ '!>!' { return '>' }
abc_accidental
	= '_' { return -1 }
	/ '__' { return -2 }
	/ '^' { return +1 }
	/' ^^' { return +2 }
	/ '=' { return 0 }
abc_octave
	= ',' { return -1 }
	/ "'" { return +1 }
abc_length
	= d:'/'+ { return [1, 1 << d.length] }
	/ '/' d:INT { return [1, d] }
	/ n:INT d:('/' d:INT {return d})? { return [n, (d ? d : 1)] }
abc_letter
	= c:[a-g] { return {c: c.toUpperCase(), o: 1 } }
	/ c:[A-G] { return {c: c, o: 0} }
abc_pitch = acc:abc_accidental? l:abc_letter os:abc_octave* {
	var char = l.c;
	var oct = os.reduce((res, o) => res + o, l.o);
	if (!acc) {
		acc = _abcState.curAcc[char] || _abcState.scale[char];
	}
	_abcState.curAcc[char] = acc;
	return {acc, char, oct};
}
abc_chord = '[' ps:abc_pitch+ ']' { return ps }
abc_chord_str = STR2

abc_sequence = head:abc_point tail:(ws p:abc_point ws { return p })* {
	var res = head;
	for (var t of tail) res = res.concat(t);
	return res;
}
abc_point
	= abc_broken
	/ note:abc_note g:abc_glide? {
		if (g) note.glide = true;
		return [note];
	}
	/ r:abc_rest { return [r] }
	/ b:abc_bar { _abcState.curAcc = {}; return b }
	/ chord:abc_chord_str { return [{k: 'chord', chord}]}
	/ '[' abc_inset ']' { return [] }
	/ abc_tuplet
	/ ws '(' ws { _abcState.legato++ }
	/ ws ')' ws { _abcState.legato-- }
abc_inset
	= 'K:' n:[0-7] a:[#b] { _abcState.scale = abcScales[n*(a == 'b' ? -1 : 1)]; }
	/ 'K:' s:$([A-G][#b]'m')? { var ss = abcScales[s]; if (!s) error('Unsupported scale: ' + s); _abcState.scale = ss }
	/ 'L:' n:INT '/' d:INT { _abcState.len = [n, d]; }
abc_tuplet
	= '(2' ws n1:abc_note ws n2:abc_note { 
		n1.len[0] *= 3; n1.len[1] *= 2;
		n2.len[0] *= 3; n2.len[1] *= 2;
		return [n1, n2]
	}
	/ '(3' ws n1:abc_note ws n2:abc_note ws n3:abc_note { 
		n1.len[0] *= 2; n1.len[1] *= 3;
		n2.len[0] *= 2; n2.len[1] *= 3;
		n3.len[0] *= 2; n3.len[1] *= 3;
		return [n1, n2, n3];
	}
	/ '(4' ws n1:abc_note ws n2:abc_note ws n3:abc_note ws n4:abc_note { 
		n1.len[0] *= 3; n1.len[1] *= 4;
		n2.len[0] *= 3; n2.len[1] *= 4;
		n3.len[0] *= 3; n3.len[1] *= 4;
		n4.len[0] *= 3; n4.len[1] *= 4;
		return [n1, n2, n3, n4];
	}
abc_rest = [zx] len:abc_length { return {k: 'rest', len}}
abc_broken
	= &{ return true; } note1:(abc_note/abc_rest) ws s:abc_broken_sep ws note2:(abc_note/abc_rest) {
		note1.len[0] *= s[0];
		note1.len[1] *= s[2];
		note2.len[0] *= s[1];
		note2.len[1] *= s[2];
		return [note1, note2]
	}
abc_broken_sep
	= '>' { return [3, 1, 2] }
	/ '>>' { return [7, 1, 4] }
	/ '>>>' { return [15, 1, 8] }
	/ '<' { return [1, 3, 2] }
	/ '<<' { return [1, 7, 4] }
	/ '<<<' { return [1, 15, 8] }
abc_bar
	= ':|' { return [{k:'rep_end'}] }
	/ '::' { return [{k:'rep_start'}, {k:'rep_end'}] }
	/ '|:' { return [{k:'rep_start'}] }
	/ '|' { return [] }
abc_glide = '-'

abc_melody = &{
		_abcState = {
			scale: abcScales[0],
			len: [1, 8],
			curAcc: {},
			legato: 0,
		};
		return true;
	}
	s:abc_sequence
	{ return s; }

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

START_ABC = ('@start_abc' / '@startABC') ws0 EOL ws
END_ABC = ('@end_abc' / '@endABC') ws

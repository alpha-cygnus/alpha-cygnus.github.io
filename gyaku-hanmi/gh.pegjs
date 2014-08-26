G = rulesep* h:rule t:(rulesep+ i:rule {return i})* rulesep* { return [h].concat(t) }

ws = (' ' / '\t')

ows = ws?

rule = ows name:lhs ows eq ows rhs:rhs ows { return ['rule', name, rhs] }

lhs = id

id = h:[a-z-]i t:[a-z0-9-]i* { return [h].concat(t).join('')}

rhs = ralt

rprim
	= '(' ows sub:rhs ows ')' { return sub }
	/ name:name { return ['id', name] }
	/ s:string { return ['str', s] }

rterm = base:rprim ows mod:( '?' / '*' / '+' )? { return mod ? [mod, base] : base }

rseq = h:rterm t:(ows i:rterm { return i })* { return t && t.length ? ['seq', h].concat(t) : h }

ralt = h:rseq t:(ows alt ows i:rseq { return i } )* { return t && t.length ? ['alt', h].concat(t) : h }

name = id

string
	= '\"' content:[^\"]* '\"' { return content.join(""); }
	/ "\'" content:[^\']* "\'" { return content.join(""); }

alt = '|' / '/'

rulesep = ';' / '\r' / '\n'

eq = '=' / '->'
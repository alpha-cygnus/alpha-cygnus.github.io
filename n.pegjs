{
	var classes = {};
    var _cc = null;
    var _ct = null;
    var _ci = 0;
}

S = c:cls { return [classes, c]; }

ws "" = [ \t\r\n]*
COPEN = ws '{' ws
CCLOSE = ws '}' ws
UPPER = [A-Z] / '$'
LOWER = [a-z] / '_'
LETTER = UPPER / LOWER
DIGIT = [0-9]
IDSYM = LETTER / DIGIT
Id "Identifier" = ws id:$(UPPER IDSYM*) ws { return id; }
id "ident" = ws id:$(LOWER IDSYM*) ws { return id; }
NUM "number" = ws num:$('-'? DIGIT+ ('.' DIGIT+)?) ws { return num }
COLON = ws ':' ws
SEMI = ws ';' ws
ARROW "->" = ws '-'+ '>'
BOPEN = ws '[' ws
BCLOSE = ws ']' ws
COMMA = ws ',' ws
POPEN = ws '(' ws
PCLOSE = ws ')' ws
EQ = ws '=' ws
STR "string" = ws "'" [^']* "'" ws

num = NUM
str = STR

cls
	= name:Id &{
    	_cc = { name: name, nodes: {}, links: {} };
        classes[name] = _cc;
		return true;
	} COPEN chains:chains CCLOSE { return ["Class", { name: name, chains: chains }] }

chains = head:chain tail:(SEMI? c:chain { return c} )* { return [head].concat(tail); }

chain = head:point tail:(arrow point)* {
	var res = [head];
    var p0 = head;
    for (let a of tail) {
    	var p1 = a[1];
        var e0 = a[0][0];
        var e1 = a[0][1];
        for (let n0 of p0) {
        	for (let n1 of p1) {
            	let lid = `${n0}.${e0}->${e1}.${n1}`;
            	_cc.links[lid] = 1;
            }
        }
        res.push(p0, e0, e1, p1);
        p0 = p1;
    }
    return res
}

arrow = e1:(end?) ARROW e2:(end?) { return [e1 || 0, e2 || 0] }

end = BOPEN id:id BCLOSE { return ["End", id] }

point = &{_ct = null; return true; } head:node tail:(COMMA node:node { return node; })* { return [head].concat(tail); }

node = decl

decl //id:id type:(COLON type:Type { return type })? { return type ? ["Decl", id, type] : ["id", id] }
	= type:Type id:id? {
    	_ct = type;
        if (!id) id = '_' + (++_ci);
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

Type = Id params? / num

params = POPEN param (COMMA param)* PCLOSE

param = (id (EQ/COLON))? val

val = num / str


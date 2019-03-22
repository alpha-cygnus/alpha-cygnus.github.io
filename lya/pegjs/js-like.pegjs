S = d:def ds:(eol dd: def {return dd})* eol? { return ds.reduce((ds, d) => ({...ds, ...d}), d) }
def = _ n:(n:Id _ '=' {return n})? _ t:term { return {[n || '_']: t} }
args = _ v:var _ {return [v]} / _ '(' _ vs:vars _ ')' _ {return vs}
vars = _ v:var _ vs:(_ ',' _ vv:var _ {return vv})* { return [v].concat(vs) }
var = _ id:id _ {return id}

abs = _ as:args _ '=>' _ t:term _ { return as.reduceRight((t, a) => ({[a]: t}), t) }
app = _ '(' _ t:term _ ts:( _ ',' _ tt:term _ {return tt})* _ ')' _ { return [t].concat(ts) }
prim = ref / abs / var / parens
parens = _ '(' _ t:term _ ')' _ { return t }
term = p:prim as:app* { return as.reduce((as, a) => [...as, ...a], []).reduce((res, a) => [res, a], p) }
ref = _ id:Id _ { return id }

id = $([a-z][a-zA-Z0-9_']*)
Id = $([A-Z_][a-zA-Z0-9_']*)
__ = ' '
eol = [\r\n]+
_ = __*

S = d:def ds:(eol dd: def {return dd})* eol? { return ds.reduce((ds, d) => ({...ds, ...d}), d) }
def = _ n:(n:Id _ '=' {return n})? _ t:term { return {[n || '_']: t} }
term = _ ps:prim+ _ { return ps.reduce((pp, p) => [pp, p]) }
prim = var / name / abs / parens
var = _ id:id _ { return id }
name = _ n:Id _ { return n }
abs = _ '\\' _ vs:var+ _ dot _ t:term _ { return vs.reduceRight((tt, v) => ({[v]: tt}), t) }
parens = _ '(' _ t:term _ ')' _ { return t }

id = $([a-z][0-9_']*)
dot = '.'/'->'
Id = $([A-Z][a-z0-9_']*)
_ = __?
__ = ' '
eol = [\r\n]+

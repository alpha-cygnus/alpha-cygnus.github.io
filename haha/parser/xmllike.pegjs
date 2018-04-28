XmlLike = Tag

Tag = _ "<" _ n:TagName _ as:Attr* _ et:TagEnd _ {
	if (et.name && et.name !== n) error('tag mismatch');
	return [n, as.reduce((r, a) => ({...r, ...a}), {}), ...et.subs]
}

TagEnd = "/>" { return {subs: []} }
	/ ">" _ subs:Tag* _ "</" _ name:TagName _ ">" { return {subs, name} }
    
TagName = $(letter (letter / digit)*)

Attr = n:AttrName _ ("="/":") _ v:AttrValue _ { return {[n]: v} }

AttrName = $(letter (letter / digit)*)

AttrValue = '"' s:($([^"]) / '\\' c:[.] { return c })* '"' {return s.join(''); }
  / ds:$(("+"/"-")? digit+ ('.' digit+)?) { return parseInt(ds, 10); }

letter = [a-zA-Z]
digit = [0-9]

_ "whitespace"
  = [ \t\n\r]*

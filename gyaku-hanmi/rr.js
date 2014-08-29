// Romaji -> Rushiji, hehe.

var RR = (function() {
	var trs =
		[	{	sh: 'sy'
			,	ch: 'ty'
			//,	ts: 't'
			,	j: 'zy'
			,	nb: 'mb'
			,	np: 'mp'
			,	nm: 'mm'
			}
		,	{	ii: 'ij' // ?
			,	ai: 'aj'
			,	ui: 'uj'
			,	oi: 'oj'
			,	ei: 'ej'
			}
		,	{	yi: 'и'
			,	ya: 'я'
			,	yu: 'ю'
			,	yo: 'ё'
			,	ts: 'ц'
			}
		,	{	a: 'а'
			,	i: 'и'
			,	u: 'у'
			,	e: 'э'
			,	o: 'о'
			}
		,	{	k: 'к'
			,	s: 'с'
			,	t: 'т'
			,	n: 'н'
			,	m: 'м'
			,	h: 'х'
			,	f: 'ф'
			,	r: 'р'
			,	w: 'в'
			,	v: 'в'
			,	g: 'г'
			,	z: 'дз'
			,	d: 'д'
			,	b: 'б'
			,	p: 'п'
			,	j: 'й'
			}
		// ,	{	'аи': 'ай'
		// 	,	'ои': 'ой'
		// 	,	'уи': 'уй'
		// 	,	'эи': 'эй'
		// 	,	'яи': 'яй'
		// 	,	'юи': 'юй'
		// 	,	'ёи': 'ёй'
		// 	}
		];
	
	function makeTr(tr) {
		var re = new RegExp(Object.keys(tr).join('|'), 'gi');
		return function(s) {
			return (s || '').toString().replace(re, function(ss) {
				return tr[ss] || ss;
			});
		}
	}
	
	hepburn2polivanov = function hepburn2polivanov(s) {
		for (var i = 0; i < trs.length; i++) {
			s = makeTr(trs[i])(s);
		};
		return s;
	}
	
	return {
		hepburn2polivanov: hepburn2polivanov
	}
})();
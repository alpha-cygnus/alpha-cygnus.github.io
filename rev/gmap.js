define(function() {
	"use strict";
	function *map(f, g) {
		if (!g) g = this;
		if (typeof f !== 'function') f = x => x;
		for (let x of g) {
			yield f(x);
		}
	}
	function *mapGen(f, g) {
		if (!g) g = this;
		for (let x of g) {
			yield *f(x);
		}
	}
	function foldl(f, a = null, g) {
		if (!g) g = this;
		if (typeof f !== 'function') f = (a, b) => 0;
		for (let x of g) {
			a = (a === null) ? x : f(a, x);
		}
		return a;
	}
	function *take(n = 1, g) {
		if (!g) g = this;
		var i = 0;
		for (let x of g) {
			if (i < n) yield x;
			else return;
			i++;
		}
	}
	function *range(from = 0, to = null, step = 1) {
		for (let x = from; to === null || (step < 0 ? x >= to : x <= to); x += step) {
			yield x;
		}
	}
	function isIterable(g) {
		return !!g[Symbol.iterator];
	}
	function *gen(g) {
		if (!g) return;
		if (arguments.length > 1 || !isIterable(g)) g = arguments;
		for (let x of g) {
			yield x;
		}
	}
	function *zip(g, g2) {
		if (!g2) {
			g2 = g;
			g = this;
		}
		var iter = g2[Symbol.iterator]();
		for (let x of g) {
			var next = iter.next();
			if (next.done) return;
			yield [x, next.value];
		}
	}
	function * mul(g, g2) {
		if (!g2) {
			g2 = g;
			g = this;
		}
		g2 = [...g2];
		for (let x of g) {
			for (let y of g2) {
				yield [x, y];
			}
		}
	}
	var genProto = range(0, 1).__proto__.__proto__;
	genProto.map = map;
	genProto.mapGen = mapGen;
	genProto.take = take;
	genProto.foldl = foldl;
	genProto.zip = zip;
	genProto.mul = mul;
	return {
		map,
		foldl,
		take,
		range,
		gen,
		zip,
		mul,
	}
});
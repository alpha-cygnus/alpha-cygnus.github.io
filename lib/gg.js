/* uses oo.js */

var GG = (function ($, OO, undefined) {
	var GBase = OO.inherit(function GBase() {}, OO.Base, {
		generate: function(ctx) {
			return null;
		}
	});
	
	var rules = {};
	
	var GRule = OO.inherit(function GRule() {}, GBase, {
		_alias: 'rule',
		_init: function (name, rhs) {
			this.name = name;
			this.rhs = OO.fromList(rhs);
			rules[this.name] = this;
			return this;
		},
		generate: function(ctx) {
			return this.rhs.generate(ctx);
		},
	});
	OO.inherit(function GAlt() {}, GBase, {
		_alias: 'alt',
		_init: function () {
			this.alt = $.map(arguments, OO.fromList);
		},
		generate: function(ctx) {
			var i = Math.floor(Math.random()*this.alt.length);
			return this.alt[i].generate(ctx);
		},
	});
	OO.inherit(function GSeq() {}, GBase, {
		_alias: 'seq',
		_init: function () {
			this.seq = $.map(arguments, OO.fromList);
		},
		generate: function(ctx) {
			return this.seq.map(function(i) { return i.generate(ctx); });
		},
	});
	var Mod = OO.inherit(function GMod() {}, GBase, {
		min: 0, max: 1,
		_init: function (base) {
			this.base = OO.fromList(base);
		},
		generate: function(ctx) {
			var res = [];
			var cnt = Math.random()*(this.max - this.min + 1) + this.min;
			for (var i = 1; i < cnt; i++) {
				res.push(this.base.generate(ctx));
			};
			return res;
		},
	});
	OO.inherit(function GOpt() {}, Mod, {
		_alias: '?',
		min: 0, max: 1,
	});
	OO.inherit(function GMany() {}, Mod, {
		_alias: '*',
		min: 0, max: 10,
	});
	OO.inherit(function GMany1() {}, Mod, {
		_alias: '+',
		min: 1, max: 10,
	});
	OO.inherit(function GId() {}, GBase, {
		_alias: 'id',
		_init: function(name) {
			this.name = name;
		},
		generate: function(ctx) {
			if (rules[this.name]) return rules[this.name].generate(ctx);
			return this.name;
		},
	});
	OO.inherit(function GStr() {}, GBase, {
		_alias: 'str',
		_init: function(str) {
			this.str = str;
		},
		generate: function(ctx) {
			return this.str;
		},
	});
	
	return {
		rules: rules,
		Rules: GRule,
	}
})(jQuery, OO);


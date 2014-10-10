var OO = (function ($) {
	function Base() {
		
	}
	Base.prototype = {
		_debug: function() {
			debugger;
			return this;
		},
		_log: function() {
			console.log.apply(console, arguments);
			return this;
		},
		_init: function() {
			return this;
		}
	};
	
	var _classes = {
		Base: Base,
	};
	
	function _regcls(n, f) {
		if (n) {
			_classes[n] = _classes[n] || f;
		}
	}
	
	function _inherit(Child, Parent, fields) {
		fields = fields || {};
		Child.prototype = $.extend(Object.create(Parent.prototype), fields);
		for (var p in Child.prototype) {
			var m = p && p.match && p.match(/^_prop_(\w+)/);
			if (m) {
				Object.defineProperty(Child.prototype, m[1], Child.prototype[p]);
			}
		}
		_regcls(Child.name, Child);
		_regcls(fields._alias, Child);
		return Child;
	}

	function _fromList(list) {
		if (!$.isArray(list)) throw "Bad init list";
		var cn = list[0];
		var cls = _classes[cn];
		if (!cls) throw "Class not found: " + cn;
		var obj = new cls();
		var cnl = cn.split('.');
		if (cnl.length > 1) {
			obj._cls = cnl[1];
			obj._pkg = cnl[0];
		} else {
			obj._cls = cn;
		}
		return obj._init.apply(obj, list.slice(1)) || obj;
	}
	
	var lib = {
		_name: 'OO',
		inherit: _inherit,
		classes: _classes,
		fromList: _fromList,
		regcls: _regcls,
		Base: Base,
	};
	
	lib.newPackage = function(name, init) {
		var res = $.extend(Object.create(lib), {
			_name: name
		});
		window[name] = res;
		if (typeof init == 'function') init.apply(res, [].slice.call(arguments, 2));
		return res;
	};
	lib.newClass = function(Parent, Cons, fields) {
		_inherit(Cons, Parent, fields);
		_regcls(this._name + '.' + Cons.name, Cons);
		this[Cons.name] = Cons;
	};
	lib.newObj = function(list) {
		if ($.isArray(list)) {
			var cn = (list && list[0]).toString();
			if (!cn.match(/[.]/)) list[0] = this._name + '.' + cn;
			var obj = this.fromList(list);
			return obj;
		}
	};
	
	
	return lib;
})(jQuery);


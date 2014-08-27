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
		return obj._init.apply(obj, list.slice(1)) || obj;
	}

	return {
		inherit: _inherit,
		classes: _classes,
		fromList: _fromList,
		regcls: _regcls,
		Base: Base,
	};

})(jQuery);


"use strict";

var mouseCapturer = null;

function setDialValue(elem, v) {
	if (v < -1) v = -1;
	if (v > +1) v = +1;
	$(elem).data('value', v);
	$(elem).css('transform', 'rotate(' + (v*120) + 'deg)');
}

function getDialValue(elem) {
	return $(elem).data('value') || 0;
}

function startUI() {
	$('.UIDial').on('mousedown', e => {
		var elem = e.target;
		mouseCapturer = {
			elem,
			x0: e.screenX, y0: e.screenY,
			v0: getDialValue(elem),
			move(e) {
				var dy = this.y0 - e.screenY;
				var dv = dy/100;
				setDialValue(this.elem, this.v0 + dv);
			}
		}
	});
	$(document).on('mousemove', e => {
		if (mouseCapturer) {
			mouseCapturer.move(e);
		}
	});
	$(document).on('mouseup', e => {
		if (mouseCapturer) {
			mouseCapturer.move(e);
			if (mouseCapturer.up) {
				mouseCapturer.up(e);
			}
			mouseCapturer = null;
		}
	});
}

class UIBasis extends Basis {
	constructor() {
		super();
		this.elem = null;
	}
	getId() {
		return `ui_${_getObjId(this)}`;
	}
	getHTML() {
		return `<div class="dial" id="${this.getId()}"></div>`;
	}
	onStartUI() {
		this.elem = document.getElementById(this.getId());
	}
}

class UIDial extends UIBasis {
	constructor() {
		super();
		this.out = new POUT();
		this.out.produceFromField(this, 'value');
	}
	get value() {
		if (!this.elem) return 0;
		return getDialValue(this.elem);
	}
	getHTML() {
		return `<div class="UI UIDial" id="${this.getId()}"></div>`;
	}
}

class UIDigits extends UIBasis {
	constructor(num) {
		super();
		this.numDigits = num || 2;
		this.inp = new PIN();
		this.value = 0;
		this.prevValue = null;
		this.inp.onValue(v => {
			this.value = v;
		});
		this.isConsumer(t => {
			this.setDigits(this.value);
		});
	}
	setDigits(v) {
		if (!this.elem) return;
		v = Math.round(v);
		if (this.prevValue == v) return;
		var s = '' + v;
		var mc = this.numDigits;
		if (v < 0) {
			//mc--;
			s = '' + (-v);
		}
		if (s.length > mc) s = s.replace(/./g, '9');
		while (s.length < mc) s = '0' + s;
		//if (v < 0) s = '-' + s;
		// console.log('setDigits', v, s);
		for (var i = 0; i < this.numDigits; i++) {
			var $d = $(this.elem).find('._' + i).removeClass('minus null d-0 d-1 d-2 d-3 d-4 d-5 d-6 d-7 d-8 d-9');
			if (s[i] == '-') $d.addClass('minus');
			else $d.addClass('d-' + s[i]);
		}
		if (v < 0) $(this.elem).removeClass('positive').addClass('negative');
		else $(this.elem).addClass('positive').removeClass('negative');
		this.prevValue = v;
	}
	getHTML() {
		var html = [`<div class="UI UIDigits" id="${this.getId()}">`];
		for (var i = 0; i < this.numDigits; i++) {
			html.push(`<div class="seven-seg _${i}">
				<span class="t m"></span>
				<span class="t l"></span>
				<span class="t r"></span>
				<span class="m u"></span>
				<span class="m d"></span>
				<span class="b l"></span>
				<span class="b r"></span>
				<span class="b m"></span>
			</div>`);
		};
		html.push('</div>');
		return html.join('');
	}
}

class UIValue extends UIBasis {
	constructor(num) {
		super();
		this.width = num || 2;
		this.inp = new PIN();
		this.value = 0;
		this.prevValue = null;
		this.inp.onValue(v => {
			this.value = v;
		});
		this.isConsumer(t => {
			this.showValue(this.value);
		});
	}
	showValue(v) {
		if (!this.elem) return;
		v = Math.round(v*1000)/1000;
		if (this.prevValue == v) return;
		var s = ('' + v).replace('-', '&ndash;')
		if (v > 0) s = '+' + s;
		$(this.elem).html(s);
		this.prevValue = v;
	}
	getHTML() {
		return `<div class="UI UIValue" style="width:${this.width*20}px;" id="${this.getId()}"></div>`;
	}
}


"use strict";

var keysToNotes = {
	81: 60,
	50: 61,
	87: 62,
	51: 63,
	69: 64,
	82: 65,
	53: 66,
	84: 67,
	54: 68,
	89: 69,
	55: 70,
	85: 71,
	73: 72,
	57: 73,
	79: 74,
	48: 75,
	80: 76,
	219: -1,
	221: +1,
	// 219: 77, 
	// 187: 78,
	// 221: 79,
	
	90: 48,
	83: 49,
	88: 50,
	68: 51,
	67: 52,
	86: 53,
	71: 54,
	66: 55,
	72: 56,
	78: 57,
	74: 58,
	77: 59,
	188: 60,
	76: 61,
	190: 62,
	186: 63,
	191: 64,
};

window.keyNoteStream = Kefir.pool();

window.bcKeyboardEnabled = false;

$(function() {
});


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

class UILED extends UIBasis {
	constructor(color) {
		super();
		color = color || 0xFF0000
		this.color = color; // 0xRRGGBB
		this.r = ((color >> 16) & 0xFF)/255;
		this.g = ((color >> 8) & 0xFF)/255;
		this.b = (color & 0xFF)/255;
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
		//v = Math.round(v*1000)/1000;
		if (this.prevValue !== null && Math.abs(this.prevValue - v) < 0.001) return;
		if (v < 0) v = 0;
		if (v > 1) v = 1;

		$(this.elem).css('color', 
			//`rgba(${Math.round(this.r*255)}, ${Math.round(this.g*255)}, ${Math.round(this.b*255)}, ${v})`);
			`rgb(${Math.round(this.r*v*255)}, ${Math.round(this.g*v*255)}, ${Math.round(this.b*v*255)})`);
		this.prevValue = v;
	}
	getHTML() {
		return `<div class="UI UILED" style="width:${this.width*20}px;" id="${this.getId()}"></div>`;
	}
}

function isMidiKeys(keyNoteStream) {
	this.out = new MIDIOUT();
	this.octave = 0;
	// var noteOns = {};
	// this.noteOns = noteOns;
	this.buffer = [];
	var maxBuf = 100;
	var midis = keyNoteStream
		.filter(v => {
			var note = v.note;
			// if (v.down && noteOns[note]) return false;
			if (note > 1) return true;
			if (!v.down) {
				if (note === +1) this.octave++;
				else if (note === -1) this.octave--;
				if (this.octave < -4) this.octave = -4;
				if (this.octave > 5) this.octave = 5;
			}
		})
		.map(v => {
			var note = v.note;
			// if (v.down) noteOns[note] = 1;
			// else delete noteOns[note];
			return {
				t: v.down ? 'on' : 'off',
				n: note + this.octave*12,
				o: this.octave,
				v: 127,
			};
		})
		.onValue(v => {
			this.buffer.push(v);
			while (this.buffer.length > maxBuf) this.buffer.shift(); // sanity
			console.log(this.buffer);
		});
	//this.out.plug(midis);
	this.out.produceFromBuffer(this, 'buffer');
}

class Keyboard extends Basis {
	constructor() {
		super();
		var keysDown = {};
		var keyFilter = e => window.bcKeyboardEnabled && !e.metaKey && !e.shiftKey && !e.ctrlKey && keysToNotes[e.keyCode];
		var kdns = Kefir.fromEvents(window, 'keydown')
			.filter(keyFilter)
			.filter(e => !keysDown[e.keyCode])
			.map(e => {
				keysDown[e.keyCode] = 1;
				return {note: keysToNotes[e.keyCode], down: true};
			});
		var kups = Kefir.fromEvents(window, 'keyup')
			.filter(keyFilter)
			.map(e => {
				delete keysDown[e.keyCode];
				return {note: keysToNotes[e.keyCode], down: false};
			});
		
		var keyNoteStream = Kefir.merge([kdns, kups]);
		window.keyNoteStream.plug(keyNoteStream);
		
		isMidiKeys.call(this, keyNoteStream);
	}
}

class UIKeyboard extends UIBasis {
	constructor() {
		super();
		this.keyNoteStream = Kefir.pool(); //merge([uiKbdDown, uiKbdUp]);
		window.keyNoteStream.plug(this.keyNoteStream);
		
		isMidiKeys.call(this, this.keyNoteStream);
		this.inp = new MIDIIN();
		this.range = [24, 113];
	}
	getHTML() {
		function isWhite(n) {
			return {
				 0: ['C', 'bl'],
				 2: ['D', ' '],
				 4: ['E', 'br'],
				 5: ['F', 'w1 bl'],
				 7: ['G', 'w1'],
				 9: ['A', 'w1'],
				11: ['B', 'w1 br']
			}[n%12];
		}
		var html = `
		<div class="UIKeyboard" id="${this.getId()}">
			<div class="kbd-top"></div>
			<div class="kbd" style="display:block">
				<div class="kbd-up">`
		for (var n = this.range[0]; n < this.range[1]; n++) {
			var w = isWhite(n);
			if (w) {
				// if (n == this.range[1] - 1) s += ' br';
				// if (n == this.range[0]) s += ' bl';
				var s = w[1];
				html += `<span data-note="${n}" class="w up ${s}">&nbsp;</span>`;
			} else {
				html += `<span data-note="${n}" class="k up"><span class="keylabel"></span></span>`;
			}
		}
		html += '</div>';
		html += '<div class="kbd-down">';
		for (var n = this.range[0]; n < this.range[1]; n++) {
			var w = isWhite(n);
			if (w) {
				var l = w[0];
				var o = Math.floor(n/12);
				if (o > 5) {
					l = l.toLowerCase();
					while (--o >= 6) l += "'";
				} else {
					while (++o <= 5) l += ',';
				}

				html += `<span data-note="${n}" class="w down bl br"><span class="keylabel">${l}</span></span>`;
			}
		}

					// <span 
					// data-note="50" class="w up">&nbsp;</span><span 
					// data-note="51" class="k up"><span class="keylabel">d</span></span><span
					// data-note="52" class="w up br">&nbsp;</span><span 
					// data-note="53" class="w up w1 bl">&nbsp;</span><span 
					// data-note="54" class="k up"><span class="keylabel">g</span></span><span 
					// data-note="55" class="w up w1">&nbsp;</span><span 
					// data-note="56" class="k up"><span class="keylabel">h</span></span><span 
					// data-note="57" class="w up w1">&nbsp;</span><span 
					// data-note="58" class="k up"><span class="keylabel">j</span></span><span 
					// data-note="59" class="w up w1 br">&nbsp;</span><span 
					// data-note="60" class="w up bl">&nbsp;</span><span 
					// data-note="61" class="k up"><span class="keylabel">2</span></span><span 
					// data-note="62" class="w up">&nbsp;</span><span 
					// data-note="63" class="k up"><span class="keylabel">3</span></span><span
					// data-note="64" class="w up br">&nbsp;</span><span 
					// data-note="65" class="w up w1 bl">&nbsp;</span><span 
					// data-note="66" class="k up"><span class="keylabel">5</span></span><span 
					// data-note="67" class="w up w1">&nbsp;</span><span 
					// data-note="68" class="k up"><span class="keylabel">6</span></span><span 
					// data-note="69" class="w up w1">&nbsp;</span><span 
					// data-note="70" class="k up"><span class="keylabel">7</span></span><span 
					// data-note="71" class="w up w1 br">&nbsp;</span><span 
					// data-note="72" class="w up bl">&nbsp;</span><span 
					// data-note="73" class="k up"><span class="keylabel">9</span></span><span 
					// data-note="74" class="w up">&nbsp;</span><span 
					// data-note="75" class="k up"><span class="keylabel">0</span></span><span
					// data-note="76" class="w up br">&nbsp;</span>
				// <div class="kbd-down">
				// 	<span
				// 	data-note="48" class="w down bl br"><span class="keylabel">z</span></span><span 
				// 	data-note="50" class="w down bl br"><span class="keylabel">x</span></span><span 
				// 	data-note="52" class="w down bl br"><span class="keylabel">c</span></span><span 
				// 	data-note="53" class="w down bl br"><span class="keylabel">v</span></span><span 
				// 	data-note="55" class="w down bl br"><span class="keylabel">b</span></span><span 
				// 	data-note="57" class="w down bl br"><span class="keylabel">n</span></span><span 
				// 	data-note="59" class="w down bl br"><span class="keylabel">m</span></span><span
				// 	data-note="60" class="w down bl br"><span class="keylabel">q</span></span><span 
				// 	data-note="62" class="w down bl br"><span class="keylabel">w</span></span><span 
				// 	data-note="64" class="w down bl br"><span class="keylabel">e</span></span><span 
				// 	data-note="65" class="w down bl br"><span class="keylabel">r</span></span><span 
				// 	data-note="67" class="w down bl br"><span class="keylabel">t</span></span><span 
				// 	data-note="69" class="w down bl br"><span class="keylabel">y</span></span><span 
				// 	data-note="71" class="w down bl br"><span class="keylabel">u</span></span><span
				// 	data-note="72" class="w down bl br"><span class="keylabel">i</span></span><span 
				// 	data-note="74" class="w down bl br"><span class="keylabel">o</span></span><span 
				// 	data-note="76" class="w down bl br"><span class="keylabel">p</span></span>
				// </div>
		html += `</div></div>`;
		return html;
	}
	onStartUI() {
		this.elem = document.getElementById(this.getId());
		var $elem = $(this.elem);

		var notePressed = null;
		var uiKbdDown = Kefir.fromEvents($elem.find('.kbd span[data-note]'), 'mousedown').map(e => {
			notePressed = $(e.target).data('note');
			return {note: notePressed, down: true};
		});
		var uiKbdUp = Kefir.fromEvents(document, 'mouseup').map(e => {
			if (notePressed) {
				var res = {note: notePressed, down: false};
				notePressed = false;
				return res;
			}
		})
		.filter(e => e);
		
		this.keyNoteStream.plug(uiKbdDown).plug(uiKbdUp);
		
		// window.keyNoteStream.onValue(v => {
		// 	if (v.down) {
		// 		$elem.find('.kbd span[data-note=' + v.note + ']').addClass('is-down');
		// 	} else {
		// 		$elem.find('.kbd span[data-note=' + v.note + ']').removeClass('is-down');
		// 	}
		// })
		this.inp.stream.onValue(vs => {
			for (var v of vs) {
				if (v.t == 'on') {
					$elem.find('.kbd span[data-note=' + v.n + ']').addClass('is-down');
				}
				if (v.t == 'off') {
					$elem.find('.kbd span[data-note=' + v.n + ']').removeClass('is-down');
				}
			}
		})
	}
}

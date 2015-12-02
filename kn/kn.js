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

const _getObjId = (function() {
	var objMap = new WeakMap();
	var last = 0;
	return function(obj) {
		var id = objMap.get(obj);
		if (!id) {
			id = ++last;
			objMap.set(obj, id);
		}
		return id;
	}
})();

$(function() {
	var kbdFilter = e => !e.metaKey && !e.shiftKey && !e.ctrlKey && keysToNotes[e.keyCode];
	let kdns = Kefir.fromEvents(window, 'keydown').filter(kbdFilter).map(e => ({code: e.keyCode, down: true}));
	let kups = Kefir.fromEvents(window, 'keyup').filter(kbdFilter).map(e => ({code: e.keyCode, down: false}));
	window.keyNoteStream = Kefir.merge([kdns, kups]);
});

class Keyboard {
	constructor() {
		this.out = new MIDIOUT();
		this.octave = 0;
		var noteOns = {};
		this.noteOns = noteOns;
		window.keyNoteStream.scan((state, v) => {
			if (note === +1) this.octave++;
			else if (note === -1) this.octave--;
			return this;
		}, this);
		
		var midis = window.keyNoteStream
			.filter(v => {
				var note = keysToNotes[v.code];
				if (v.down && noteOns[note]) return false;
				if (note > 1) return true;
				if (!v.down) {
					if (note === +1) this.octave++;
					else if (note === -1) this.octave--;
					if (this.octave < -4) this.octave = -4;
					if (this.octave > 5) this.octave = 5;
				}
			})
			.map(v => {
				var note = keysToNotes[v.code];
				if (v.down) noteOns[note] = 1;
				else delete noteOns[note];
				return {
					t: v.down ? 'on' : 'off',
					n: note + this.octave*12,
					o: this.octave,
					v: 127,
				};
			});
		this.out.plug(midis);
	}
}

class INOUT {
	plug(obs) {
		throw 'Define plug!';
	}
	get out() {
		throw 'Define out!';
	}
	connect(inout) {
		inout.plug(this.out);
	}
}

class MIDIINOUT extends INOUT {
	constructor() {
		super();
		this.pool = Kefir.pool();
	}
	plug(obs) {
		this.pool.plug(obs);
	}
	get out() {
		return this.pool;
	}
}

class MIDIOUT extends MIDIINOUT {
	
}

class MIDIIN extends MIDIINOUT {
	
}

class PINOUT extends INOUT {
	constructor(def) {
		super();
		this.pool = Kefir.pool();
		this.value = def || 0;
		this.outs = this.pool
			.scan((state, v) => {
				state[v.id] = v.v;
				return state;
			}, {})
			.map(state => {
				var v = 0;
				for (var id in state) v += state[id];
				this.value = v;
				return v;
			})
			.toProperty(() => this.value)
	}
	plug(obs) {
		let id = _getObjId(obs);
		this.pool.plug(obs.map(v => ({v, id})));
	}
	get out() {
		return this.outs;
	}
	
}

class POUT extends PINOUT {
	produceFromField(obj, field) {
		var state = {
			last: undefined
		};
		this[field + 'Stream'];
		var stream = Kefir.stream(emitter => {
			var fun = () => {
				if (obj[field] !== state.last) {
					emitter.emit(obj[field]);
					state.last = obj[field];
				}
			}
			_fabrique.onProduce(fun);
			return () => _fabrique.offProduce(fun);
		});
		this.plug(stream);
		state.stream = stream;
		obj[field + 'State'] = state;
	}
}

class PIN extends PINOUT {
	consume(onValue, onTick) {
		this.out.onValue(onValue);
		if (onTick) _fabrique.onConsume(onTick);
	}
}

const _fabrique = (function() {
	var producers = {};
	function onProduce(fun) {
		let id = _getObjId(fun);
		producers[id] = fun;
		console.log('on producer', id);
	}
	function offProduce(fun) {
		let id = _getObjId(fun);
		delete producers[id];
		console.log('off producer', id);
	}
	var consumers = {};
	function onConsume(fun) {
		let id = _getObjId(fun);
		consumers[id] = fun;
	}
	function offConsume(fun) {
		let id = _getObjId(fun);
		delete consumers[id];
	}
	function doProduce(t) {
		for (let id in producers) {
			producers[id](t);
		}
	}
	function doConsume(t) {
		for (let id in consumers) {
			consumers[id](t);
		}
	}
	function doTick(t) {
		//console.log('t', t);
		doProduce(t);
		doConsume(t);
	}
	return {
		onProduce, offProduce,
		onConsume, offConsume,
		doProduce,
		doConsume,
		doTick,
	}
})();

class Note2Trigger {
	constructor() {
		this.inp = new MIDIIN();
		this.out = new POUT();
		this.noteSet = {};
		this.value = 0;
		this.inp.out.onValue(v => {
			if (v.t === 'on') {
				this.noteSet[v.n] = 1;
			}
			if (v.t === 'off') {
				delete this.noteSet[v.n];
			}
			this.value = Object.keys(this.noteSet).length > 0 ? 1 : 0;
			//console.log(this.noteSet, this.value);
		});
		this.out.produceFromField(this, 'value');
	}
}

class PINLogger {
	constructor() {
		this.inp = new PIN();
		this.value = 0;
		this.shown = false;
		this.inp.consume(v => {
			this.value = v;
			this.shown = false;
			this.logged = false;
		},
		t => {
			if (!this.logged) {
				console.log('PINLogger', this.value, Math.round((t - Tone.context.currentTime)*1000));
				this.logged = true;
			}
		});
	}
	attachUI(elem) {
		_fabrique.onConsume(t => {
			if (!this.shown) {
				$(elem).text(this.value);
				this.shown = true;
			}
		})
	}
}

class AINOUT extends INOUT {
	constructor() {
		super();
		this.gain = Tone.context.createGain();
	}
	plug(out) {
		out.connect(this.gain);
	}
	get out() {
		return this.gain;
	}
}

class AOUT extends AINOUT {
	
}

class AIN extends AINOUT {
	
}

const M2NModes = ['max', 'min', 'last', 'first'];

class Midi2Note {
	constructor(mode) {
		this.smode = M2NModes[mode];
		this.inp = new MIDIIN();
		this.out = new POUT();

		this.noteSet = {};
		this.noteList = {};
		this.nc = 0;
		this.value = 0;
		this.inp.out.onValue(v => {
			if (v.t === 'on') {
				if (this.noteSet[v.n]) return;
				this.nc++;
				this.noteSet[v.n] = this.nc;
				this.noteList[this.nc] = v.n;
			}
			if (v.t === 'off') {
				var nc = this.noteSet[v.n];
				delete this.noteSet[v.n];
				delete this.noteList[nc];
			}
			this.value = this.getValue();
		});
		this.out.produceFromField(this, 'value');
	}
	getEffectives() {
		switch(this.smode) {
			case 'min': return [Math.min, this.noteSet];
			case 'first': return [Math.min, this.noteList];
			case 'last': return [Math.max, this.noteList];
			default: return [Math.max, this.noteSet]; // defaults to max
		}
	}
	getValue() {
		var efs = this.getEffectives();
		var f = efs[0], set = efs[1];
		var lst = Object.keys(set);
		if (lst.length < 1) return this.value;
		var n = f.apply(Math, lst);
		if (set === this.noteList) n = this.noteList[n];
		this.value = n;
		return n;
	}
}

const N2VModes = ['detune', 'freq'];

class Note2CV {
	constructor(mode) {
		this.smode = N2VModes[mode];
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.constant = Tone.getConstant();
		this.constant.connect(this.out.gain);

		this.inp.consume(
			n => {
				this.value = this.getValue(n);
			},
			t => {
				this.pgain.setValueAtTime(this.value, t);
			}
		);
	}
	getValue(n) {
		switch(this.smode) {
			case 'freq': return Math.pow(2, (n - 69)/12)*440;
			default: return (n - 69)*100; // detune
		}
	}
}

class P2A {
	constructor(mode) {
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		this.constant = Tone.getConstant();
		this.constant.connect(this.out.gain);

		this.inp.consume(
			v => {
				this.value = v;
			},
			t => {
				this.pgain.setValueAtTime(this.value, t);
			}
		);
	}
}


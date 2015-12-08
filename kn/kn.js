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
	var keyFilter = e => !e.metaKey && !e.shiftKey && !e.ctrlKey && keysToNotes[e.keyCode];
	var kdns = Kefir.fromEvents(window, 'keydown').filter(keyFilter).map(e => ({note: keysToNotes[e.keyCode], down: true}));
	var kups = Kefir.fromEvents(window, 'keyup').filter(keyFilter).map(e => ({note: keysToNotes[e.keyCode], down: false}));
	var notePressed = null;
	var uiKbdDown = Kefir.fromEvents($('.kbd span[data-note]'), 'mousedown').map(e => {
		notePressed = $(e.target).data('note');
		return {note: notePressed, down: true};
	});
	// var uiKbdUp = Kefir.fromEvents($('.kbd span[data-note]'), 'mouseup').map(e => {
	// 	return {note: notePressed, down: false};
	// });
	var uiKbdUp = Kefir.fromEvents(document, 'mouseup').map(e => {
		if (notePressed) {
			var res = {note: notePressed, down: false};
			notePressed = false;
			return res;
		}
	})
	.filter(e => e);
	//uiKbdUp.log();
	window.keyNoteStream = Kefir.merge([kdns, kups, uiKbdUp, uiKbdDown]);
	window.keyNoteStream.onValue(v => {
		if (v.down) {
			$('.kbd span[data-note=' + v.note + ']').addClass('is-down');
		} else {
			$('.kbd span[data-note=' + v.note + ']').removeClass('is-down');
		}
	})
	//window.keyNoteStream.log();
});

class Keyboard {
	constructor() {
		this.out = new MIDIOUT();
		this.octave = 0;
		var noteOns = {};
		this.noteOns = noteOns;
		
		var midis = window.keyNoteStream
			.filter(v => {
				var note = v.note;
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
				var note = v.note;
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
	get inp() {
		return this;
	}
	get out() {
		return this;
	}
	connectTo(inout) {
		throw 'Define connectTo';
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
	connectTo(inout) {
		inout.plug(this.stream);
	}
	onValue(onVal) {
		this.stream.onValue(onVal);
	}
	get stream() {
		return this.pool;
	}
}

class MIDIOUT extends MIDIINOUT {
	
}

class MIDIIN extends MIDIINOUT {
	
}

// P(arametric/rocessing) IN/OUT
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
		return this;
	}
	connectTo(inout) {
		inout.plug(this.stream);
	}
	get stream() {
		return this.outs;
	}
}

class POUT extends PINOUT {
	produceFromField(obj, field, onBeforeProduce) {
		var state = {
			last: undefined
		};
		this[field + 'Stream'];
		var stream = Kefir.stream(emitter => {
			var fun = (t) => {
				if (onBeforeProduce) onBeforeProduce(t);
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
		return this;
	}
}

class PIN extends PINOUT {
	toProp(obj, pn) {
		this.out.onValue(v => {
			obj[pn] = v;
		});
	}
	onValue(onVal) {
		this.outs.onValue(onVal);
	}
	// consume(onVal, onTick) {
	// 	this.onValue(onVal);
	// 	if (onTick) _fabrique.onConsume(onTick);
	// 	return this;
	// }
}

// Audio in/out
class AINOUT extends INOUT {
	constructor(def) {
		super();
		this.gain = Tone.context.createGain();
		if (typeof def != 'undefined') {
			this.gain.gain.value = def;
		}
	}
	plug(out) {
		out.connect(this.gain);
	}
	connectTo(inout) {
		inout.plug(this.gain);
	}
}

class AOUT extends AINOUT {
	constructor(def) {
		super(def);
	}
	bind(node) {
		node.connect(this.gain);
		return this;
	}
	unbind(node) {
		node.disconnect(this.gain);
		return this;
	}
}

class AIN extends AINOUT {
	constructor(def) {
		super(1);
		if (def) {
			this.cg = Tone.context.createGain();
			Tone.getConstant().connect(this.cg);
			this.cg.gain.value = def;
			this.cg.connect(this.gain);
		}
	}
	plug(out) {
		if (this.cg) {
			this.cg.disconnect();
			this.cg = null;
		}
		out.connect(this.gain);
		return this;
	}
	bind(node) {
		this.gain.connect(node);
		return this;
	}
	unbind(node) {
		this.gain.disconnect(node);
		return this;
	}
}

class Fabrique {
	constructor() {
		this.producers = {};
		this.consumers = {};
		this.intId = null;
		this.bpm = 120;
		this.ppqn = 48;
		this.calcTps();
	}
	onProduce(fun) {
		let id = _getObjId(fun);
		this.producers[id] = fun;
		//console.log('on producer', id);
	}
	offProduce(fun) {
		let id = _getObjId(fun);
		delete this.producers[id];
		//console.log('off producer', id);
	}
	onConsume(fun) {
		let id = _getObjId(fun);
		this.consumers[id] = fun;
	}
	offConsume(fun) {
		let id = _getObjId(fun);
		delete this.consumers[id];
	}
	doProduce(t) {
		for (let id in this.producers) {
			this.producers[id](t);
		}
	}
	doConsume(t) {
		for (let id in this.consumers) {
			this.consumers[id](t);
		}
	}
	doTick(t) {
		//console.log('t', t);
		this.doProduce(t);
		this.doConsume(t);
	}
	calcTps() {
		this.tps = this.bpm*this.ppqn/60;
		if (this.tps <= 0) this.tps = 1;
		if (this.tps > 200) this.tps = 200;
		return this.tps;
	}
	setBpm(bpm) {
		this.bpm = bpm;
		this.calcTps();
	}
	setPpqn(ppqn) {
		this.ppqn = ppqn;
		this.calcTps();
	}
	start(bpm, ppqn) {
		if (bpm) this.setBpm(bpm);
		if (ppqn) this.setPpqn(ppqn);
		if (this.intId) stop();
		var prevT = 0;
		var cT = 4;
		this.intId = setInterval(() => {
			var dT = 1/this.tps;
			if (window.stopped) return;
			var curT = Tone.context.currentTime;
			var cnt = 0;
			if (curT >= prevT + dT) {
				if (prevT > 0) console.warn('TICKS WERE SKIPPED');
				prevT = curT; // realign
			}
			while (prevT < curT + cT*dT) {
				prevT += dT;
				this.doTick(prevT);
			};
		}, 15);
	}
	stop() {
		if (this.intId) clearInterval(this.intId);
		this.intId = null;
	}
};

const _fabrique = new Fabrique();

class Basis {
	isTriggered(fn, onFunc, offFunc) {
		fn = fn || 'trigger';
		this[fn] = new PIN();
		var state = {
			on: 0,
			wasOn: 0,
		};
		this[fn + 'State'] = state;
		this[fn].onValue(v => {
			state.on = v;
		});
		this.isConsumer(t => {
			if (state.on > 0.5 && state.wasOn < 0.5) {
				onFunc(t);
			}
			else if (state.on < 0.5 && state.wasOn > 0.5) {
				offFunc(t);
			}
			state.wasOn = state.on;
		});
	}
	isConsumer(fun) {
		_fabrique.onConsume(fun);
	}
}

class PINLogger extends Basis {
	constructor() {
		super();
		this.inp = new PIN();
		this.value = 0;
		this.shown = false;
		this.inp.onValue(v => {
			this.value = v;
			this.shown = false;
			this.logged = false;
		});
		this.isConsumer(t => {
			if (!this.logged) {
				console.log('PINLogger', this.value, Math.round((t - Tone.context.currentTime)*1000));
				this.logged = true;
			}
		});
	}
	attachUI(elem) {
		this.isConsumer(t => {
			if (!this.shown) {
				$(elem).text(this.value);
				this.shown = true;
			}
		})
	}
}


class Midi2NotesBasis extends Basis { // abstract
	constructor(mode) {
		super();
		this.inp = new MIDIIN();
		this.out = new POUT();

		this.noteSet = {};
		this.noteList = {};
		this.nc = 0;
		this.value = 0;
		this.inp.onValue(v => {
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
	getValue() {
		throw "Define getValue";
	}
}

class Midi2Trigger extends Midi2NotesBasis {
	constructor() {
		super();
		// this.inp = new MIDIIN();
		// this.out = new POUT();
		// this.noteSet = {};
		// this.value = 0;
		// this.inp.out.onValue(v => {
		// 	if (v.t === 'on') {
		// 		this.noteSet[v.n] = 1;
		// 	}
		// 	if (v.t === 'off') {
		// 		delete this.noteSet[v.n];
		// 	}
		// 	this.value = Object.keys(this.noteSet).length > 0 ? 1 : 0;
		// 	//console.log(this.noteSet, this.value);
		// });
		// this.out.produceFromField(this, 'value');
	}
	getValue() {
		return Object.keys(this.noteSet).length > 0 ? 1 : 0;
	}
}

const M2NModes = ['max', 'min', 'last', 'first'];

class Midi2Note extends Midi2NotesBasis {
	constructor(mode) {
		super();
		this.smode = M2NModes[mode];
		// this.inp = new MIDIIN();
		// this.out = new POUT();

		// this.noteSet = {};
		// this.noteList = {};
		// this.nc = 0;
		// this.value = 0;
		// this.inp.out.onValue(v => {
		// 	if (v.t === 'on') {
		// 		if (this.noteSet[v.n]) return;
		// 		this.nc++;
		// 		this.noteSet[v.n] = this.nc;
		// 		this.noteList[this.nc] = v.n;
		// 	}
		// 	if (v.t === 'off') {
		// 		var nc = this.noteSet[v.n];
		// 		delete this.noteSet[v.n];
		// 		delete this.noteList[nc];
		// 	}
		// 	this.value = this.getValue();
		// });
		// this.out.produceFromField(this, 'value');
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

class Note2CV extends Basis {
	constructor(mode) {
		super();
		this.smode = N2VModes[mode];
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		this.constant = Tone.getConstant();
		this.constant.connect(this.out.gain);

		this.inp.onValue(n => {
			this.value = this.getValue(n);
		});
		this.isConsumer(t => {
			this.pgain.setValueAtTime(this.value, t);
		});
	}
	getValue(n) {
		switch(this.smode) {
			case 'freq': return Math.pow(2, (n - 69)/12)*440;
			default: return (n - 69)*100; // detune
		}
	}
}

class P2A extends Basis {
	constructor(mode) {
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		this.constant = Tone.getConstant();
		this.constant.connect(this.out.gain);

		this.inp.onValue(v => {
			this.value = v;
		});
		this.isConsumer(t => {
			this.pgain.setValueAtTime(this.value, t);
		});
	}
}

class Env extends Basis {
	constructor(a, d, s, r, mn, mx) {
		super();
		this.a = a || 0.1;
		this.d = d || 0.5;
		this.s = s || 0.5;
		this.r = r || 1;
		this.mn = mn || 0;
		this.mx = mx || 1;
		// this.attack = new PIN(this.a).consume(v => this.a = v);
		// this.decay = new PIN(this.d).consume(v => this.d = v);
		// this.sustain = new PIN(this.s).consume(v => this.s = v);
		// this.release = new PIN(this.r).consume(v => this.r = v);
		// this.min = new PIN(this.mn).consume(v => this.mn = v);
		// this.max = new PIN(this.mx).consume(v => this.mx = v);
		this.inp = new AIN(1);
		this.out = new AOUT();
		this.inp.gain.connect(this.out.gain);
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		
		this.isTriggered('trigger', t => this.doAttack(t), t => this.doRelease(t));
	}
	doAttack(time) {
		this.pgain.cancelScheduledValues(time);
		this.pgain.setTargetAtTime(this.mx, time, this.a / 4);
		this.pgain.setTargetAtTime(this.s, time + this.a, this.d / 4);
	}
	doRelease(time) {
		this.pgain.cancelScheduledValues(time);
		this.pgain.setTargetAtTime(this.mn, time, this.r / 4);
	}
}

const OSCTypes = ['sine', 'square', 'sawtooth', 'triangle'];

class Osc extends Basis {
	constructor(type) {
		super();
		//this.trigger = new PIN(1);
		this.stype = OSCTypes[type || 0];
		this.osc = null;
		this.out = new AOUT();
		this.freq = new AIN();
		this.detune = new AIN();
		this.makeOsc();
	}
	makeOsc() {
		if (this.osc) return this.osc;
		this.osc = Tone.context.createOscillator();
		this.osc.type = this.stype;
		this.osc.start();
		this.out.bind(this.osc);
		this.freq.bind(this.osc.frequency);
		this.detune.bind(this.osc.detune);
		return this.osc;
	}
	killOsc() {
		if (!this.osc) return this.osc;
		this.osc.stop();
		this.out.unbind(this.osc);
		this.freq.unbind(this.osc.frequency);
		this.detune.unbind(this.osc.detune);
		this.osc = null;
		return this.osc;
	}
}

class Dest {
	constructor() {
		this.inp = new AIN().bind(Tone.context.destination);
		this._volume = this.inp.gain.gain;
	}
}

class Gain {
	constructor(def) {
		this.g = Tone.context.createGain();
		this.g.gain.value = 0;
		this.inp = new AIN().bind(this.g);
		this.gain = new AIN(def).bind(this.g.gain);
		this.out = new AOUT().bind(this.g);
	}
}

class Delay {
	constructor(def) {
		this.d = Tone.context.createDelay();
		this.d.delayTime.value = 0;
		this.inp = new AIN().bind(this.d);
		this.time = new AIN(def).bind(this.d.delayTime);
		this.out = new AOUT().bind(this.d);
	}
}

class Const {
	constructor(v) {
		this.c = Tone.getConstant();
		this.g = Tone.context.createGain();
		this.g.gain.value = v;
		this.c.connect(this.g);
		this.out = new AOUT().bind(this.g);
	}
}

const FLTTypes = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];

class Filter {
	constructor(type) {
		this.stype = FLTTypes[type || 0];
		this.flt = Tone.context.createBiquadFilter();
		this.flt.type = this.stype;
		this.out = new AOUT().bind(this.flt);
		this.inp = new AIN().bind(this.flt);
		this.freq = new AIN(440).bind(this.flt.frequency);
		this.detune = new AIN().bind(this.flt.detune);
		this.q = new AIN().bind(this.flt.Q);
	}
}

class Clock {
	constructor() {
		this.value = 0;
		this.out = new POUT();
		this.out.produceFromField(this, 'value', (t) => {
			if (this.value < 0.5) this.value = 1;
			else this.value = 0;
		});
	}
}

class Sequence extends Basis {
	// x..x..x.
	// 10010010
	// 1,0,0,1,0,0,1,0
	constructor(s) {
		super();
		if ($.isArray(s)) this.values = [];
		else if (typeof s == 'string') {
			if (s.match(/^-?\d+(.\d+)?(,-?\d+)+(.\d+)?$/)) {
				this.values = s.split(',').map(ss => parseFloat(ss));
			}
			if (s.match(/^[x.01]+$/)) {
				this.values = s.split('').map(ss => ss == 'x' || ss == '1' ? 1 : 0);
			}
		}
		this.clock = new PIN();
		this.out = new POUT();
		this.out.plug(
			this.clock.stream
				.scan((state, v) => {
					if (state.on < 0.5 && v > 0.5) {
						state.on = 1; state.step = (state.step + 1) % this.values.length;
					}
					else if (state.on > 0.5 && v < 0.5) {
						state.on = 0;
					}
					return state;
				}, {on: 0, step: -1})
				.map(state => {
					return this.values[state.step];
				})
		);
	}
}

class KNBase extends Basis {

}

var knClasses = {}

var knNewClass = function newCls(name) {
	var c = { name: name, nodes: {}, links: {} };
	knClasses[name] = c;
	return c;
}

const knMainClass = '__main';
knNewClass(knMainClass);

function knCompile(cls) {
	var res = [`class ${cls.name} extends KNBase {`];
	res.push('\tconstructor() {');
	res.push('\t\tsuper();');
	for (var nn in cls.nodes) {
		var t = cls.nodes[nn];
		var ps = t.params;
		res.push(`\t\tthis.${nn} = new ${t.type}(${ps.join(', ')});`);
		if (t.name) {
			res.push(`\t\tthis.${nn}.name = '${t.name}';`);
		}
		if (t.title) {
			res.push(`\t\tthis.${nn}.title = ${t.title};`);
		}
		for (var na in t.opts) {
			res.push(`\t\tthis.${nn}.${na} = ${t.opts[na]};`);
		}
	}
	for (var ln in cls.links) {
		var li = cls.links[ln];
		res.push(`\t\tthis.${li.n0}.${li.e0}.connectTo(this.${li.n1}.${li.e1});`);
	}
	res.push('\t}');
	res.push('}');
	return res.join('\n');
}

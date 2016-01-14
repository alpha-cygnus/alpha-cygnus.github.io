"use strict";

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

class Basis {
	isTriggered(fn, onFunc, offFunc) {
		fn = fn || 'trigger';
		if (!this[fn]) this[fn] = new PIN();
		var state = {
			on: 0,
			wasOn: 0,
		};
		this[fn + 'State'] = state;
		this[fn].onValue(v => {
			state.on = v;
		});
		this.isConsumer(t => {
			if (Math.abs(state.on) < 0.5 && Math.abs(state.wasOn) >= 0.5) {
				offFunc(t);
			} else
			if (Math.abs(state.on - state.wasOn) >= 0.5) {
				onFunc(t);
			}
			state.wasOn = state.on;
		});
	}
	triggeredStream(fn, onFunc, offFunc) {
		fn = fn || 'trigger';
		if (!this[fn]) this[fn] = new PIN();
		var state = {
			value: 0,
			wasOn: 0,
		};
		this[fn + 'State'] = state;
		return this[fn].stream.map(v => {
			if (Math.abs(v) < 0.5 && Math.abs(state.wasOn) >= 0.5) {
				state.value = offFunc(state, v);
			} else
			if (Math.abs(v - state.wasOn) >= 0.5) {
				state.value = onFunc(state, v);
			}
			state.wasOn = v;
			return state.value;
		}).toProperty(() => state.value);
	}
	isConsumer(fun) {
		_fabrique.onConsume(fun);
	}
	getConstant() {
		return Tone.Signal._constant;
	}
	getHTML(parent) {
		return null;
	}
	onStartUI(parent) {
		return;
	}
}

class INOUT extends Basis {
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
	produceFromBuffer(obj, field, onBeforeProduce) {
		// this[field + 'Stream'];
		this.obj = obj;
		var stream = Kefir.stream(emitter => {
			var fun = (t) => {
				if (onBeforeProduce) onBeforeProduce(t);
				var vs = this.obj[field];
				emitter.emit(vs);
				// for (var v of vs) {
				// 	emitter.emit(v);
				// }
				this.obj[field] = [];
			}
			_fabrique.onProduce(fun);
			return () => _fabrique.offProduce(fun);
		});
		this.plug(stream);
		// obj[field + 'State'] = state;
		return this;
	}
}

class MIDIIN extends MIDIINOUT {
	
}

// P(arametric/rocessing) IN/OUT
class PINOUT extends INOUT {
	constructor(def, agrFun, agrInit) {
		super();
		agrFun = agrFun || ((a, b) => a + b);
		agrInit = agrInit || 0;
		this.pool = Kefir.pool();
		this.value = def || 0;
		this.outs = this.pool
			.scan((state, v) => {
				state[v.id] = v.v;
				return state;
			}, {})
			.map(state => {
				var v = def;
				var first = 1;
				for (var id in state) {
					if (first) v = agrInit;
					first = 0;
					//v += state[id];
					v = agrFun(v, state[id]);
				}
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
	produceFromFunction(fun) {
		var stream = Kefir.stream(emitter => {
			var producer = (t) => {
				emitter.emit(fun(t));
			}
			_fabrique.onProduce(producer);
			return () => _fabrique.offProduce(producer);
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
			this.getConstant().connect(this.cg);
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
	}
	offProduce(fun) {
		let id = _getObjId(fun);
		delete this.producers[id];
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

class Midi2NotesBasis extends Basis { // abstract
	constructor(mode) {
		super();
		this.inp = new MIDIIN();
		this.out = new POUT();

		this.noteSet = {};
		this.noteList = {};
		this.nc = 0;
		this.value = 0;
		this.out.plug(
			this.inp.stream.map(vs => {
				for (var v of vs) {
					if (v.t === 'on') {
						if (this.noteSet[v.n]) continue;
						this.nc++;
						this.noteSet[v.n] = this.nc;
						this.noteList[this.nc] = v.n;
					}
					if (v.t === 'off') {
						var nc = this.noteSet[v.n];
						delete this.noteSet[v.n];
						delete this.noteList[nc];
					}
				}
				this.value = this.getValue();
				return this.value;
			})
			.toProperty(() => this.value)
		)
	}
	getValue() {
		throw "Define getValue";
	}
}

const M2TModes = ['bool', 'retrig', 'count']

class Midi2Trigger extends Midi2NotesBasis {
	constructor(mode) {
		super();
		this.smode = M2TModes[mode];
	}
	getValue() {
		switch(this.smode) {
			case 'count':
				return Object.keys(this.noteSet).length;
			case 'retrig':
				return Object.keys(this.noteSet).length ? this.nc : 0;
			default: return Object.keys(this.noteSet).length > 0 ? 1 : 0;
		}
		
	}
}

const M2NModes = ['max', 'min', 'last', 'first'];

class Midi2Note extends Midi2NotesBasis {
	constructor(mode) {
		super();
		this.smode = M2NModes[mode];
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
		this.constant = this.getConstant();
		this.constant.connect(this.out.gain);
		
		this.value = 0;
		this.inp.onValue(n => {
			if (!n) return;
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

const MaxPolyCount = 16;

class Midi2PolyBasis extends Basis { // abstract
	constructor() {
		super();
		this.inp = new MIDIIN();
		this.values = [];
		for (var i = 0; i < MaxPolyCount; i++) {
			this['out' + i] = new POUT();
			this.values.push(0);
		};
		
		this.noteSet = {};
		this.noteList = {};
		this.nc = 0;
		
		this.allOut = this.inp.stream.map(vs => {
			for (var v of vs) {
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
			}
			this.values = this.getValues();
			return this.values;
		})
		.toProperty(() => this.values);
		
		for (var i = 0; i < MaxPolyCount; i++) {
			let idx = i;
			this['out' + i].plug(this.allOut.map(a => a[idx]));
		};
	}
	getValues() {
		throw "Define getValues :: () -> [val]";
	}
}

class Midi2PolyNote extends Basis {
	constructor(polyCount) {
		super();
	}
}


class P2A extends Basis {
	constructor(mode) {
		super();
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		this.constant = this.getConstant();
		this.constant.connect(this.out.gain);

		this.inp.onValue(v => {
			this.value = v;
		});
		this.last = undefined;
		this.isConsumer(t => {
			if (this.value === undefined) return;
			if (isNaN(this.value)) return;
			if (this.last != this.value) {
				this.pgain.setValueAtTime(this.value, t);
			}
			this.last = this.value;
		});
	}
}

class ADSR extends Basis {
	constructor(a, d, s, r, mn, mx) {
		super();
		this.a = a || 0.1;
		this.d = d || 0.5;
		this.s = (s == undefined) ? 0.5 : s;
		this.r = r || 1;
		this.mn = mn || 0;
		this.mx = mx || 1;
		this.attack = new PIN(this.a).onValue(v => this.a = v);
		this.decay = new PIN(this.d).onValue(v => this.d = v);
		this.sustain = new PIN(this.s).onValue(v => this.s = v);
		this.release = new PIN(this.r).onValue(v => this.r = v);
		this.min = new PIN(this.mn).onValue(v => this.mn = v);
		this.max = new PIN(this.mx).onValue(v => this.mx = v);
		this.inp = new AIN(1);
		this.out = new AOUT();
		this.inp.gain.connect(this.out.gain);
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		
		this.doRelease(Tone.context.currentTime);
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

class Env extends ADSR { // old name

}

const OSCTypes = ['sine', 'square', 'sawtooth', 'triangle'];

class Osc extends Basis {
	constructor(type) {
		super();
		this.trigger = new PIN(1);
		this.stype = OSCTypes[type || 0];
		this.osc = null;
		this.out = new AOUT();
		this.freq = new AIN(440);
		this.detune = new AIN();
		this.makeOsc();
		this.isTriggered('trigger', t => {
			this.killOsc(t);
			this.makeOsc(t);
		}, t => t);
		
	}
	makeOsc(t) {
		if (this.osc) return this.osc;
		this.osc = Tone.context.createOscillator();
		this.osc.type = this.stype;
		this.osc.frequency.value = 0;
		this.out.bind(this.osc);
		this.freq.bind(this.osc.frequency);
		this.detune.bind(this.osc.detune);
		this.osc.start();
		return this.osc;
	}
	killOsc(t) {
		if (!this.osc) return this.osc;
		this.osc.stop();
		this.out.unbind(this.osc);
		this.freq.unbind(this.osc.frequency);
		this.detune.unbind(this.osc.detune);
		this.osc = null;
		return this.osc;
	}
}

class Dest extends Basis {
	constructor() {
		super();
		this.inp = new AIN(); //.bind(Tone.context.destination);
		this.gain = window.mainGain || Tone.context.createGain();
		window.mainGain = this.gain;
		window.mainVolume = this.gain.gain;
		this.inp.gain.connect(this.gain);
		this.gain.connect(Tone.context.destination);
	}
}

class Gain extends Basis {
	constructor(def) {
		super();
		this.g = Tone.context.createGain();
		this.g.gain.value = 0;
		this.inp = new AIN().bind(this.g);
		this.gain = new AIN(def).bind(this.g.gain);
		this.out = new AOUT().bind(this.g);
	}
}

class Delay extends Basis {
	constructor(def) {
		super();
		this.d = Tone.context.createDelay();
		this.d.delayTime.value = 0;
		this.inp = new AIN().bind(this.d);
		this.time = new AIN(def).bind(this.d.delayTime);
		this.out = new AOUT().bind(this.d);
	}
}

class Pan extends Basis {
	constructor(def) {
		super();
		this.p = Tone.context.createStereoPanner();
		this.p.pan.value = 0;
		this.inp = new AIN().bind(this.p);
		this.pan = new AIN(def).bind(this.p.pan);
		this.out = new AOUT().bind(this.p);
	}
}

class Const extends Basis {
	constructor(v) {
		super();
		this.c = this.getConstant();
		this.g = Tone.context.createGain();
		this.g.gain.value = v;
		this.c.connect(this.g);
		this.out = new AOUT(); //.bind(this.g);
		this.inp = new AIN();
		this.g.connect(this.out.gain);
		this.inp.gain.connect(this.out.gain);
	}
}

class Noise extends Basis {
	constructor(def) {
		super();
		this.n = new Tone.Noise();
		this.n.start();
		this.out = new AOUT().bind(this.n);
	}
}

const FLTTypes = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];

class Filter extends Basis {
	constructor(type) {
		super();
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

class Clock extends Basis {
	constructor() {
		super();
		this.value = 0;
		this.out = new POUT();
		this.out.produceFromField(this, 'value', (t) => {
			return this.value++;
		});
	}
}

class Loop extends Basis {
	// x..x..x.
	// 10010010
	// 1,0,0,1,0,0,1,0
	constructor(s) {
		super();
		this.values = Array.from(arguments);
		// else if (typeof s == 'string') {
		// 	if (s.match(/^-?\d+(.\d+)?(,-?\d+)+(.\d+)?$/)) {
		// 		this.values = s.split(',').map(ss => parseFloat(ss));
		// 	}
		// 	if (s.match(/^[x.01]+$/)) {
		// 		this.values = s.split('').map(ss => ss == 'x' || ss == '1' ? 1 : 0);
		// 	}
		// }
		//this.clock = new PIN();
		this.out = new POUT();
		this.out.plug(
			this.triggeredStream('clock',
				(state, v) => {
					state.step = ((state.step === undefined ? -1 : state.step) + 1) % this.values.length;
					return this.values[state.step];
				},
				(state, v) => {
					return state.value;
				}
			)
		);
	}
}

class BinDemux extends Basis {
	constructor() {
		super();
		this.inp = new PIN();
		for (var i = 0; i < 16; i++) {
			var out = this['out' + i] = new POUT();
			let bi = i;
			let b = 1 << bi;
			out.plug(
				this.inp.stream.map(v => (v & b) >> bi)
			);
		}
	}
}

class QDemux extends Basis {
	constructor() {
		super();
		this.inp = new PIN();
		for (var i = 0; i < 16; i++) {
			var out = this['out' + i] = new POUT();
			let bi = i*2;
			let b = 3 << bi;
			out.plug(
				this.inp.stream.map(v => (v & b) >> bi)
			);
		}
	}
}

class Count extends Basis {
	constructor() {
		super();
		this.out = new POUT();
		this.out.plug(
			this.triggeredStream('inp',
				(state, v) => {
					return state.value + v;
				},
				(state, v) => {
					return state.value;
				}
			)
		);
	}
}

function abcPitchToMidiNote(pitch) {
	var acc = pitch.acc;
	var char = pitch.char;
	var oct = pitch.oct;
	var c2i = {C: 0, D:2, E:4, F: 5, G: 7, H: 9, A: 9, B: 11};
	var n = c2i[char] + oct*12 + acc + 60;
	return n;
}

function *abcMelodyToMonoSequence(melody, params) {
	params = params || {};
	var legatoLen = params.legatoLen || 0;
	var staccatoLen = params.staccatoLen || 1;
	var normalLen = params.normalLen || -1;
	var ppqn = params.ppqn || _fabrique.ppqn;

	function lenToTicks(len, d) {
		var full = Math.round(ppqn*4*len[0]/len[1]);
		//return full;
		if (!d) return full;
		if (d >= full) d = full - 1;
		if (d < 0) return [full + d, -d];
		if (d > 0) return [d, full - d];
		return full;
	}
	function getNote(e) {
		var p = e.pitch;
		if ($.isArray(p)) p = p[0];
		return abcPitchToMidiNote(p);

	}

	var gate = 0;
	var lastN = 60;
	for (var i = 0; i < melody.length; i++) {
		var e = melody[i];
		switch (e.k) {
			case 'note': 
				var n = getNote(e);
				if (e.glide) {
					var e1 = melody[i + 1];
					if (e1 && e1.k == 'note') {
						var dur = lenToTicks(e.len);
						yield [dur, [n, getNote(e1)], ++gate];
						break;
					}
				}
				var d = normalLen;
				if (e.legato) d = legatoLen;
				else if (e.deco['.']) d = staccatoLen;
				var dur = lenToTicks(e.len, d);
				if ($.isArray(dur)) {
					yield [dur[0], n, ++gate];
					yield [dur[1], n, 0];
					gate = 0;
				} else {
					yield [dur, n, ++gate];
				}
				lastN = n;
				break;
			case 'rest':
				var dur = lenToTicks(e.len);
				yield [dur, lastN, 0];
				gate = 0;
				break;
		}
	}
}
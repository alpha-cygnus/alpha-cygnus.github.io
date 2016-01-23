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

function _apply(fn) {
	return function(args) {
		return fn.apply(this, args);
	}
}

class Basis {
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
		this.plugged = _fabrique.tickStream.map(t => []);
		this.pool.plug(this.plugged);
		this.inStreams = [];
	}
	plug(obs) {
		this.pool.unplug(this.plugged);
		this.inStreams.push(obs);
		if (this.inStreams.length > 1) {
			this.plugged = Kefir.zip(this.inStreams).map(vs => {
				return vs.reduce((a, b) => a.concat(b));
			});
		} else {
			this.plugged = obs;
		}
		this.pool.plug(this.plugged);
		return this;
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
		this.obj = obj;
		var stream = _fabrique.tickStream.map(t => {
			if (onBeforeProduce) onBeforeProduce(t);
			var vs = this.obj[field];
			this.obj[field] = [];
			return vs;
		})
		this.plug(stream);
		return this;
	}
}

class MIDIIN extends MIDIINOUT {
	
}

// P(arametric/rocessing) IN/OUT
class PINOUT extends INOUT {
	constructor(def, agrFun, agrInit) {
		super();
		this.agrFun = agrFun || ((a, b) => a + b);
		this.agrInit = agrInit || 0;
		this.pool = Kefir.pool();
		this.value = def || 0;
		this.plugged = _fabrique.tickStream.map(t => this.value);
		this.pool.plug(this.plugged);
		this.inStreams = [];
		this.outs = this.pool;
	}
	plug(obs) {
		this.pool.unplug(this.plugged);
		this.inStreams.push(obs);
		if (this.inStreams.length > 1) {
			this.plugged = Kefir.zip(this.inStreams).map(vs => {
				return vs.reduce(this.agrFun, this.agrInit);
			});
		} else {
			this.plugged = obs;
		}
		this.pool.plug(this.plugged);
		return this;
	}
	connectTo(inout) {
		inout.plug(this.stream);
	}
	get stream() {
		return this.outs;
	}
	get triggerStream() {
		return this.outs.scan(
			(state, trig) => {
				if (Math.abs(state.on - trig) >= 0.5) {
					if (Math.abs(trig) > 0.5) {
						state.v = +1;
					} else {
						state.v = -1;
					}
				} else {
					state.v = 0;
				}
				state.on = trig;
				if (this.doLog) console.log('PIN.scan', state, trig);
				return state;
			},
			{on: 0, v: 0}
		).map(state => {
			if (this.doLog) console.log('PIN.scan.map', state);
			return state.v || 0;
		});
	}
}

class POUT extends PINOUT {
	produceFromField(obj, field, onBeforeProduce) {
		var state = {
			last: undefined
		};
		this[field + 'Stream'];
		var stream = _fabrique.tickStream.map(t => {
			if (onBeforeProduce) onBeforeProduce(t);
			if (obj[field] !== state.last) {
				state.last = obj[field];
			}
			return state.last;
		});
		this.plug(stream);
		state.stream = stream;
		obj[field + 'State'] = state;
		return this;
	}
	produceFromFunction(fun) {
		var stream = _fabrique.tickStream.map(fun);
		this.plug(stream);
		state.stream = stream;
		obj[field + 'State'] = state;
		return this;
	}
}

class PIN extends PINOUT {
	toProp(obj, pn) {
		this.outs.onValue(v => {
			obj[pn] = v;
		});
	}
	onValue(onVal) {
		this.outs.onValue(onVal);
	}
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
		this.tickStream = Kefir.stream(emitter => {
			var fun = (t) => {
				emitter.emit(t);
			}
			_fabrique.onProduce(fun);
			return () => _fabrique.offProduce(fun);
		})
	}
	onProduce(fun) {
		let id = _getObjId(fun);
		this.producers[id] = fun;
	}
	offProduce(fun) {
		let id = _getObjId(fun);
		delete this.producers[id];
	}
	doProduce(t) {
		for (let id in this.producers) {
			this.producers[id](t);
		}
	}
	doTick(t) {
		this.doProduce(t);
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

// const MaxPolyCount = 16;

// class Midi2PolyBasis extends Basis { // abstract
// 	constructor() {
// 		super();
// 		this.inp = new MIDIIN();
// 		this.values = [];
// 		for (var i = 0; i < MaxPolyCount; i++) {
// 			this['out' + i] = new POUT();
// 			this.values.push(0);
// 		};
		
// 		this.noteSet = {};
// 		this.noteList = {};
// 		this.nc = 0;
		
// 		this.allOut = this.inp.stream.map(vs => {
// 			for (var v of vs) {
// 				if (v.t === 'on') {
// 					if (this.noteSet[v.n]) return;
// 					this.nc++;
// 					this.noteSet[v.n] = this.nc;
// 					this.noteList[this.nc] = v.n;
// 				}
// 				if (v.t === 'off') {
// 					var nc = this.noteSet[v.n];
// 					delete this.noteSet[v.n];
// 					delete this.noteList[nc];
// 				}
// 			}
// 			this.values = this.getValues();
// 			return this.values;
// 		})
// 		.toProperty(() => this.values);
		
// 		for (var i = 0; i < MaxPolyCount; i++) {
// 			let idx = i;
// 			this['out' + i].plug(this.allOut.map(a => a[idx]));
// 		};
// 	}
// 	getValues() {
// 		throw "Define getValues :: () -> [val]";
// 	}
// }

// class Midi2PolyNote extends Basis {
// 	constructor(polyCount) {
// 		super();
// 	}
// }

const P2AModes = ['set', 'linear', 'exp'];

class P2A extends Basis {
	constructor(mode, lag) {
		super();
		this.smode = P2AModes[mode] || 'set';
		this.lag = lag < 0 ? 0 : lag || 0;
		this.inp = new PIN();
		this.out = new AOUT();
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;
		this.constant = this.getConstant();
		this.constant.connect(this.out.gain);
		
		this.last = undefined;
		Kefir.zip([_fabrique.tickStream, this.inp.stream])
			.onValue(_apply(
				(t, v) => {
					if (v === undefined) return;
					if (isNaN(v)) return;
					if (this.last != v) {
						switch (this.smode) {
							case 'set':
								this.pgain.setValueAtTime(v, t + this.lag);
								break;
							case 'linear':
								this.pgain.linearRampToValueAtTime(v, t + this.lag);
								break;
							case 'exp':
								this.pgain.exponentialRampToValueAtTime(v, t + this.lag);
								break;
						}
					}
					this.last = v;
				}
			));
	}
}

class ADSR extends Basis {
	constructor(a, d, s, r) {
		super();

		this.inp = new AIN(1);
		this.out = new AOUT();
		this.inp.gain.connect(this.out.gain);
		this.pgain = this.out.gain.gain;
		this.pgain.value = 0;

		this.attack = new PIN(a || 0.1);
		this.decay = new PIN(d || 0.5);
		this.sustain = new PIN((s == undefined) ? 0.5 : s);
		this.release = new PIN(r || 1);
		
		this.trigger = new PIN(0);
		Kefir.zip([_fabrique.tickStream, this.trigger.triggerStream, this.attack.stream, this.decay.stream, this.sustain.stream, this.release.stream])
			.onValue(_apply(
				(time, trig, a, d, s, r) => {
					//console.log('ADSR', time, trig, a, d, s, r);
					if (trig > 0) {
						this.pgain.cancelScheduledValues(time);
						this.pgain.setTargetAtTime(1, time, a / 4);
						this.pgain.setTargetAtTime(s, time + a, d / 4);
					}
					if (trig < 0) {
						this.pgain.cancelScheduledValues(time);
						this.pgain.setTargetAtTime(0, time, r / 4);
					}
				}
			));
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
		Kefir.zip([_fabrique.tickStream, this.trigger.triggerStream])
			.onValue(_apply(
				(t, trig) => {
					if (trig > 0) {
						this.killOsc(t);
						this.makeOsc(t);
					}
				}
			));
		//this.makeOsc(Tone.context.currentTime);
		// this.isTriggered('trigger', t => {
		// 	this.killOsc(t);
		// 	this.makeOsc(t);
		// }, t => t);
		
	}
	makeOsc(t) {
		if (this.osc) return this.osc;
		this.osc = Tone.context.createOscillator();
		this.osc.type = this.stype;
		this.osc.frequency.value = 0;
		this.out.bind(this.osc);
		this.freq.bind(this.osc.frequency);
		this.detune.bind(this.osc.detune);
		this.osc.start(t);
		return this.osc;
	}
	killOsc(t) {
		if (!this.osc) return this.osc;
		this.osc.stop(t);
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
		this.trigger = new PIN(1);
		this.out = new POUT();
		this.out.plug(
			Kefir.zip([_fabrique.tickStream, this.trigger.triggerStream],
				(t, trig) => {
					if (trig > 0) {
						this.value = 0;
					}
					return this.value++;
				}
			)
		)
		// this.out.produceFromField(this, 'value', (t) => {
		// 	return this.value++;
		// });
	}
}

class Count extends Basis {
	constructor() {
		super();
		this.inp = new PIN();
		this.reset = new PIN(1);
		this.value = 0;
		this.out = new POUT();
		this.out.plug(
			Kefir.zip([this.inp.stream, this.inp.triggerStream, this.reset.triggerStream], (v, vt, t) => {
				if (t > 0) {
					this.value = 0;
				}
				if (vt > 0) {
					this.value += 1;
				}
				return this.value;
			})
		);
	}
}

class Sel extends Basis {
	constructor(s) {
		super();
		this.values = Array.from(arguments);
		this.inp = new PIN();
		this.out = new POUT();
		this.out.plug(
			this.inp.stream.map((idx) => {
				return this.values[(idx || 0) % this.values.length];
			})
		);
	}
}

class BinDemux extends Basis {
	constructor() {
		super();
		this.inp = new PIN();
		for (var i = 0; i < 16; i++) {
			var out = this['out$' + i] = new POUT();
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
			var out = this['out$' + i] = new POUT();
			let bi = i*2;
			let b = 3 << bi;
			out.plug(
				this.inp.stream.map(v => (v & b) >> bi)
			);
		}
	}
}


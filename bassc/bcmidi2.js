"use strict";

class MidiProc {
	constructor() {
		navigator.requestMIDIAccess()
			.then(ma => {
				this.midi = ma;
				this.connectInputs();
				this.midi.onstatechange = e => this.connectInputs();
			})
		this.listeners = {};
	}
	connectInputs() {
		for (var inp of this.midi.inputs) {
			var inpId = inp[0];
			var input = inp[1];
			console.log('MIDI Input', input.id, ':', input.name);
			input.onmidimessage = mm => this.midiMessageHandler(mm);
		}
	}
	midiMessageHandler(mm) {
		var v = this.decode(mm.data);
		console.log('MIDI', mm.data, v);
		if (!v) return;
		for (let id in this.listeners) {
			this.listeners[id](v);
		}
	}
	decode(data) {
		var hi = data[0] >> 4;
		var lo = data[0] & 0xF;
		switch(hi) {
			case 0x8:
			case 0x9:
				return {
					t: hi == 9 ? 'on' : 'off',
					c: lo,
					n: data[1],
					v: data[2],
				};
			case 0xE:
				return {
					t: 'pitch',
					c: lo,
					v: (data[2]*128.0 + data[1]) / 8192 - 1,
				}
			case 0xB:
				if (data[1] < 120) {
					return {
						t: 'cc',
						c: lo,
						n: data[1],
						v: data[2]/127,
					}
				} else {
					return; // TBD
				}
		}
	}
	addListener(fun) {
		let id = _getObjId(fun);
		this.listeners[id] = fun;
	}
}

var theMidi = new MidiProc();

function midiMessageHandler(mm) {
	console.log('MIDI', mm.data);
}

	
class MidiHub extends BC.BaseNode {
	constructor(parent, [procFilter]) {
		super(...arguments);
		var filter = x => 1;
		if (procFilter instanceof BC.Proc) {
			
		}
		this.inp = new MIDIIN();
		this.out = new MIDIOUT();
		this.out.plugStream(this.inp.stream);
	}
}

class WebMidi extends BC.BaseNode {
	constructor(parent) {
		super(...arguments);
		this.out = new MIDIOUT();
		this.buffer = [];
		theMidi.addListener(v => this.addToBuffer(v));
		this.out.produceFromBuffer(this, 'buffer');
	}
	addToBuffer(v) {
		var maxBuf = 100;
		this.buffer.push(v);
		while (this.buffer.length > maxBuf) this.buffer.shift(); // sanity
		//console.log(this.buffer);
	}
}

const MaxPolyVoices = 16;

class MidiPoly extends BC.BaseNode {
	constructor(parent, [vc]) {
		super(...arguments);
		this.inp = new MIDIIN();
		this.voices = {
			fromNote: {},
			list: [],
			allocated: [],
			free: [],
			max: 4,
			allocate(noteOn) {
				var n = noteOn.n;
				var i = this.fromNote[n];
				if (i) {
					this.deallocate(i);
				}
				if (this.allocated.length >= this.max) {
					this.deallocate(this.allocated[0]);
				}
				i = this.free.shift();
				this.allocated.push(i);
				this.fromNote[n] = i;
				this.list[i - 1].note = n;
				this.list[i - 1].buffer.push(noteOn);
				return this;
			},
			deallocate(i, noteOff) {
				if (!i) return;
				var n = this.list[i - 1].note;
				if (!noteOff) {
					noteOff = {
						t: 'off', n: n, v: 0,
					}
				}
				this.list[i - 1].buffer.push(noteOff);
				this.free.push(i);
				var ai = this.allocated.indexOf(i);
				this.allocated.splice(ai, 1);
				delete this.fromNote[n];
				return this;
			},
		}
		for (var i = 0; i < MaxPolyVoices; i++) {
			this['out$' + i] = new MIDIOUT();
			this.voices.list[i] = {
				buffer: [],
				note: 0,
			};
		}
		if (!vc) vc = 4;
		if (vc <= 0) vc = 1;
		if (vc > MaxPolyVoices) vc = MaxPolyVoices;
		this.voices.max = vc;
		for (var i = 0; i < vc; i++) {
			this.voices.free.push([i + 1]);
		}
		var scan = this.inp.stream.scan((vs, es) => {
			for (var e of es) {
				switch(e.t) {
					case 'on':
						vs.allocate(e);
						break;
					case 'off':
						vs.deallocate(vs.fromNote[e.n], e);
						break;
					case 'pitch':
					case 'cc':
						for (var i = 0; i < vc; i++) {
							vs.list[i].buffer.push(e);
						}
						break;
				}
			}
			return vs;
		}, this.voices);
		for (var i = 0; i < MaxPolyVoices; i++) {
			let ii = i;
			this['out$' + i].plugStream(
				scan.map(vs => {
					var buf = vs.list[ii].buffer;
					vs.list[ii].buffer = [];
					if (buf.length > 0) console.log('out' + ii, buf);
					return buf;
				})
			);
		}
	}
}

class MidiCC extends BC.BaseNode {
	constructor(parent, [n]) {
		super(...arguments);
		this.ccn = n;
		this.inp = new MIDIIN();
		this.out = new POUT();
		this.value = 0;
		this.out.plugStream(
			this.inp.stream.scan((v, es) => {
				for (var e of es) {
					if (e.t == 'cc' && e.n == this.ccn) v = e.v;
				}
				return v;
			}, 0)
		);
	}
}

class MidiPitchWheel extends BC.BaseNode {
	constructor(parent, [n]) {
		super(...arguments);
		this.ccn = n;
		this.inp = new MIDIIN();
		this.out = new POUT();
		this.value = 0;
		this.out.plugStream(
			this.inp.stream.scan((v, es) => {
				for (var e of es) {
					if (e.t == 'pitch') v = e.v;
				}
				return v;
			}, 0)
		);
	}
}

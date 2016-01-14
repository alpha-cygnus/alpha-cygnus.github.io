"use strict";

class MidiProc {
	constructor() {
		navigator.requestMIDIAccess()
			.then(ma => {
				this.midi = ma;
				for (var inp of ma.inputs) {
					var inpId = inp[0];
					var input = inp[1];
					console.log('MIDI Input', input.id, ':', input.name);
					input.onmidimessage = mm => this.midiMessageHandler(mm);
				}
			})
		this.listeners = {};
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

	
class MidiHub extends Basis {
	constructor() {
		super();
		this.inp = new MIDIIN();
		this.out = new MIDIOUT();
		this.out.stream.plug(this.inp.stream);
	}
}

class WebMidi extends Basis {
	constructor() {
		super();
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

OO.newPackage('AA', function(OO, Tone, $) {
	var audioContext = Tone.context;
	
	AA.newClass(OO.Base,
		function Base() {
		},
		{
			_init: function (name, rhs) {
				return this;
			},
			getContext: function() {
				return audioContext;
			},
		}
	);
	
	AA.newClass(AA.Base, function Feature() {}, {
		_classSort: 0,
		_init: function (name) {
			this.name = name;
		},
		baseName: '*',
		addToDevice: function(dev) {
			this.device = dev;
			
			var cls = this._cls;
			
			var list = dev['list' + cls] || [];
			var list2 = dev['list' + this.baseName] || [];
			var hash = dev['hash' + cls] || {};
			var hash2 = dev['hash' + this.baseName] || {};
			list.push(this);
			if (list !== list2) list2.push(this);
			this._objSort = list2.length;
			hash[this.name] = this;
			hash2[this.name] = this;
			dev['list' + cls] = list;
			dev['list' + this.baseName] = list2;
			dev['hash' + cls] = hash;
			dev['hash' + this.baseName] = hash2;
		},
		getPoint: function (pname) {
			var pns = (pname || '').toString().split('.');
			var point = this.device;
			var pp = point;
			for (var i = 0; i < pns.length; i++) {
				var pn = pns[i];
				if (typeof point == 'object' && pn in point) {
					pp = point;
					point = point[pn];
				} else break;
			};
			if (typeof point == 'function') return point.call(pp);
			return point;
		},
		setPoint: function (pname, value) {
			var pns = (pname || '').toString().split('.');
			var o = this.device;
			var pn = pns[0];
			for (var i = 1; i < pns.length; i++) {
				if (typeof o[pn] == 'object') o = o[pn];
				else break;
				var pn = pns[i];
			};
			if (typeof o[pn] == 'function') o[pn](value);
			else o[pn] = value;
		},
	});
	
	AA.newClass(AA.Feature, function InputAnalog() {}, {
		_classSort: 10,
		_init: function (name, point) {
			this.name = name;
			this.pointName = (point || '').toString();
		},
		baseName: 'InputAnalog',
		addToDevice: function(dev) {
			AA.Feature.prototype.addToDevice.call(this, dev);
			this.point = this.getPoint(this.pointName);
		},
	});
	
	AA.newClass(AA.InputAnalog, function InputAudio() {}, {
		_classSort: 11,
	});
	AA.newClass(AA.InputAnalog, function InputCV() {}, {
		_classSort: 12,
	});

	AA.newClass(AA.Feature, function OutputAnalog() {}, {
		_classSort: 10,
		_init: function (name, point) {
			this.name = name;
			this.pointName = (point || '').toString();
		},
		baseName: 'OutputAnalog',
		addToDevice: function(dev) {
			AA.Feature.prototype.addToDevice.call(this, dev);
			this.point = this.getPoint(this.pointName);
		},
	});
	
	AA.newClass(AA.OutputAnalog, function OutputAudio() {}, {
		_classSort: 11,
	});
	AA.newClass(AA.OutputAnalog, function OutputCV() {}, {
		_classSort: 12,
	});


	AA.newClass(AA.Feature, function InputGate() {}, {
		_classSort: 20,
		_init: function (name, pointStart, pointStop) {
			this.name = name;
			this.startName = pointStart;
			this.stopName = pointStop;
		},
		addToDevice: function(dev) {
			AA.Feature.prototype.addToDevice.call(this, dev);
		},
		gate: function(on, time) {
			this.setPoint(on ? this.startName : this.stopName, time);
		},
	});

	AA.newClass(AA.Feature, function OutputGate() {}, {
		_classSort: 20,
		_init: function (name, onGateName) {
			this.name = name;
			this.onGateName = onGateName;
			this.listeners = {};
			this.last_li = 0;
		},
		addToDevice: function(dev) {
			AA.Feature.prototype.addToDevice.call(this, dev);
			var self = this;
			this.setPoint(this.onGateName, function(on, time) {
				time = time || audioContext.currentTime;
				for (var li in self.listeners) {
					if (typeof self.listeners[li] == 'function') self.listeners[li](on, time);
				}
			});
		},
		addListener: function(func) {
			var li = ++this.last_li;
			this.listeners[li] = func;
			return li;
		},
		removeListener: function(li) {
			if (this.listeners[li]) {
				delete this.listeners[li];
			}
		}
	});
	
	
	AA.newClass(AA.Feature, function Param() {}, {
		baseName: 'Param',
		_prop__value: { set: function(v) { return this._set(v); }, get: function() { return this._get(); }},
		_init: function (name, point) {
			this.name = name;
			this.pointName = (point || '').toString();
		},
		_set: function(value) {
			return this.setPoint(this.pointName, value);
		},
		_get: function() {
			return this.getPoint(this.pointName);
		},
	});
	
	AA.newClass(AA.Param, function ParamFloat() {}, {
		_init: function (name, point, range) {
			this.name = name;
			this.pointName = (point || '').toString();
			this.range = range;
		},
	});
	AA.newClass(AA.Param, function ParamSelect() {}, {
		_init: function (name, point, values) {
			this.name = name;
			this.pointName = (point || '').toString();
			this.values = values;
		},
	});
	
	
	//var devCnt = {};
	
	AA.newClass(AA.Base, function Device() {}, {
		features: [],
		_classSort: 0,
		_init: function(name, params) {
			if (typeof name == 'object') {
				params = name;
				name = '';
			}
			params = params || {};
			// if (!name) {
			// 	var pref = this._cls.charAt(0);
			// 	var i = devCnt[pref] || 0;
			// 	devCnt[pref] = ++i;
			// 	name = pref + i;
			// 	this._objSort = i;
			// } else {
			// 	var m;
			// 	if (m = name.toString().match(/^([a-zA-Z]+)(\d+)/)) {
			// 		var pref = m[1];
			// 		var i = m[2]*1;
			// 		this._objSort = i;
			// 		if (!devCnt[pref] || devCnt[pref] < i) devCnt[pref] = i;
			// 	}
			// }
			this.name = name;
			this.initAudio();
			var self = this;
			this.features.map(function(ftr) {
				var ftr = AA.newObj(ftr);
				if (ftr.addToDevice) ftr.addToDevice(self);
			});
			for (pn in params) {
				var p = this.hashParam && this.hashParam[pn];
				if (p) p._set(params[pn]);
				else throw 'Param ' + pn + ' in ' + this._cls + ' not found';
			};
		},
		initAudio: function() {
		},
		dispose: function() {
		},
		getJSON: function(withName) {
			var res = [this._cls];
			if (withName) res.push(this.name);
			var params = {};
			for (var pn in (this.hashParam || {})) {
				var p = this.hashParam[pn];
				var v = p._get();
				if (p._cls == 'ParamFloat') {
					v = Math.round(v*1000)/1000;
				}
				params[pn] = v;
			}
			if (Object.keys(params).length > 0) {
				res.push(params);
			}
			return res;
		},
		clone: function() {
			var json = this.getJSON(false);
			return AA.newObj(json);
		},
	});
	
	AA.newClass(AA.Device, function Osc() {}, {
		features: [
			//['InputCV', 'f', 'fGain'],
			['InputCV', 'n', 'nGain'],
			['OutputAudio', 'o', 'osc'],
			['ParamSelect', 'type', 'osc.type', ['sine', 'triangle', 'square', 'sawtooth']],
		],
		_classSort: 10,
		initAudio: function() {
			this.osc = audioContext.createOscillator();
			this.osc.start(0);
			//this.fGain = audioContext.createGain();
			this.nGain = audioContext.createGain();
			//this.fGain.connect(this.osc.frequency);
			this.nGain.connect(this.osc.detune);
			//this.fGain.gain.value = 55;
			this.nGain.gain.value = 100;
		},
	});
	
	AA.newClass(AA.Device, function Filter() {}, {
		_prop_slope: { set: function(v) { this.setSlope(v); }, get: function() { return this._slope; } },
		_prop_ftype: { set: function(v) { this.setFtype(v); }, get: function() { return this.flt_in.type; } },
		_classSort: 30,
		features: [
			['InputAudio', 'i', 'flt_in'],
			['InputCV', 'n', 'nGain'],
			['OutputAudio', 'o', 'flt_out'],
			['ParamSelect', 'type', 'ftype', [
				"lowpass",
				"highpass",
				//"bandpass",
				//"lowshelf",
				//"highshelf",
				//"peaking",
				//"notch",
				//"allpass"
			]],
			['ParamFloat', 'Q', 'qGain.gain.value', [0, 100]],
			['ParamSelect', 's', 'slope', ['12db', '24db', '36db', '48db']],
		],
		initAudio: function() {
			this.flts = [];
			this.nGain = audioContext.createGain();
			this.nGain.gain.value = 100;
			this.qGain = audioContext.createGain();
			this.c1 = new Tone.Signal(1);
			this.c1.connect(this.qGain);
			this.flt_in = audioContext.createGain();
			this.flt_out = audioContext.createGain();
			for (var i = 0; i < 4; i++) {
				var flt = audioContext.createBiquadFilter();
				this.nGain.connect(flt.detune);
				this.qGain.connect(flt.Q);
				flt.frequency.value = 440;
				//if (i) this.flts[i - 1].connect(flt);
				this.flts[i] = flt;
			}
			this.flt_in.connect(this.flts[0]);
			this.slope = '12db';
		},
		setSlope: function(v) {
			var vi = {'12db': 0, '24db': 1, '36db': 2, '48db': 3}[v] || 0;
			this._slope = v;
			for (var i = 0; i < 4; i++) {
				var flt = this.flts[i];
				flt.disconnect();
			}
			for (var i = 0; i < vi; i++) {
				this.flts[i].connect(this.flts[i + 1]);
			}
			this.flts[vi].connect(this.flt_out);
		},
		setFtype: function(v) {
			for (var i = this.flts.length - 1; i >= 0; i--) {
				this.flts[i].type = v;
			};
		},
	});
	
	AA.newClass(AA.Device, function Gain() {}, {
		features: [
			['InputAudio', 'i', 'gain'],
			['OutputAudio', 'o', 'gain'],
			['ParamFloat', 'g', 'gain.gain.value', [-100, 100]],
		],
		_classSort: 41,
		initAudio: function() {
			this.gain = audioContext.createGain();
		},
	});
	
	AA.newClass(AA.Device, function Amp() {}, {
		features: [
			['InputAudio', 'i', 'gain'],
			['OutputAudio', 'o', 'gain'],
			['InputCV', 'g', 'gain.gain'],
		],
		_classSort: 40,
		initAudio: function() {
			this.gain = audioContext.createGain();
			this.gain.gain.value = 0;
		},
	});
	
	AA.newClass(AA.Device, function Env() {}, {
		_classSort: 20,
		features: [
			['InputAudio', 'i', 'gain'],
			['InputGate', 'g', 'attack', 'release'],
			['OutputAudio', 'o', 'gain'],
			['ParamFloat', 'a', 'a', [0, 10]],
			['ParamFloat', 'd', 'd', [0, 10]],
			['ParamFloat', 's', 's', [-10, 10]],
			['ParamFloat', 'r', 'r', [0, 10]],
			['ParamFloat', 'min', 'min', [-10, 10]],
			['ParamFloat', 'max', 'max', [-10, 10]],
		],
		initAudio: function() {
			//this.env = new Tone.Envelope();
			this.min = 0; this.max = 1;
			this.a = 0.01; this.d = 0.1; this.s = 0.5; this.r = 0.2;
			this.gain = audioContext.createGain();
			this.gain.gain.value = this.min;
			this._control = this.gain.gain;
		},
		attack: function(time) {
			this._control.cancelScheduledValues(time);
			this._control.setTargetAtTime(this.max, time, this.a / 4);
			this._control.setTargetAtTime(this.s, time + this.a, this.d / 4);
		},
		release: function(time) {
			this._control.cancelScheduledValues(time);
			this._control.setTargetAtTime(this.min, time, this.r / 4);
		},
	});
	
	AA.keyboards = {};
	
	AA.newClass(AA.Device, function Keyboard() {}, {
		features: [
			['OutputGate', 'g', 'onGate'],
			['OutputCV', 'o', 'cv'],
			['ParamFloat', 'pt', 'portaTime', [0, 10]],
		],
		_classSort: 60,
		initAudio: function() {
			this.cv = new Tone.Signal(0); // 0 = middle A, 440 Hz, 12/Octave
			AA.keyboards[this.name] = this;
			this.notes = {};
		},
		trig: function(on, note) { // on is 0, 1 or undef (no retrig, just set note), note is midi note
			if (on) {
				this.notes[note] = 1;
			} else {
				delete this.notes[note];
			}
			var ns = Object.keys(this.notes).map(function(n) { return n*1; });
			if (ns.length) {
				var maxNote = Math.max.apply(Math, ns);

				this.cv.setCurrentValueNow();
				this.cv.linearRampToValueAtTime(
					(maxNote - 69), // 0 = middle A, 440 Hz, 12/Octave
					audioContext.currentTime + this.portaTime
				);
			}
			if (on && this.onGate && ns.length == 1) {
				this.onGate(true);
			}
			if (!on && this.onGate && ns.length == 0) {
				this.onGate(false);
			}
		},
		dispose: function() {
			delete AA.keyboards[this.name];
		},
	});
	
	AA.newClass(AA.Device, function Const() {}, {
		features: [
			['OutputCV', 'o', 'cv'],
			['ParamFloat', 'v', 'cv._scalar.gain.value', [-100, +100]],
		],
		_classSort: 50,
		initAudio: function() {
			this.cv = new Tone.Signal(1);
		},
	});
	
	AA.newClass(AA.Device, function Master() {}, {
		features: [
			['InputAudio', 'm', 'm'],
			['InputAudio', 'l', 'l'],
			['InputAudio', 'r', 'r'],
			['OutputAudio', 'o', 'masterOut'],
			['ParamFloat', 'v', 'masterOut.gain.value'],
		],
		_classSort: 80,
		initAudio: function() {
			this.m = audioContext.createGain();
			this.m.toMaster();

			// this.l = audioContext.createGain();
			// this.r = audioContext.createGain();

			// this.ls = audioContext.createChannelSplitter(2);
			// this.rs = audioContext.createChannelSplitter(2);
			
			// this.l.connect(this.ls, 0, 0);
			
			// this.r.connect(this.rs, 0, 0);
			
			// this.merger = audioContext.createChannelMerger(2);
			// this.ls.connect(this.merger, 0, 0);
			// this.rs.connect(this.merger, 0, 1);
			// this.merger.toMaster();
			
			this.l = audioContext.createPanner();
			this.l.setPosition(-1, 0, 0);
			this.l.panningModel="equalpower";
			this.l.toMaster();
			this.r = audioContext.createPanner();
			this.r.setPosition(1, 0, 0);
			this.r.panningModel="equalpower";
			this.r.toMaster();
			this.masterOut = Tone.Master.output;
		},
	});
	
	AA.scopes = {};
	
	AA.newClass(AA.Device, function Scope() {}, {
		features: [
			['InputAudio', 'i', 'an'],
		],
		_classSort: 81,
		initAudio: function() {
			this.an = audioContext.createAnalyser();
			AA.scopes[this.name] = this;
		},
		createByteBuffer: function() {
			return new Uint8Array(this.an.fftSize);
		},
		getByteScope: function(buffer) {
			var buffer = buffer || this.createByteBuffer();
			this.an.getByteTimeDomainData(buffer);
			return buffer;
		},
		dispose: function() {
			delete AA.scopes[this.name];
		},
	});
	
	AA.newClass(AA.Device, function Panner() {}, { // voltage controlled panner
		_classSort: 79,
		features: [
			['InputAudio', 'i', 'inp'],
			['OutputAudio', 'o', 'out'],
			['InputCV', 'p', 'pan.gain'],
		],
		initAudio: function() {
			this.one = new Tone.Signal(0.5);
			this.negate = audioContext.createGain(); this.negate.gain.value = -1;
			// this.pan = audioContext.createGain();
			// this.pan.gain.value = 0.5;
			// this.inp = audioContext.createGain();
			// this.lgain = audioContext.createGain();
			// this.rgain = audioContext.createGain();
			// this.inp.connect(this.lgain); this.inp.connect(this.rgain);
			// this.pan.connect(this.rgain.gain);
			// this.pan.connect(this.negate);
			// this.one.connect(this.pan);
			// this.one.connect(this.lgain.gain);
			// this.negate.connect(this.lgain.gain);
			// this.out = audioContext.createChannelMerger();
			// this.lgain.connect(this.out);
			// this.rgain.connect(this.out);
			this.l = audioContext.createPanner();
			this.l.setPosition(-1, 0, 0);
			this.l.panningModel="equalpower";
			this.r = audioContext.createPanner();
			this.r.setPosition(+1, 0, 0);
			this.r.panningModel="equalpower";
			this.out = audioContext.createGain();
			this.l.connect(this.out);
			this.r.connect(this.out);
			this.inp = audioContext.createGain();
			this.lgain = audioContext.createGain(); this.lgain.connect(this.l);
			this.rgain = audioContext.createGain(); this.rgain.connect(this.r);
			this.inp.connect(this.lgain); this.inp.connect(this.rgain);
			this.lgain.gain.value = 1;
			this.rgain.gain.value = 0;
			this.pan = audioContext.createGain();
			this.pan.gain.value = 1;
			this.one.connect(this.pan);
			this.pan.connect(this.rgain.gain);
			this.pan.connect(this.negate);
			this.negate.connect(this.lgain.gain);
		},
	});
	

	AA.newClass(AA.Base, function Connector() {}, {
		_init: function(output, input) {
			this.input = input;
			this.output = output;
		},
		_set: function(x) { // 0 = disconnect, 1 - connect, float other than that - gain.
			
		},
		dispose: function() {
			this._set(0);
		},
	});
	
	AA.newClass(AA.Connector, function ConnectorAnalog() {}, {
		_prop__value: { set: function(v) { return this._set(v); }, get: function() { return this._get(); }},
		_init: function(output, input) {
			if (!(input instanceof AA.InputAnalog)) throw 'Bad input';
			if (!(output instanceof AA.OutputAnalog)) throw 'Bad input';
			this.input = input;
			this.output = output;
			this.value = 0;
			this.gain = null;
		},
		_set: function(v) {
			if (Math.abs(v) < 0.0001) {
				if (this.gain) {
					this.gain.disconnect();
					this.gain = null;
				}
				return;
			}
			if (!this.gain) {
				this.gain = audioContext.createGain();
				this.gain.gain.value = 0;
				this.gain.connect(this.input.point);
				this.output.point.connect(this.gain);
			}
			this.gain.gain.value = v;
		},
		_get: function() {
			if (this.gain) {
				return this.gain.gain.value;
			} else {
				return '';
			}
		},
	});
	AA.newClass(AA.Connector, function ConnectorGate() {}, {
		_prop__value: { set: function(v) { return this._set(v); }, get: function() { return this._get(); }},
		_init: function(output, input) {
			if (!(input instanceof AA.InputGate)) throw 'Bad input';
			if (!(output instanceof AA.OutputGate)) throw 'Bad output';
			this.input = input;
			this.output = output;
			this.li = 0;
		},
		_set: function(v) {
			if (Math.abs(v) < 0.1) {
				if (this.li) {
					this.output.removeListener(this.li);
					this.li = 0;
				}
				return;
			}
			var self = this;
			this.li = this.output.addListener(function(on, time) {
				self.input.gate(on, time || audioContext.currentTime);
			});
		},
		_get: function() {
			return this.li ? 1 : 0;
		},
	});
	
	AA.newClass(AA.Base, function Matrix() {}, {
		_init: function(kind, rack) {
			this.kind = kind;
			this.rack = rack;
			this.inList = {};
			this.inHash = {};
			this.outList = {};
			this.outHash = {};
			this.connects = {};
			this.inLast = 0;
			this.outLast = 0;
		},
		addDevice: function(dev) {
			var devInputs = dev['listInput' + this.kind];
			if (devInputs) {
				for (var i = 0; i < devInputs.length; i++) {
					this.addLine(devInputs[i], 'in');
				};
			}
			var devOutputs = dev['listOutput' + this.kind];
			if (devOutputs) {
				for (var i = 0; i < devOutputs.length; i++) {
					this.addLine(devOutputs[i], 'out');
				};
			}
			this.inSorted = this.getSortedEndList(this.inHash);
			this.outSorted = this.getSortedEndList(this.outHash);
		},
		getCellIdx: function(cc) {
			return cc.out + '>' + cc['in'];
		},
		addLine: function(thisEnd, thisKind) {
			var thatKind = {'in': 'out', 'out': 'in'}[thisKind];
			var thisIdx = ++this[thisKind + 'Last'];
			var thisCode = thisEnd.device.name + '.' + thisEnd.name;
			this[thisKind + 'List'][thisIdx] = thisCode;
			this[thisKind + 'Hash'][thisCode] = thisEnd;
			for (var thatCode in this[thatKind + 'Hash']) {
				var cc = {};
				cc[thisKind] = thisCode;
				cc[thatKind] = thatCode;
				var ci = this.getCellIdx(cc);
				this.connects[ci] = AA.newObj(['Connector' + this.kind, this.outHash[cc.out], this.inHash[cc['in']]]);
			}
		},
		removeLine: function(thisEnd, thisKind) {
			var thatKind = {'in': 'out', 'out': 'in'}[thisKind];
			var thisCode = thisEnd.device.name + '.' + thisEnd.name;
			var thisEnd = this[thisKind + 'Hash'][thisCode];
			for (var thisIdx in this[thisKind + 'List']) {
				if (this[thisKind + 'List'][thisIdx] === thisEnd) {
					delete this[thisKind + 'List'][thisIdx];
					break;
				}
			}
			delete this[thisKind + 'Hash'][thisCode];
			for (var thatCode in this[thatKind + 'Hash']) {
				var cc = {};
				cc[thisKind] = thisCode;
				cc[thatKind] = thatCode;
				var ci = this.getCellIdx(cc);
				this.connects[ci].dispose();
				delete this.connects[ci];
			}
		},
		removeDevice: function(dev) {
			var devInputs = dev['listInput' + this.kind];
			if (devInputs) {
				for (var i = 0; i < devInputs.length; i++) {
					this.removeLine(devInputs[i], 'in');
				};
			}
			var devOutputs = dev['listOutput' + this.kind];
			if (devOutputs) {
				for (var i = 0; i < devOutputs.length; i++) {
					this.removeLine(devOutputs[i], 'out');
				};
			}
			this.inSorted = this.getSortedEndList(this.inHash);
			this.outSorted = this.getSortedEndList(this.outHash);
		},
		getConnector: function(from, to) {
			var ci = this.getCellIdx({out: from, 'in': to});
			return this.connects[ci];
		},
		getSortedEndList: function(hash) {
			var res = {};
			var codes = Object.keys(hash);
			function getOrder(end) {
				return end._classSort*1000000 + end.device._classSort*10000 + end.device._objSort*100 + end._objSort*1;
			};
			codes = codes.sort(function(a, b) {
				return getOrder(hash[a]) - getOrder(hash[b]);
			});
			for (var i = 0; i < codes.length; i++) {
				res[i + 1] = {code: codes[i], end: hash[codes[i]]};
			};
			return res;
		},
	});

	AA.newClass(AA.Base, function Rack() {}, {
		_init: function() {
			this.matrixAnalog = AA.newObj(['Matrix', 'Analog', this]);
			this.matrixGate = AA.newObj(['Matrix', 'Gate', this]);
			// this.devList = {};
			this.devHash = {};
			// this.devLast = 0;
			this.devIndx = {};
			this.devSort = [];
			for (var i = 0; i < arguments.length; i++) {
				var arg = arguments[i];
				if ($.isArray(arg)) {
					this.addDevice(arg);
				}
				else if (typeof arg == 'object') {
					for (var code in arg) {
						this.getConnector(code)._set(arg[code]);
					}
				}
			}
		},
		addDevice: function(dev) {
			if ($.isArray(dev)) dev = AA.newObj(dev);
			if (!(dev instanceof AA.Device)) throw 'Wrong device';
			
			var m;
			var pref;
			var idx;
			if (dev.name && (m = dev.name.toString().match(/^([a-zA-Z]+)(\d+)$/))) {
				pref = m[1];
				idx = m[2]*1;
			} else {
				var pref = dev._clsPref || dev._cls.charAt(0);
				idx = 0;
			}
			var pdh = this.devIndx[pref] || {};
			this.devIndx[pref] = pdh;
			if (idx && pdh[idx]) idx = 0;
			if (!idx) {
				var idxs = Object.keys(pdh).concat([0]);
				var maxidx = Math.max.apply(Math, idxs);
				var idx = maxidx + 1;
			}
			pdh[idx] = dev;
			dev._objSort = idx;
			dev._objPref = pref;
			var name = pref + idx;
			// dev.title = dev.name || name;
			dev.name = name;
			
			//var di = ++this.devLast;
			//this.devList[di] = dev;
			this.devHash[dev.name] = dev;
			this.matrixAnalog.addDevice(dev);
			this.matrixGate.addDevice(dev);
			this.devSort = this.getSortedDevList();
		},
		removeDevice: function(dev) {
			// var di = this.devHash[dev.name];
			delete this.devHash[dev.name];
			delete this.devIndx[dev._objPref][dev._objSort];
			this.matrixAnalog.removeDevice(dev);
			this.matrixGate.removeDevice(dev);
			dev.dispose();
			this.devSort = this.getSortedDevList();
		},
		getSortedDevList: function() {
			var hash = this.devHash;
			function ds(dev) {
				return dev._classSort*1000 + dev._objSort;
			}
			var res = Object.keys(hash);
			res = res.sort(function(a, b) {
				return ds(hash[a]) - ds(hash[b]);
			});
			res = res.map(function(code) {
				return {code: code, dev: hash[code]};
			});
			return res;
		},
		getDevice: function(name) {
			return this.devHash[name];
		},
		getConnector: function(code) { // [(a:|g:)]do[.oo]:di[.ii]
			code = (code || '').toString();
			var m = code.match(/(a:|g:)?(\w+)(\.\w+)?>(\w+)(\.\w+)?/);
			//var m = code.match(/(\w+)>(\w+)/);
			if (!m) throw 'Wrong connector code: ' + code;
			var mk = {'a:': 'Analog', 'g:': 'Gate'}[m[1] || 'a:'];
			var d0 = this.getDevice(m[2]);
			if (!d0) throw 'Wrong device: ' + m[2];
			var d1 = this.getDevice(m[4]);
			if (!d1) throw 'Wrong device: ' + m[4];
			var o0 = m[3];
			if (!o0) {
				var o = d0['listOutput' + mk][0];
				if (!o) throw 'No outputs';
				o0 = '.' + o.name;
			}
			var i1 = m[5];
			if (!i1) {
				var i = d1['listInput' + mk][0];
				if (!i) throw 'No inputs';
				i1 = '.' + i.name;
			}
			return this['matrix' + mk].getConnector(d0.name + o0, d1.name + i1);
		},
		getParam: function (code) {
			var m = code.match(/(p:)?(\w+)\.(\w+)/);
			if (!m) throw 'Wrong param code: ' + code;
			var d0 = this.getDevice(m[2]);
			if (!d0) throw 'Wrong device: ' + m[2];
			var p = d0.hashParam[m[3]];
			if (!p) throw 'Param not found: ' + code;
			return p;
		},
		getSetterByCode: function(code) {
			var m = code.match(/^([agp]):/);
			if (!m) throw 'Wrong code: ' + code;
			var p = this[m[1] == 'p' ? 'getParam' : 'getConnector'](code);
			if (!p) throw 'Not found: ' + code;
			return p;
		},
		setByCode: function(code, v) {
			this.getSetterByCode(code)._set(v);
			return this;
		},
		getByCode: function(code) {
			return this.getSetterByCode(code)._get();
		},
		getJSON: function() {
			var res = [this._cls];
			for (var i = 0; i < this.devSort.length; i++) {
				var dev = this.devSort[i].dev;
				res.push(dev.getJSON(true));
			};
			var ms = {};
			var mxs = {a: this.matrixAnalog, g: this.matrixGate};
			for (var k in mxs) {
				var mx = mxs[k];
				for (code in mx.connects) {
					var v = mx.connects[code]._get();
					if (v) {
						ms[k + ':' + code] = Math.round(v*1000)/1000;
					}
				}
			}
			res.push(ms);
			return res;
		},
	});
}, OO, Tone, jQuery);


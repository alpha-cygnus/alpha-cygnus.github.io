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
				if (point[pn]) {
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
	});
	AA.newClass(AA.InputAnalog, function InputCV() {}, {
	});

	AA.newClass(AA.Feature, function OutputAnalog() {}, {
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
	});
	AA.newClass(AA.OutputAnalog, function OutputCV() {}, {
	});


	AA.newClass(AA.Feature, function InputGate() {}, {
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
		_init: function (name, point) {
			this.name = name;
			this.pointName = (point || '').toString();
		},
		set: function(value) {
			return this.setPoint(this.pointName, value);
		},
		get: function() {
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
	
	var devCnt = {};
	
	AA.newClass(AA.Base, function Device() {}, {
		features: [],
		_init: function(name, params) {
			if (typeof name == 'object') {
				params = name;
				name = '';
			}
			params = params || {};
			if (!name) {
				var pref = this._cls.charAt(0);
				var i = devCnt[pref] || 0;
				devCnt[pref] = ++i;
				name = pref + i;
			}
			this.name = name;
			this.initAudio();
			var self = this;
			this.features.map(function(ftr) {
				var ftr = AA.newObj(ftr);
				if (ftr.addToDevice) ftr.addToDevice(self);
			});
			for (pn in params) {
				var p = this.hashParam && this.hashParam[pn];
				if (p) p.set(params[pn]);
				else throw 'Param ' + pn + ' in ' + this._cls + ' not found';
			};
		},
		initAudio: function() {
		},
		dispose: function() {
		},
	});
	
	AA.newClass(AA.Device, function Osc() {}, {
		features: [
			//['InputCV', 'f', 'fGain'],
			['InputCV', 'n', 'nGain'],
			['OutputAudio', 'o', 'osc'],
			['ParamSelect', 't', 'osc.type', ['sine', 'triangle', 'square', 'sawtooth']],
		],
		initAudio: function() {
			this.osc = audioContext.createOscillator();
			this.osc.start();
			//this.fGain = audioContext.createGain();
			this.nGain = audioContext.createGain();
			//this.fGain.connect(this.osc.frequency);
			this.nGain.connect(this.osc.detune);
			//this.fGain.gain.value = 55;
			this.nGain.gain.value = 1200;
		},
	});
	
	AA.newClass(AA.Device, function Filter() {}, {
		features: [
			['InputAudio', 'i', 'flt'],
			['InputCV', 'n', 'nGain'],
			['OutputAudio', 'o', 'flt'],
			['ParamSelect', 't', 'flt.type', [
				"lowpass",
				"highpass",
				//"bandpass",
				//"lowshelf",
				//"highshelf",
				//"peaking",
				//"notch",
				//"allpass"
			]],
			['ParamFloat', 'q', 'flt.Q.value', [0, 100]],
		],
		initAudio: function() {
			this.flt = audioContext.createBiquadFilter();
			this.nGain = audioContext.createGain();
			this.nGain.connect(this.flt.detune);
			this.nGain.gain.value = 1200;
			this.flt.frequency.value = 440;
		},
	});
	
	AA.newClass(AA.Device, function Gain() {}, {
		features: [
			['InputAudio', 'i', 'gain'],
			['OutputAudio', 'o', 'gain'],
			['ParamFloat', 'g', 'gain.gain.value', [-100, 100]],
		],
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
		initAudio: function() {
			this.gain = audioContext.createGain();
			this.gain.gain.value = 0;
		},
	});
	
	AA.newClass(AA.Device, function Env() {}, {
		features: [
			['InputGate', 'g', 'env.triggerAttack', 'env.triggerRelease'],
			['OutputCV', 'o', 'env.output'],
			['ParamFloat', 'a', 'env.attack', [0, 10]],
			['ParamFloat', 'd', 'env.decay', [0, 10]],
			['ParamFloat', 's', 'env.sustain', [-1, 1]],
			['ParamFloat', 'r', 'env.release', [0, 10]],
			['ParamFloat', 'min', 'env.min', [-10, 10]],
			['ParamFloat', 'max', 'env.max', [-10, 10]],
		],
		initAudio: function() {
			this.env = new Tone.Envelope();
		},
	});
	
	AA.keyboards = {};
	
	AA.newClass(AA.Device, function Keyboard() {}, {
		features: [
			['OutputGate', 'g', 'onGate'],
			['OutputCV', 'o', 'cv'],
			['ParamFloat', 'p', 'portaTime', [0, 10]],
		],
		initAudio: function() {
			this.cv = new Tone.Signal(0); // 0 = middle A, 440 Hz, 1/Octave
			AA.keyboards[this.name] = this;
		},
		trig: function(on, note) { // on is 0, 1 or undef (no retrig, just set note), note is midi note
			this.cv.setCurrentValueNow();
			this.cv.linearRampToValueAtTime(
				(note - 69)/12, // 0 = middle A, 440 Hz, 1/Octave
				audioContext.currentTime + this.portaTime
			);
			if (on != undefined && this.onGate) {
				this.onGate(on);
			}
		},
		dispose: function() {
			delete AA.keyboards[this.name];
		},
	});
	
	AA.newClass(AA.Device, function Const() {}, {
		features: [
			['OutputCV', 'o', 'cv'],
		],
		initAudio: function() {
			this.cv = new Tone.Signal(1);
		},
	});
	
	AA.newClass(AA.Device, function Mono() {}, {
		features: [
			['InputAudio', 'i', 'gain'],
		],
		initAudio: function() {
			this.gain = audioContext.createGain();
			this.gain.toMaster();
		},
	});
	
	AA.newClass(AA.Base, function Connector() {}, {
		_init: function(output, input) {
			this.input = input;
			this.output = output;
		},
		set: function(x) { // 0 = disconnect, 1 - connect, float other than that - gain.
			
		},
		dispose: function() {
			this.set(0);
		},
	});
	
	AA.newClass(AA.Connector, function ConnectorAnalog() {}, {
		_init: function(output, input) {
			if (!(input instanceof AA.InputAnalog)) throw 'Bad input';
			if (!(output instanceof AA.OutputAnalog)) throw 'Bad input';
			this.input = input;
			this.output = output;
			this.value = 0;
			this.gain = null;
		},
		set: function(v) {
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
	});
	AA.newClass(AA.Connector, function ConnectorGate() {}, {
		_init: function(output, input) {
			if (!(input instanceof AA.InputGate)) throw 'Bad input';
			if (!(output instanceof AA.OutputGate)) throw 'Bad output';
			this.input = input;
			this.output = output;
			this.li = 0;
		},
		set: function(v) {
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
		},
		getCellIdx: function(cc) {
			return cc.out + ',' + cc['in'];
		},
		addLine: function(thisEnd, thisKind) {
			var thatKind = {'in': 'out', 'out': 'in'}[thisKind];
			var thisIdx = ++this[thisKind + 'Last'];
			this[thisKind + 'List'][thisIdx] = thisEnd;
			this[thisKind + 'Hash'][thisEnd.device.name + '.' + thisEnd.name] = thisIdx;
			for (var thatIdx in this[thatKind + 'List']) {
				var cc = {};
				cc[thisKind] = thisIdx;
				cc[thatKind] = thatIdx;
				var ci = this.getCellIdx(cc);
				this.connects[ci] = AA.newObj(['Connector' + this.kind, this.outList[cc.out], this.inList[cc['in']]]);
			}
		},
		removeLine: function(thisEnd, thisKind) {
			var thatKind = {'in': 'out', 'out': 'in'}[thisKind];
			var thisName = thisEnd.device.name + '.' + thisEnd.name;
			var thisIdx = this[thisKind + 'Hash'][thisName];
			delete this[thisKind + 'Hash'][thisName];
			delete this[thisKind + 'List'][thisIdx];
			for (var thatIdx in this[thatKind + 'List']) {
				var cc = {};
				cc[thisKind] = thisIdx;
				cc[thatKind] = thatIdx;
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
		},
		getConnector: function(from, to) {
			var ci = this.getCellIdx({out: this.outHash[from], 'in': this.inHash[to]});
			return this.connects[ci];
		},
	});

	AA.newClass(AA.Base, function Rack() {}, {
		_init: function() {
			this.matrixAnalog = AA.newObj(['Matrix', 'Analog', this]);
			this.matrixGate = AA.newObj(['Matrix', 'Gate', this]);
			this.devList = {};
			this.devHash = {};
			this.devLast = 0;
			for (var i = 0; i < arguments.length; i++) {
				var arg = arguments[i];
				if ($.isArray(arg)) {
					this.addDevice(arg);
				}
				else if (typeof arg == 'object') {
					for (var code in arg) {
						this.getConnector(code).set(arg[code]);
					}
				}
			}
		},
		addDevice: function(dev) {
			if ($.isArray(dev)) dev = AA.newObj(dev);
			if (!(dev instanceof AA.Device)) throw 'Wrong device';
			var di = ++this.devLast;
			this.devList[di] = dev;
			this.devHash[dev.name] = di;
			this.matrixAnalog.addDevice(dev);
			this.matrixGate.addDevice(dev);
		},
		removeDevice: function(dev) {
			var di = this.devHash[dev.name];
			delete this.devList[di];
			delete this.devHash[dev.name];
			this.matrixAnalog.removeDevice(dev);
			this.matrixGate.removeDevice(dev);
			dev.dispose();
		},
		getDevice: function(name) {
			return this.devList[this.devHash[name]];
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
	});
}, OO, Tone, jQuery);


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
			
			var list = dev['list' + this.constructor.name] || [];
			var list2 = dev['list' + this.baseName] || [];
			var hash = dev['hash' + this.constructor.name] || {};
			var hash2 = dev['hash' + this.baseName] || {};
			list.push(this);
			if (list !== list2) list2.push(this);
			hash[this.name] = this;
			hash2[this.name] = this;
			dev['list' + this.constructor.name] = list;
			dev['list' + this.baseName] = list2;
			dev['hash' + this.constructor.name] = hash;
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


	AA.newClass(AA.Feature, function GateIn() {}, {
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

	AA.newClass(AA.Feature, function GateOut() {}, {
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
				for (var li in this.listeners) {
					if (typeof this.listeners[li] == 'function') this.listeners[li](on, time);
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
	
	
	AA.newClass(AA.Base, function Device() {}, {
		features: [],
		_init: function(name) {
			this.name = name;
			this.initAudio();
			var self = this;
			this.features.map(function(ftr) {
				var ftr = AA.newObj(ftr);
				if (ftr.addToDevice) ftr.addToDevice(self);
			});
		},
		initAudio: function() {
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
			['InputCV', 'n', 'nGain'],
			['InputAudio', 'i', 'flt'],
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
			['InputCV', 'g', 'gain.gain'],
			['InputAudio', 'i', 'gain'],
			['OutputAudio', 'o', 'gain'],
		],
		initAudio: function() {
			this.gain = audioContext.createGain();
		},
	});
	
	AA.newClass(AA.Device, function Env() {}, {
		features: [
			['InputGate', 'g', 'env.triggerAttack', 'env.triggerRelease'],
			['OutputCV', 'o', 'env.output'],
			['ParamFloat', 'a', 'env.attack', [0, 10]],
			['ParamFloat', 'd', 'env.decay', [0, 10]],
			['ParamFloat', 's', 'env.sustain', [0, 1]],
			['ParamFloat', 'r', 'env.release', [0, 10]],
		],
		initAudio: function() {
			this.env = new Tone.Envelope();
		},
	});
	
	AA.newClass(AA.Device, function Keyboard() {}, {
		features: [
			['OutputGate', 'g', 'onGate'],
			['OutputCV', 'o', 'cv'],
			['CaptureKeys', 'onKeyDown', 'onKeyUp'],
		],
		initAudio: function() {
			this.cv = new Tone.Signal(0);
		},
		onKeyDown: function() {
			if (this.onGate) {
				this.onGate(1);
			}
		},
		onKeyUp: function() {
			if (this.onGate) {
				this.onGate(0);
			}
		},
	});
	
	AA.newClass(AA.Device, function Constant() {}, {
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
			if (!(input instanceof AA.GateIn)) throw 'Bad input';
			if (!(output instanceof AA.GateOut)) throw 'Bad output';
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
		_init: function(kind) {
			this.kind = kind;
			this.hashDevice = {};
			this.listDevice = {};
			this.inputs = {};
			this.hashInputs = {};
			this.outputs = {};
			this.hashOutputs = {};
			this.connects = {};
			this.li = 0;
			this.lo = 0;
		},
		addDevice: function(dev) {
			if ($.isArray(dev)) dev = AA.newObj(dev);
			this.listDevice.push(dev;
			this.hashDevice[dev.name] = dev;
			var devInputs = dev['listInput' + this.kind];
			if (devInputs) {
				for (var i = 0; i < devInputs.length; i++) {
					var li = ++this.li;
					var inp = devInputs[i];
					this.inputs[li] = inp;
					this.hashInputs[dev.name + '.' + inp.name] = li;
				};
			}
			var devOutputs = dev['listOutput' + this.kind];
			if (devOutputs) {
				for (var i = 0; i < devOutputs.length; i++) {
					var lo = ++this.lo;
					var outp = devOutputs[i];
					this.outputs[lo] = outp;
					this.hashOutputs[dev.name + '.' + outp.name] = lo;
				};
			}
			this.rebuildConnectors();
		},
		getCellIdx: function(o, i) {
			return o + '->' + i;
		},
		rebuildConnectors: function() {
			for (var i in this.inputs) {
				var inp = this.inputs[i];
				for (var o in this.outputs) {
					var outp = this.outputs[o];
					var ci = this.getCellIdx(o, i);
					if (!cells[ci]) {
						cells[ci] = AA.newObj(['Connector' + this.kind, outp, inp]);
					}
				}
			}
		},
	});
}, OO, Tone, jQuery);


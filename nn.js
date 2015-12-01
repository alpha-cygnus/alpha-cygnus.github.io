function getObjId(obj) {

}

function PIN(def) {
	var pool = Kefir.pool();
	this.plug = (obs) => {
		pool.plug(obs.map(v => {id: getObjId(obs), v: v}));
	}
	this.last = { v: def };
	this.out = pool
		.scan((acc, next) => { acc[next.id] = next.v; return acc; }, {})
		.map(acc => {
			var v = 0;
			var t;
			for (var id in acc) {
				v += acc[id].v;
				t = acc[id].t;
			}
			var this.last = {t: t, v: v};
			return this.last;
		})
		.toProperty(() => this.last);
}


function PConn(a, b) {
	b.plug(a);
}

function AConn(a, b, w) {
	var g = $context.createGain();
	a.connect(g); g.connect(b);
	g.gain.value = w;
	this.a = a;
	this.b = b;
	this.g = g;
}


function AAConn(obj, a, b, weight) {
	var g = $context.createGain();
	a.connect(g); g.connect(b);
	if (typeof weight == 'string') {
		obj[weight] = g.gain;
		g.gain.value = 0;
	} else {
		g.gain.value = weight;
	}
	this.a = a;
	this.b = b;
	this.g = g;
}

function PPConn(obj, a, b, weight) {
	if (typeof weight == 'string') {
		var p = new PIN();
		obj[weight] = p;
	} else {
		p = Kefir.constant(weight);
	}
	src = Kefir.combine([a, p], (v, w) => w*v);
	src.onValue(function(v) {
		b.setValue(v);
	})
}

function PAConn(obj, a, b, weight) {
	var g = $context.createGain();
	var c = getConst1();
	c.connect(g); g.connect(b);
	var src = a;
	
	if (typeof weight == 'string') {
		var p = new PIN();
		obj[weight] = p;
	} else {
		p = Kefir.constant(weight);
	}
	src = Kefir.combine([a, p], (v, w) => w*v);
	src.onValue(function(v) {
		g.gain.value = weight*v;
	})
	this.a = a;
	this.b = b;
	this.g = g;
}

function APConn(obj, a, b, weight) {
	var ap = Kefir.poll()
}

function createConnection(obj, a, b, weight) {
	if (isAudioOut(a) && isAudioIn(b)) {
		return new AAConn(obj, a, b, weight);
	}
	if (isPropertyOut(a) && isAudioIn(b)) {
		
	}
}
"use strict";

const abcScales = {
	'-7': {F: -1, C: -1, G: -1, D: -1, A: -1, E: -1, B: -1},
	'-6': {F:  0, C: -1, G: -1, D: -1, A: -1, E: -1, B: -1},
	'-5': {F:  0, C:  0, G: -1, D: -1, A: -1, E: -1, B: -1},
	'-4': {F:  0, C:  0, G:  0, D: -1, A: -1, E: -1, B: -1},
	'-3': {F:  0, C:  0, G:  0, D:  0, A: -1, E: -1, B: -1},
	'-2': {F:  0, C:  0, G:  0, D:  0, A:  0, E: -1, B: -1},
	'-1': {F:  0, C:  0, G:  0, D:  0, A:  0, E:  0, B: -1},
	  0 : {F:  0, C:  0, G:  0, D:  0, A:  0, E:  0, B:  0},
	  1 : {F:  1, C:  0, G:  0, D:  0, A:  0, E:  0, B:  0},
	  2 : {F:  1, C:  1, G:  0, D:  0, A:  0, E:  0, B:  0},
	  3 : {F:  1, C:  1, G:  1, D:  0, A:  0, E:  0, B:  0},
	  4 : {F:  1, C:  1, G:  1, D:  1, A:  0, E:  0, B:  0},
	  5 : {F:  1, C:  1, G:  1, D:  1, A:  1, E:  0, B:  0},
	  6 : {F:  1, C:  1, G:  1, D:  1, A:  1, E:  1, B:  0},
	  7 : {F:  1, C:  1, G:  1, D:  1, A:  1, E:  1, B:  1},
	// major
	'C#': 7,
	'F#': 6,
	'B': 5,
	'E': 4,
	'A': 3,
	'D': 2,
	'G': 1,
	'C': 0,
	'F': -1,
	'Bb': -2,
	'Eb': -3,
	'Ab': -4,
	'Db': -5,
	'Gb': -6,
	'Cb': -7,
	// minor
	'A#m': 7,
	'D#m': 6,
	'G#m': 5,
	'C#m': 4,
	'F#m': 3,
	'Bm': 2,
	'Em': 1,
	'Am': 0,
	'Dm': -1,
	'Gm': -2,
	'Cm': -3,
	'Fm': -4,
	'Bbm': -5,
	'Ebm': -6,
	'Abm': -7,
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


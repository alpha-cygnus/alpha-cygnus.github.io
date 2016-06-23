define(['gmap'], function(gmap) {
	"use strict";
	var {gen, range} = gmap;
	function start() {
		console.log('hello, world');
		//console.log([...gen(13, 5, 7).zip(range(1)).map(([v, i]) => `[${i}]=${v}`)]);
	}
	function test() {
		var fs = new FieldState;
		var ts = {};
		for (var x = 1; x <= 8; x++) {
			for (var y = 1; y <= 8; y++) {
				var c = Math.floor(Math.random()*4);
				fs.putAt(x, y, c);
				ts['' + y + x] = c;
			}
		}
		for (var x = 1; x <= 8; x++) {
			for (var y = 1; y <= 8; y++) {
				var c = fs.getAt(x, y);
				if (ts['' + y + x] != c) console.log(x, y, c, ts['' + y + x]);
			}
		}
		console.log('F\n' + fs.draw());
		console.log(Array.from(fs.state).map(x => x.toString(4)), ts);
		fs.initStartState();
		console.log('F\n' + fs.draw());
		//console.log(Array.from(fs.state).map(x => x.toString(4)));
		var c1 = 1;
		var c2 = 2;
		var moves1 = fs.gatherMoves(c1);
		console.log(moves1);
		var i = Math.floor(Math.random()*Object.keys(moves1).length);
		var {x, y, dirs} = moves1[Object.keys(moves1)[i]];
		fs.makeMove(c1, x, y, dirs);
		console.log('F\n' + fs.draw());
		var moves2 = fs.gatherMoves(c2);
		var i = Math.floor(Math.random()*Object.keys(moves2).length);
		var {x, y, dirs} = moves2[Object.keys(moves2)[i]];
		fs.makeMove(c2, x, y, dirs);
		console.log('F\n' + fs.draw());
	}
	
	class FieldState {
		constructor() {
			this.state = new Uint16Array(8);
		}
		getIntPos(x, y) {
			if (x < 0 || x > 8) return -1;
			if (y < 0 || y > 8) return -1;
			var pos = (y - 1)*8 + x - 1;
			var p = pos >> 3;
			var s = 2*(7 - pos&7);
			var m = 0x3 << s;
			return {p, m, s};
		}
		putAt(x, y, c) {
			var {p, m, s} = this.getIntPos(x, y);
			if (p < 0) return this;
			this.state[p] = ((c << s) & m) | (this.state[p] & (~m));
			return this;
		}
		getAt(x, y) {
			var {p, m, s} = this.getIntPos(x, y);
			if (p < 0) return 3;
			return (this.state[p] & m) >> s;
		}
		*genPossibleMoves(tc) {
			var ctc = tc == 1 ? 2 : 1;
			var edge = {
				left: [[0], range(0, 9)],
				right: [[9], range(0, 9)],
				top: [range(0, 9), [0]],
				bottom: [range(0, 9), [9]],
			}
			for (var [e, dx, dy] of [
				[edge.left,		 1,  0], // l2r
				[edge.right, 	-1,  0], // r2l
				[edge.top,		 0,  1], // t2b
				[edge.bottom,	 0, -1], // b2t
				[edge.top,		 1,  1], // t 2 br
				[edge.left,		 1,  1], // l 2 br
				[edge.top, 		-1,  1], // t 2 bl
				[edge.right,	-1,  1], // r 2 bl
				[edge.bottom,	 1, -1], // b 2 tr
				[edge.left,		 1, -1], // l 2 tr
				[edge.bottom,	-1, -1], // b 2 tl
				[edge.right, 	-1, -1], // r 2 tl
			]) {
				var [x0g, y0g] = e;
				for (var x0 of x0g) {
					for (var y0 of y0g) {
						var [x, y, pc, cnt] = [x0, y0, 3, 0];
						for (var i = 1; i < 9; i++, x += dx, y += dy) {
							var c = this.getAt(x, y);
							if (c == tc) {
								cnt = 1; continue;
							}
							if (c == ctc && cnt) {
								cnt++; continue;
							}
							if (c == 0 && cnt > 1) {
								yield [x, y, cnt - 1, dx, dy];
								cnt = 0;
							}
						}
					}
				}
			}
		}
		gatherMoves(tc) {
			return this.genPossibleMoves(tc).foldl(
				(a, [x, y, cnt, dx, dy]) => {
					var key = '' + y + x;
					a[key] = (a[key] || {x, y, dirs: []});
					a[key].dirs.push([cnt, dx, dy]);
					return a;
				}
				, {});
		}
		makeMove(c, x, y, dirs) {
			this.putAt(x, y, c);
			for (var [cnt, dx, dy] of dirs) {
				for (var i = 1; i <= cnt; i++) this.putAt(x - i*dx, y - i*dy, c);
			}
		}
		initStartState() {
			for (var x of range(1, 8)) {
				for (var y of range(1, 8)) {
					this.putAt(x, y, (x & 14) == 4 && (y & 14) == 4 ? ((x + y) & 1) + 1 : 0);
				}
			}
		}
		draw() {
			return [...range(1, 8).map(y => {
				return [...range(1, 8).map(x => '.xo*'[this.getAt(x, y)])].join('') + '\n'
			})].join('');
		}
	}
	
	window.FieldState = FieldState;
	
	return {
		start,
		test,
		FieldState,
	}
});
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
		// var c1 = Math.floor(Math.random()*2) + 1;
		// var c2 = 3 - c1;
		var moves1 = fs.gatherMoves();
		console.log(moves1);
		var i = Math.floor(Math.random()*Object.keys(moves1).length);
		var {x, y, dirs} = moves1[Object.keys(moves1)[i]];
		fs.makeMove(x, y);
		console.log('F\n' + fs.draw());
		var moves2 = fs.gatherMoves();
		var i = Math.floor(Math.random()*Object.keys(moves2).length);
		var {x, y, dirs} = moves2[Object.keys(moves2)[i]];
		fs.makeMove(x, y);
		console.log('F\n' + fs.draw());
	}
	
	var _cacheMoves = {};
	
	class FieldState {
		constructor(cloneFrom) {
			if (cloneFrom) {
				this.state = cloneFrom.state.slice(0);
				this.colorToMove = cloneFrom.colorToMove;
			} else {
				this.state = new Uint16Array(8);
				this.colorToMove = 1;
			}
		}
		getFieldKey() {
			return this.colorToMove + ',' + this.state.toString();
		}
		getIntPos(x, y) {
			if (x < 1 || x > 8) return {p: -1};
			if (y < 1 || y > 8) return {p: -1};
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
		*genAll() {
			yield * range(1, 8).gmap(x => range(1, 8).map(y => ({x, y, c: this.getAt(x, y)})));
		}
		*genDirs(x, y) {
			var tc = this.colorToMove;
			var ctc = 3 - tc;
			for (var [dx, dy] of [
				[ 1,  0], // r
				[-1,  0], // l
				[ 0,  1], // b
				[ 0, -1], // t
				[ 1,  1], // br
				[-1,  1], // bl
				[ 1, -1], // tr
				[-1, -1], // tl
			]) {
				var cnt = 0;
				for (var i = 1; i < 8; i++) {
					var c = this.getAt(x + dx*i, y + dy*i);
					if (c == 3) break;
					if (c == 0) break;
					if (c == tc) {
						if (cnt) yield {x, y, cnt, dx, dy}; //dirs.push([cnt, dx, dy]);
						break;
					}
					if (c == ctc) {
						cnt++;
					}
				}
			}
		}
		*genPossibleMoves() {
			// for (var [x, y] of range(1, 8).mul(range(1, 8))) {
			// 	var c = this.getAt(x, y);
			// 	if (c !== 0) continue;
			// 	yield * this.genDirs(x, y).map(({cnt, dx, dy}) => [x, y, cnt, dx, dy]);
			// }
			// this.genAll().filter(([x, y, c]) => c == 0).gmap(function * ([x, y, c]) {
			// 	yield * this.genDirs(x, y).map(({cnt, dx, dy}) => [x, y, cnt, dx, dy]);
			// });
			for (var {x, y} of this.genAll().filter(({c}) => c == 0)) {
				// var c = this.getAt(x, y);
				// if (c !== 0) continue;
				yield * this.genDirs(x, y).map(({cnt, dx, dy}) => [x, y, cnt, dx, dy]);
			}
		}
		getXYKey(x, y) {
			return '' + y + x;
		}
		_gatherMoves() {
			var k = this.getFieldKey();
			var cam = _cacheMoves[k];
			if (cam) {
				this.allMoves = cam;
			} else {
				_cacheMoves[k]
					= this.allMoves
					= this.genPossibleMoves().foldl(
						(a, [x, y, cnt, dx, dy]) => {
							var key = this.getXYKey(x, y);
							a[key] = (a[key] || {x, y, dirs: []});
							a[key].dirs.push({cnt, dx, dy});
							return a;
						}
						, {});
			}
			return this.allMoves;
		}
		anyMoves() {
			for (var k in this.allMoves) {
				return true;
			}
			return false;
		}
		makeMove(x, y) {
			var c = this.colorToMove;
			var move = this.getMove(x, y);
			if (!move && this.anyMoves()) throw 'Illegal move';
			var any = false;
			this.toMove = {x, y};
			var that = this.clone();
			if (move) {
				var dirs = move.dirs;
				for (var {cnt, dx, dy} of dirs) {
					for (var i = 1; i <= cnt; i++) that.putAt(x + i*dx, y + i*dy, c);
					any = true;
				}
				if (any) that.putAt(x, y, c);
			}
			that.colorToMove = 3 - that.colorToMove;
			that._gatherMoves();
			return that;
		}
		*moves() {
			for (var key in this.allMoves) {
				var {x, y, dirs} = this.allMoves[key];
				yield {key, x, y, dirs};
			}
		}
		getMove(x, y) {
			return this.allMoves[this.getXYKey(x, y)];
		}
		isLegalMove(x, y) {
			return !!this.getMove(x, y);
		}
		clone() {
			return new FieldState(this);
		}
		initStartState(tc = 1) {
			this.colorToMove = tc;
			for (var x of range(1, 8)) {
				for (var y of range(1, 8)) {
					this.putAt(x, y, (x & 14) == 4 && (y & 14) == 4 ? ((x + y) & 1) + 1 : 0);
				}
			}
			this._gatherMoves();
			return this;
		}
		draw() {
			return [...range(1, 8).map(y => {
				return [...range(1, 8).map(x => '.xo*'[this.getAt(x, y)])].join('') + '\n'
			})].join('');
		}
		
		chooseMove(chooser) {
			var move = chooser.choose(this);
			if (!move) return {x: 0, y: 0};
			return move;
		}
	}
	
	class MoveChooser {
		constructor() {
		}
		choose(fs) {
			var maxW = -10000;
			if (!fs.anyMoves()) return;
			var moves = fs.moves().foldl((a, move) => {
				var w = this.moveWeight(move, fs);
				a[w] = (a[w] || []).concat([move]);
				if (maxW < w) maxW = w;
				return a;
			}, {});
			return moves[maxW][Math.floor(moves[maxW].length*Math.random())];
		}
		moveWeight(move, fs) {
			return 1;
		}
	}
	
	class GreedyMoveChooser extends MoveChooser {
		constructor() {
			super();
		}
		moveWeight({x, y, dirs}) {
			var e = {1: 1, 2: -1, 7: -1, 8: 1};
			var cnt = gen(dirs).foldl((a, b) => a + b.cnt, 0);
			return ((e[x] || 0) + (e[y] || 0))*100 + cnt;
		}
	}
	
	window.FieldState = FieldState;
	window._cacheMoves = _cacheMoves;
	
	return {
		start,
		test,
		FieldState,
		MoveChooser,
		GreedyMoveChooser,
	}
});
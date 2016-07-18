"use strict";
define(['rev', 'gmap'], function({FieldState, MoveChooser}, {gen, range}) {
	class MMChooser extends MoveChooser {
		constructor(maxDepth) {
			super();
			this.maxDepth = maxDepth;
		}
		moveWeight(move, fs) {
			function assessField(fs, final) {
				var c1 = fs.colorToMove;
				var c2 = 3 - c1;
				var cc = fs.genAll().foldl((a, {c}) => (a[c]++, a), {0: 0, 1: 0, 2: 0, 3: 0});
				return cc[c2] - cc[c1];
			}
			function assessMove({x, y}, fs, d) {
				if (d <= 0) return assessField(fs);
				var nfs = fs.makeMove(x, y);
				if (!nfs.anyMoves()) {
					if (x == 0 && y == 0) return assessField(fs, 1);
					return -assessMove({x: 0, y: 0}, nfs, d - 1);
				}
				return nfs.moves().map(m => -assessMove(m, nfs, d - 1)).max();
			}
			return assessMove(move, fs, this.maxDepth);
		}
	}
	return {
		MMChooser,
	}
});

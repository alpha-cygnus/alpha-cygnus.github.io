"use strict";
define(['rev', 'gmap'], function({FieldState, MoveChooser}, {gen, range}) {
	class MMChooser extends MoveChooser {
		constructor(maxDepth) {
			super();
			this.maxDepth = maxDepth;
		}
		choose(fs) {
			return this.chooseForDepth(fs, this.maxDepth);
		}
		chooseForDepth(fs, depth) {
			
		}
	}
	
});

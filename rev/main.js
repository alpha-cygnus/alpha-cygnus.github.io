"use strict";
define(['rev', 'gmap'], function({start, test, FieldState}, {gen, range}) {
	console.log('required main');
	test();
	start();
	
	var html = [...(function*() {
		yield `<div class="row">`;
		yield `<div class="header cell left top">&nbsp;</div>`
		yield * range(1, 8).map(x => `<div class="header cell top">${x}</div>`);
		yield `</div>`;
		yield * range(1, 8).mapGen(function*(y) {
			yield `<div class="row">`;
			yield `<div class="header cell left">${y}</div>`
			yield * range(1, 8).map(x => `<div class="field cell" id="cell-${y}-${x}">&nbsp;</div>`);
			yield `</div>`;
		});
	})()].join('');
	$('#field').html(html);
	
	var fs = new FieldState();
	fs.initStartState();
	
	var cellHtml = [
		'&nbsp;', 'X', 'O', '*'
	];
	//console.log([...range(1, 8).mul(range(1, 8)).map(([x, y]) => $(`#cell-${y}-${x}`).html(fs.getAt(x, y)))]);
	[...range(1, 8).mapGen(x => range(1, 8).map(y => $(`#cell-${y}-${x}`).html(cellHtml[fs.getAt(x, y)])))];
	var c1 = 1;
	var moves = fs.gatherMoves(c1);
	for (var k in moves) {
		var {x, y} = moves[k];
		$(`#cell-${y}-${x}`).html('!').addClass('possible');
	}
	
	return {};
});
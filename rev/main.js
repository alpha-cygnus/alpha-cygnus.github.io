"use strict";
define(['rev', 'gmap'], function({start, test, FieldState}, {gen, range}) {
	console.log('required main');
	// test();
	// start();
	
	var cellHtml = {
		0: '&nbsp;',
		1: '<span class="token one">&nbsp;</span>',
		2: '<span class="token two">&nbsp;</span>',
		3: '<span class="token three">&nbsp;</span>',
		possible: '<span class="token">&nbsp;</span>',
	};

	var html = [...(function*() {
		yield `<div class="row info">`;
		yield * range(1, 2).map(c => `<div class="cell header left top">${cellHtml[c]}</div><div class="cell header top" id="count${c}"><span class="header">2</span></div>`);
		yield `<button id="undo">UNDO</button>`;
		yield `<button id="pass">PASS</button>`;
		yield `</div>`;
		
		yield `<div class="row">`;
		yield `<div class="header cell left top" id="cell-0-0">&nbsp;</div>`
		yield * range(1, 8).map(x => `<div class="header cell top"><span class="header">${x}</span></div>`);
		yield `</div>`;
		yield * range(1, 8).gmap(function*(y) {
			yield `<div class="row">`;
			yield `<div class="header cell left"><span class="header">${y}</span></div>`
			yield * range(1, 8).map(x => `<div class="field cell" id="cell-${y}-${x}">&nbsp;</div>`);
			yield `</div>`;
		});
	})()].join('');
	$('#field').html(html);
	
	var fss = [new FieldState().initStartState()];
	var fs = fss[0];

	
	// var c1 = Math.floor(Math.random()*2) + 1;
	// var c2 = 3 - c1;
	
	function renderField() {
		$('#undo').prop('disabled', fss.length < 2);
			
		[...range(1, 8).gmap(x => range(1, 8).map(y => $(`#cell-${y}-${x}`).html(cellHtml[fs.getAt(x, y)])))];
		$('#cell-0-0').html(cellHtml[fs.colorToMove]);
		var moves = fs.gatherMoves();
		$('.cell').off('click').removeClass('possible');
		var any = false;
		for (var k in moves) {
			var {x, y} = moves[k];
			$(`#cell-${y}-${x}`).html(cellHtml.possible).addClass('possible').data('x', x).data('y', y).data('k', k);
			var any = true;
		}
		$('#pass').prop('disabled', any);
		// var all = fs.genAll();
		$('#count1 span').html(fs.genAll().filter(({c}) => c == 1).length());
		$('#count2 span').html(fs.genAll().filter(({c}) => c == 2).length());
		$('.cell.possible').on('click', function() {
			var k = $(this).data('k');
			var {x, y, dirs} = moves[k];
			fs = fs.clone();
			fss.push(fs);
			fs.makeMove(x, y, dirs);
			renderField();
		});
	}
	$('#pass').click(function() {
		fs = fs.clone();
		fss.push(fs);
		fs.passMove();
		renderField();
	});

	$('#undo').click(function() {
		if (fss.length < 2) {
			alert('nothing to undo');
			return;
		}
		fss.pop();
		fs = fss[fss.length - 1];
		renderField();
		// [c1, c2] = [c2, c1];
	});
	
	
	renderField();
	//console.log([...range(1, 8).mul(range(1, 8)).map(([x, y]) => $(`#cell-${y}-${x}`).html(fs.getAt(x, y)))]);
	
	return {};
});
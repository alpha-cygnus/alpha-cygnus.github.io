"use strict";
define(['rev', 'gmap'], function({start, test, FieldState, MoveChooser, GreedyMoveChooser}, {gen, range}) {
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
		yield `<div class="row control" id="control">`
		yield `<div class="cell header left top wide"><span class="header">Start:</span></div>`
		yield * range(0, 3).map(c =>
			`<div class="cell header top start" data-c="${c}">${cellHtml[c]}</div>`
		);
		yield `</div>`
		
		yield `<div class="row info">`;
		yield * range(1, 2).map(c =>
			`<div class="cell header left top">${cellHtml[c]}</div><div class="cell header top"><span class="header" id="count${c}"></span></div>`
		);
		yield `<button id="undo" disabled="disabled">UNDO</button>`;
		yield `<button id="pass" disabled="disabled">PASS</button>`;
		yield `</div>`;
		
		yield `<div class="row">`;
		yield `<div class="header cell left top" id="cell-0-0">&nbsp;</div>`
		yield * range(1, 8).map(x =>
			`<div class="header cell top"><span class="header">${x}</span></div>`
		);
		yield `</div>`;
		yield * range(1, 8).gmap(function * (y) {
			yield `<div class="row">`;
			yield `<div class="header cell left"><span class="header">${y}</span></div>`
			yield * range(1, 8).map(x => `<div class="field cell" id="cell-${y}-${x}">&nbsp;</div>`);
			yield `</div>`;
		});
		yield `<div class="row" id="winInfo">`
		yield `<div class="cell header left top" id="winner"></div><div class="cell header top wide"><span class="header" id="winRes">64:64</span></div>`;
		yield `</div>`
	})()].join('');
	$('#field').html(html);
	
	//var fs = fss[0];

	var fss;
	window.fss = fss;
	var mc = new GreedyMoveChooser;
	var autoColor = 0;
	
	// var c1 = Math.floor(Math.random()*2) + 1;
	// var c2 = 3 - c1;
	
	function renderField() {
		var fs = fss[0];
		
		$('.hover').removeClass('hover');
		$('#undo').prop('disabled', fss.length < 2);
			
		[...range(1, 8).gmap(x => range(1, 8).map(y => $(`#cell-${y}-${x}`).html(cellHtml[fs.getAt(x, y)])))];
		$('#cell-0-0').html(cellHtml[fs.colorToMove]);
		$('.cell.possible').off('mouseenter mouseleave click').removeClass('possible');
		for (var {key, x, y, dirs} of fs.moves()) {
			$(`#cell-${y}-${x}`).html(cellHtml.possible).addClass('possible').data('x', x).data('y', y).data('k', key);
		}
		$('#pass').prop('disabled', fs.anyMoves());
		// var all = fs.genAll();
		var c1c = fs.genAll().filter(({c}) => c == 1).length();
		var c2c = fs.genAll().filter(({c}) => c == 2).length();
		$('#count1').html(c1c);
		$('#count2').html(c2c);
		
		function doMove({x, y}) {
			fss.unshift(fs.makeMove(x, y));
			renderField();
		}
		
		$('.cell.possible')
			.on('click', function() {
				doMove($(this).data());
			})
			.hover(function() {
				var {x, y} = $(this).data();
				var move = fs.getMove(x, y);
				for (var dir of move.dirs) {
					for (var i = 1; i <= dir.cnt; i++) {
						var xx = x + i*dir.dx;
						var yy = y + i*dir.dy;
						$(`#cell-${yy}-${xx}`).addClass('hover');
					}
				}
			}, function() {
				$('.hover').removeClass('hover');
			})
			;
		
		if (!fs.anyMoves() && !fs.makeMove().anyMoves()) {
			if (c1c > c2c) {
				$('#winner').html(cellHtml[1]);
				$('#winRes').html(`${c1c} to ${c2c}`);
			}
			if (c1c < c2c) {
				$('#winner').html(cellHtml[2]);
				$('#winRes').html(`${c2c} to ${c1c}`);
			}
			if (c1c == c2c) {
				$('#winner').html('');
				$('#winRes').html(`DRAW`);
			}
			$('#pass').prop('disabled', true);
			$('#winInfo').show(300);
		} else {
			$('#winInfo').hide(300);
			
			if (fs.colorToMove == autoColor) {
				doMove(fs.chooseMove(mc));
			}
		}
	}
	$('#pass').click(function() {
		fss.unshift(fss[0].makeMove());
		renderField();
	});
	
	function doUndo(cnt) {
		if (fss.length < cnt + 1) {
			//alert('nothing to undo');
			return false;
		}
		for (; cnt; cnt--) {
			fss.shift();
		}
		renderField();
		return true;
	}

	$('#undo').click(function() {
		doUndo(autoColor ? 2 : 1);
	});
	
	$('.start').click(function() {
		start($(this).data('c'));
	});
	
	function start(sc) {
		if (sc == 3) {
			autoColor = Math.floor(Math.random()*2 + 1);
		} else {
			autoColor = sc;
		}
		console.log('Starting', sc);
		fss = [new FieldState().initStartState()];
		window.fss = fss;
		renderField();
	}
	
	//console.log([...range(1, 8).mul(range(1, 8)).map(([x, y]) => $(`#cell-${y}-${x}`).html(fs.getAt(x, y)))]);
	
	return {};
});
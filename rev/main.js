"use strict";
define(['rev', 'gmap'], function({start, test, FieldState, MoveChooser, GreedyMoveChooser}, {gen, range}) {
	console.log('required main');
	// test();
	// start();
	
	// var cellHtml = {
	// 	0: '<span class="token zero">&nbsp;</span>',
	// 	1: '<span class="token one">&nbsp;</span>',
	// 	2: '<span class="token two">&nbsp;</span>',
	// 	3: '<span class="token three">&nbsp;</span>',
	// 	possible: '<span class="token">&nbsp;</span>',
	// };
	//cellHtml = 
	var tokenClass = {
		0: 'zero', 1: 'one', 2: 'two', 3: 'three', possible: 'possible',
	}
	var tokenClasses = Object.keys(tokenClass).map(k => tokenClass[k]).join(' ');

	var html = [...(function*() {
		yield `<div class="row control" id="control">`
		yield `<div class="cell header left top wide"><span class="header">Start:</span></div>`
		yield * range(0, 3).map(c =>
			`<div class="cell header ${!c ? 'left' : ''} top start ${tokenClass[c]}" data-c="${c}"><span class="token">&nbsp;</span></div>`
		);
		yield `</div>`
		
		yield `<div class="row info">`;
		yield `<div class="cell header left top ${tokenClass[1]}"><span class="token">&nbsp;</span></div><div class="cell header top"><span class="header" id="count1"></span></div>`
		yield `<div class="cell header left top ${tokenClass[2]}"><span class="token">&nbsp;</span></div><div class="cell header top"><span class="header" id="count2"></span></div>`
		yield `<div class="cell header left top wide button disabled" id="undo"><span class="header">UNDO</span></div>`
		yield `<div class="cell header left top wide button disabled" id="pass"><span class="header">PASS</span></div>`
		// yield `<button id="undo" disabled="disabled">UNDO</button>`;
		// yield `<button id="pass" disabled="disabled">PASS</button>`;
		yield `</div>`;
		
		yield `<div class="row">`;
		yield `<div class="header cell left top" id="cell-0-0"><span class="token">&nbsp;</span></div>`
		yield * range(1, 8).map(x =>
			`<div class="header cell top"><span class="header">${x}</span></div>`
		);
		yield `</div>`;
		yield * range(1, 8).gmap(function * (y) {
			yield `<div class="row">`;
			yield `<div class="header cell left"><span class="header">${y}</span></div>`
			yield * range(1, 8).map(x => `<div class="field cell" id="cell-${y}-${x}"><span class="token">&nbsp;</span></div>`);
			yield `</div>`;
		});
		yield `<div class="row" id="winInfo">`
		yield `<div class="cell header left top" id="winner"><span class="token">&nbsp;</span></div><div class="cell header top wide"><span class="header" id="winRes">64:64</span></div>`;
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
		var fs1 = fss[1];
		
		function disable(q, d) {
			if (d) {
				$(q).addClass('disabled');
			} else {
				$(q).removeClass('disabled');
			}
		}
		
		$('.hover').removeClass('hover');
		//$('#undo').prop('disabled', fss.length < 2);
		disable('#undo', fss.length < 2);
		
		$('.cell.possible').off('mouseenter mouseleave click').removeClass('possible');
		$('.field.cell.lastMove').removeClass('lastMove');
		if (fs1 && fs1.toMove) {
			var {x, y} = fs1.toMove;
			if (x && y) $(`#cell-${y}-${x}`).addClass('lastMove');
		}

		for (var {x, y, c} of fs.genAll()) {
			$(`#cell-${y}-${x}`).removeClass(tokenClasses).addClass(tokenClass[c]);
		}

		// [...range(1, 8).gmap(x => range(1, 8).map(y => $(`#cell-${y}-${x} span.token`).html(cellHtml[fs.getAt(x, y)])))];
		//$('#cell-0-0').html(cellHtml[fs.colorToMove]);
		$('#cell-0-0').removeClass(tokenClasses).addClass(tokenClass[fs.colorToMove]);
		if (fs.colorToMove != autoColor) {
			for (var {key, x, y, dirs} of fs.moves()) {
				$(`#cell-${y}-${x}`).addClass('possible').data('x', x).data('y', y).data('k', key);
			}
		}
		//$('#pass').prop('disabled', fs.anyMoves());
		disable('#pass', fs.anyMoves());
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
				$('#winner').removeClass(tokenClasses).addClass(tokenClass[1]);
				$('#winRes').html(`${c1c} to ${c2c}`);
			}
			if (c1c < c2c) {
				$('#winner').removeClass(tokenClasses).addClass(tokenClass[2]);
				$('#winRes').html(`${c2c} to ${c1c}`);
			}
			if (c1c == c2c) {
				$('#winner').removeClass(tokenClasses).addClass(tokenClass[3]);
				$('#winRes').html(`DRAW`);
			}
			disable('#pass', true);
			$('#winInfo').show(300);
		} else {
			$('#winInfo').hide(300);
			$('#winner').removeClass(tokenClasses).addClass(tokenClass[0]);
			if (fs.colorToMove == autoColor) {
				setTimeout(() => doMove(fs.chooseMove(mc)), 1000);
				
			}
		}
	}
	$('#pass').click(function() {
		if ($(this).hasClass('disabled')) return;
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
		if ($(this).hasClass('disabled')) return;
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
		$('#control .lastMove').removeClass('lastMove');
		console.log(`#control div[data-c=${autoColor}]`);
		$(`#control div[data-c=${autoColor}]`).addClass('lastMove');
		console.log('Starting', sc);
		fss = [new FieldState().initStartState()];
		window.fss = fss;
		renderField();
	}
	
	//console.log([...range(1, 8).mul(range(1, 8)).map(([x, y]) => $(`#cell-${y}-${x}`).html(fs.getAt(x, y)))]);
	
	return {};
});
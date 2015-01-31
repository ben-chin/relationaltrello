// Hack the board short link out of the url 
// for use in the Trello API
var extractBoardShortlink = function(url) {
	var pattern = /https:\/\/trello.com\/b\/([a-zA-Z0-9]*)\/*/gm;
	var matches = pattern.exec(url);
	return matches ? matches[1] : null;
};

// Use the card id to render a button in the DOM 
// that will create a board
var renderAddButton = function (cardId, boardId) {
	var tpl = '<a href="#" class="button-link create-subboard" data-card-id="' 
			+ cardId 
			+ '" data-board-id="'
			+ boardId
			+ '" title="Create a child board from a checklist.">  SubBoard It </a>';
	$('.window .window-sidebar .window-module:not(.other-actions) .button-link').last().after(tpl);
};


var renderGotoButton = function (link) {
	var tpl = '<a href="' + link + '" class="button-link goto-subboard" title="Create a child board from a checklist.">  Go To SubBoard </a>';
	$('.window .window-sidebar .window-module:not(.other-actions) .button-link').last().after(tpl);
};

// Send a message to the background script to 
// create a checklist for this card id and 
// link it to a child board
var requestSubboard = function (boardId, cardId, cardTitle) {
	var message = {
		name: 'requestSubboard',
		data: {
			boardId: boardId,
			cardId: cardId,
			cardTitle: cardTitle
		}
	};

	chrome.runtime.sendMessage(message, 
		function (response) {
			console.log(response);
		}
	);
};

// Send a message to bg script to
// scan the board's checklists and return all
// of the valid subboard checklists on this board
var requestSubboardChecklists = function (boardlink) {
	var message = {
		name: 'requestSubboardChecklists',
		data: {
			boardlink: boardlink
		}
	};
	chrome.runtime.sendMessage(message,
		function (response) {
			console.log(response);
			if (response.data){
				var links = response.data.subboardChecklistsLinks;
				for (var i = 0; i < links.length; i++) {
					var link = links[i];
					var tpl = '<div title="This card has a child board." class="badge badge-state-image-only"><span class="badge-icon icon-sm icon-subboard"></span>  </div>';
				    $('.list-card-title[href*="' + link + '"]').nextAll('.badges').append(tpl);
				}
			}
		}
	);
};

// When the background script picks up an opened card request,
// render the subboard button with the given card id
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
  	console.log(message);
    if (message.name == 'cardOpened') {
    	var cardId = message.data.cardId;
    	var boardId = message.data.boardId;

    	if (message.data.hasSubboard) {
    		renderGotoButton(message.data.link);
    	} else {
    		renderAddButton(cardId, boardId);
    	}
    }
  });


$(document).ready(function () {

	var bsl = extractBoardShortlink(window.location.href);
	requestSubboardChecklists(bsl);

	$('.window')
		.on('click', '.button-link.create-subboard', function (e) {
			requestSubboard(
				$(this).data('boardId'),
				$(this).data('cardId'),
				$('.window .window-title .window-title-text').text()
			);
		})
		// .on('click', '.button-link.goto-subboard', function (e) {
		// 	// Need shortlink. bugger
		// 	window.location.pathname = '/b/' + $(this).data('boardId');
		// });
});
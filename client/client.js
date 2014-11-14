// Use the card id to render a button in the DOM 
// that will create a board
var renderAddButton = function (cardId) {
	var tpl = '<a href="#" class="button-link subboard" data-card-id="' + cardId + '" title="Create a child board from a checklist.">  SubBoard It </a>';
	$('.window .window-sidebar .window-module:not(.other-actions) .button-link').last().after(tpl);
};

// Send a message to the background script to 
// create a checklist for this card id and 
// link it to a child board
var requestSubboard = function (cardId, cardTitle) {
	var message = {
		name: 'requestSubboard',
		data: {
			cardId: cardId,
			cardTitle: cardTitle
		}
	};

	chrome.runtime.sendMessage(message, function (response) {
		console.log('Yay');
		console.log(response);
	});
};

// When the background script picks up an opened card request,
// render the subboard button with the given card id
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    if (message.name == 'cardOpened') {
    	var cardId = message.data.cardId;
    	renderAddButton(cardId);
    }
  });


$(document).ready(function () {
	$('.window').on('click', '.button-link.subboard', function (e) {
		requestSubboard(
			$(this).data('cardId'), 
			$('.window .window-title .window-title-text').text()
		);
	});
});
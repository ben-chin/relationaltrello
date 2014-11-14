App = new App();


// Extract board id and card id from the url of 
// the request sent from opening a card
var extractDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/boards\/([a-zA-Z0-9]*)\/cards\/([a-zA-Z0-9]*)/gm;
	var matches = pattern.exec(url);
	return {
		boardId: matches[1],
		cardId: matches[2]
	};
};

// Listen for the request that gets sent when opening a card
chrome.webRequest.onCompleted.addListener(
	function (details) {
		if (details.statusCode !== 200)	return;

		var message = {
			name: 'cardOpened',
			data: extractDetails(details.url)
		};

		chrome.tabs.query({	active: true, currentWindow: true }, 
			function (tabs) {
				console.log(message);
  				chrome.tabs.sendMessage(tabs[0].id, message);
  			}
  		);
	}, {
		urls: [
			"*://trello.com/1/boards/*/cards/*"
		]
	}
);

// Listen for messages (from content script)
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {

  	// Content script has requested a new subboard
    if (message.name == 'requestSubboard') {
    	var cardId = message.data.cardId;
    	var cardTitle = message.data.cardTitle;
    	App.createSubboard(cardId, cardTitle);
    }
  
  });
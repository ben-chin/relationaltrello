Storage = new Storage(chrome);
TrelloClient = new TrelloClient();

// Config stuffs
var urls = [
	"*://trello.com/1/boards/*/cards/*",
	"*://trello.com/1/cards/*",
	"*://trello.com/1/cards/*/checklist/*/checkItem",
	"*://trello.com/1/cards/*/checklist/*/checkItem/*"
];

var patterns = {
	cardOpened: /https:\/\/trello.com\/1\/boards\/([a-zA-Z0-9]*)\/cards\/([a-zA-Z0-9]*)/m,

	checkItems: /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem/m,
	checkItem: /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem\/([a-zA-Z0-9]*)/m,

	cards: /https:\/\/trello.com\/1\/cards/m,
	card: /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)/m
};

/* --------------------------------  
 *   Setup event triggers 
 * -------------------------------- */

RequestSnooper = new RequestSnooper(chrome, urls);

RequestSnooper.addEventTrigger('cardOpened', patterns.cardOpened, 'GET');

RequestSnooper.addEventTrigger('checkItemCreated', patterns.checkItems, 'POST');
RequestSnooper.addEventTrigger('checkItemUpdated', patterns.checkItem, 'PUT');
RequestSnooper.addEventTrigger('checkItemDeleted', patterns.checkItem, 'DELETE');

RequestSnooper.addEventTrigger('cardCreated', patterns.cards, 'POST');
RequestSnooper.addEventTrigger('cardUpdated', patterns.card, 'PUT');
// Is actually inside PUT (archived)
RequestSnooper.addEventTrigger('cardDeleted', patterns.card, 'DELETE');


/* ---------------------------------------------
 *   Setup request<->bg script event handlers 
 * --------------------------------------------- */

// Check if card has a checklist mapped to a subboard
// Send message to content script:
// 		if has subboard, then send board shortlink
//		else false (so render button)	
window.addEventListener('cardOpened', function (e) {
	var boardId = e.detail[0];
	var cardId = e.detail[1];

	Storage.get(cardId)
		.then(function (card) {
			return Storage.get(getValue(card));
		})
		.then(function (checklist) {
			console.log(checklist);
			return TrelloClient.getBoardUrl(getValue(checklist).subboard);
		})
		.then(function (details) {
			sendMsg({
				name: 'cardOpened',
				data: {
					cardId: cardId,
					hasSubboard: true,
					link: details.url
				}
			});
		})
		.fail(function () {
			sendMsg({
				name: 'cardOpened',
				data: {
					boardId: boardId,
					cardId: cardId,
					hasSubboard: false
				}
			});
		});
});


// If checklist is mapped to a subboard
// create new corresponding card on first list of board
// store mapping card <-> checkitem
window.addEventListener('checkItemCreated', function (e) {
	var cardId = e.detail[0];
	var checklistId = e.detail[1];

	Storage.get(checklistId)
		.then(function (checklist) {
			var subboardId = getValue(checklist);
			return TrelloClient.addSubcard(subboardId, checklistId);
		})
		.then(function (newSubcard) {
			TrelloClient.getLastCheckItem(checklistId)
				.then(function (newCheckItem) {
					Storage.setMap(newSubcard.id, newCheckItem.id);
				});
		});
});


// if checkitem is mapped to a subcard
// update subcard
//   - name
//   - list (if item is marked done, or if was done and marked undone)
window.addEventListener('checkItemUpdated', function (e) {
	var cardId = e.detail[0];
	var checklistId = e.detail[1];
	var checkItemId = e.detail[2];

	Storage.get(checkItemId)
		.then(function (checkItem) {
			TrelloClient.getCheckItem(checklistId, checkItemId)
				.then(function (details) {
					TrelloClient.updateSubcard(getValue(checkItem), details);
				});
		});

});


// if checkitem is mapped to a subcard
// delete subcard
// delete mapping
window.addEventListener('checkItemDeleted', function (e) {
	var cardId = e.detail[0];
	var checklistId = e.detail[1];
	var checkItemId = e.detail[2];

	Storage.get(checkItemId)
		.then(function (checkItem) {
			return TrelloClient.deleteSubcard(getValue(checkItem));
		})
		.then(function () {
			Storage.deleteMap(checkItemId);
		});
});

window.addEventListener('cardCreated', function (e) {
	// No helpful info from request yet?
	// Blocking, redirect response into data and send with event.detail?
	// Then can use trello API to actually create the card
	console.debug('cardCreated', e);
});

// if card is mapped to a checkitem
// update checkitem
//   - name
//   - done (if card's list is the last list)
//   - undone (if card's list is not the last list)
//   - CLOSED? (different to DELETE? how to handle mapping??? need it for DELETE)
//   - REOPENED? (reinsert mapping)
window.addEventListener('cardUpdated', function (e) {
	var cardId = e.detail[0];

});

// if card is mapped to a checkitem
// delete checkitem
// delete mapping
window.addEventListener('cardDeleted', function (e) {
	var cardId = e.detail[0];

	Storage.get(cardId)
		.then(function (mapping) {
			TrelloClient.getCard(cardId)
				.then(function (card) {
					console.debug('cardDeleted', card);
					// Assuming one linked checklist per card!
					return TrelloClient.deleteCheckItem(card.idChecklists[0], getValue(mapping));
				})
				.then(function () {
					Storage.deleteMap(cardId);
				})
		});
});



// Listen for messages (from content script)
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {

  	// Content script has requested a new subboard
    if (message.name == 'requestSubboard') {
    	var boardId = message.data.boardId;
    	var cardId = message.data.cardId;
    	var cardTitle = message.data.cardTitle;
    	
    	TrelloClient.createChecklist(cardId, cardTitle)
    		.then(function (checklist) {
    			TrelloClient.createSubboard(cardTitle)
    				.then(function (subboard) {
    					Storage.setMap(checklist.id, subboard.id);
    					
    					TrelloClient.getBoardMembers(boardId)
    						.then(function (members) {
    							async.each(members, 
    								function (member, err) {
    									console.debug('inviting member', member);
    									TrelloClient.addMemberToBoard(subboard.id, member.idMember, member.memberType)
    										.then(function () {
    											err(null);
    										});
    								},
    								function err (error) {
    									if (error) {
    										console.debug('Error inviting member to board.');
    									}
    								});
    						});
    				});
    		});
    }

});


// UTILS

// Send message to current tab
var sendMsg = function (message) {
	console.log(message);
	chrome.tabs.query({ active: true, currentWindow: true }, 
		function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, message);
		});
};

var getValue = function (obj) {
	return obj[Object.keys(obj)[0]];
};
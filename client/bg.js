App = new App();

// Send message to current tab
var sendMsg = function (message) {
	chrome.tabs.query({ active: true, currentWindow: true }, 
		function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, message);
		});
};

// Extract board id and card id from the url of 
// the request sent from opening a card
var extractCardDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/boards\/([a-zA-Z0-9]*)\/cards\/([a-zA-Z0-9]*)/gm;
	var matches = pattern.exec(url);
	return {
		boardId: matches[1],
		cardId: matches[2]
	};
};

var extractCheckItemCreatedDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem/gm;
	var matches = pattern.exec(url);
	return {
		cardId: matches[1],
		checklistId: matches[2]
	};
};

var extractCheckItemUpdatedDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem\/([a-zA-Z0-9]*)/gm;
	var matches = pattern.exec(url);
	return {
		cardId: matches[1],
		checklistId: matches[2],
		checkItemId: matches[3]
	};
};

var extractCheckItemDeletedDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem\/([a-zA-Z0-9]*)/gm;
	var matches = pattern.exec(url);
	return {
		cardId: matches[1],
		checklistId: matches[2],
		checkItemId: matches[3]
	};
};

var extractSubcardDetails = function (url) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)/gm;
	var matches = pattern.exec(url);
	return {
		cardId: matches[1],
	};
};



var isCardOpenedRequest = function (request) {
	var pattern = /https:\/\/trello.com\/1\/boards\/([a-zA-Z0-9]*)\/cards\/([a-zA-Z0-9]*)/gm;
	return pattern.test(request.url) && request.method == "GET";
};

// Checkitem CRUD (two-way mirrorring pt I)
var isCheckItemCreatedRequest = function (request) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem/gm;
	return pattern.test(request.url) && request.method == "POST";

};

var isCheckItemUpdatedRequest = function (request) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem\/([a-zA-Z0-9]*)/gm;
	return pattern.test(request.url) && request.method == "PUT";
};

var isCheckItemDeletedRequest = function (request) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)\/checklist\/([a-zA-Z0-9]*)\/checkItem\/([a-zA-Z0-9]*)/gm;
	return pattern.test(request.url) && request.method == "DELETE";
};

// TODO: mark checkitem as done

// Subcard CRUD (two-way mirrorring pt II)
//   - card creation ?!?!?
//   - card deletion (have to handle update to CLOSED == archived card)
var isCardUpdatedRequest = function (request) {
	var pattern = /https:\/\/trello.com\/1\/cards\/([a-zA-Z0-9]*)/gm;
	return pattern.test(request.url) && request.method == "PUT";
};

// TODO: checklist deletion -> subboard deletion
// TODO: subboard deletion -> checklist deletion

// Listen for the requests that tell us what the user is doing
chrome.webRequest.onCompleted.addListener(
	function (request) {
		if (request.statusCode !== 200)	return;

		console.log(request);

		// A card has been opened
		if (isCardOpenedRequest(request)) {
			var message = {};
			message.name = 'cardOpened';

			var data = extractCardDetails(request.url);
			Trello.get('/cards/' + data.cardId + '/checklists/').then(function (checklists) {
				async.map(checklists, 
					function iterator (checklist, callback) {
				        App.isSubboardChecklist(checklist.id)
				        	.then(function (result) {
				        		if(!$.isEmptyObject(result)) {
				        			callback(null, true);
				        		} else {
				        			callback(null, false);
				        		}
				        	})
				        	.fail(function (err) {
				        		callback(err, null);
				        	});
				    }, function success (err, results) {
				        if (err) {
				        	console.log('oops');
				        } else {
				        	data.hasSubboard = results.length > 0 ? results.reduce(function(a, b) { return a && b; }) : false;
				        	message.data = data;
				        	sendMsg(message);
				        }
				    });
			});
		} 

		// A checkitem has been created
		else if (isCheckItemCreatedRequest(request)) {
			var data = extractCheckItemCreatedDetails(request.url);

			chrome.storage.local.get(data.checklistId, function (result) {
				if (chrome.runtime.lastError) {
					console.log('Not here!');
				} else {
					if (!$.isEmptyObject(result)) {
						App.createNewTask(data.checklistId, result[data.checklistId]);
					} else {
						console.log('Not a subboard checklist!');
					}
				}
			});
		}

		// A checkitem has been updated
		else if (isCheckItemUpdatedRequest(request)) {
			var data = extractCheckItemUpdatedDetails(request.url);
			var endpoint = '/checklist/' + data.checklistId + '/checkItems/' + data.checkItemId;

			App.getFromStorage(data.checkItemId).then(function (result) {
				if (!$.isEmptyObject(result)) {
					var subCardId = result[data.checkItemId];

					Trello.get(endpoint).then(function (checkItem) {
						var newCardData = {
							name: checkItem.name
						};

						App.getFromStorage(data.checklistId).then(function (result) {
							var subboardId = result[data.checklistId];
							Trello.get('/boards/' + subboardId + '/lists/')
								.then(function (lists) {
									var lastListId = lists[lists.length - 1].id;
									var firstListId = lists[0].id;

									// checkitem ticked
									if (checkItem.state == 'complete') {
										newCardData.idList = lastListId;

										Trello.put('/cards/' + subCardId, newCardData).then(function (data) {
											// TODO: Set success message for content script
											console.debug('successfully updated subcard name and position', data);
										});
									// checkitem unticked
									} else {
										Trello.get('/cards/' + subCardId).then(function (card) {
											// card was previously in done (but corresponding checkitem is now unticked)
											if (card.idList == lastListId) {
												newCardData.idList = firstListId;
											}

											Trello.put('/cards/' + subCardId, newCardData).then(function (data) {
												// TODO: Set success message for content script
												console.debug('successfully updated subcard name and position', data);
											});
										});
									}
								});
						});
					});
				} else {
					console.log('not a checkitem for a subboard');
				}
			});
		}

		// A checkitem has been deleted
		else if (isCheckItemDeletedRequest(request)) {
			var data = extractCheckItemDeletedDetails(request.url);
			var endpoint = '/checklist/' + data.checklistId + '/checkItems/' + data.checkItemId;

			App.getFromStorage(data.checkItemId).then(function (result) {
				if (!$.isEmptyObject(result)) {
					var subCardId = result[data.checkItemId];

					Trello.delete('/cards/' + subCardId).then(function () {
						// TODO: Set success message for content script
						console.debug('successfully deleted subcard');
						// Delete mapping
						chrome.storage.local.remove(subCardId);
						chrome.storage.local.remove(data.checkItemId);
					});
				} else {
					console.log('not a checkitem for a subboard');
				}
			});
		}

		// A card has been updated
		else if (isCardUpdatedRequest(request)) {
			var data = extractSubcardDetails(request.url);
			console.log(data);
			App.getFromStorage(data.cardId).then(function (result) {
				if (!$.isEmptyObject(result)) {
					var checkItemId = result[data.cardId];

					Trello.get('/cards/' + data.cardId).then(function (card) {
						Trello.get('/boards/' + card.idBoard + '/lists/').then(function (lists) {
							
							App.getFromStorage(card.idBoard).then(function (result) {
								var checklistId = result[card.idBoard];

								Trello.get('/checklist/' + checklistId).then(function (checklist) {
									var checkItemEndpoint = '/cards/' + checklist.idCard + '/checklist/' + checklistId + '/checkItem/' + checkItemId;
									var lastListId = lists[lists.length - 1].id;
									var newCheckItemData = {
										idChecklistCurrent: checklistId,
										idCheckItem: checkItemId,
										value: false
									};

									if (lastListId == card.idList) {
										newCheckItemData.value = true;
									}

									Trello.put(checkItemEndpoint + '/state', newCheckItemData).then(function (data) {
										// TODO: Set success message for content script
										console.debug('successfully updated corresponding checkitem state', data);
										
										// Update name.
										newCheckItemData.value = card.name;
										Trello.put(checkItemEndpoint + '/name', newCheckItemData).then(function (data) {
											// TODO: Set success message for content script
											console.debug('successfully updated corresponding checkitem name', data);
										});
									});
								});
							});
						});

					});
				}
			});
		}


	}, {
		urls: [
			"*://trello.com/1/boards/*/cards/*",
			"*://trello.com/1/cards/*",
			"*://trello.com/1/cards/*/checklist/*/checkItem",
			"*://trello.com/1/cards/*/checklist/*/checkItem/*"
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
    // Content script has requested the subboard checklists for a board
    else if (message.name == 'requestSubboardChecklists') {
    	var subboardChecklistsLinks = [];
    	var boardlink = message.data.boardlink;

    	// Horrendous recursive loop thanks to async
 		var loopAsync = function (checklists, i) {
 			if (i < checklists.length) {
	 			var checklistId = checklists[i].id;
	 			App.isSubboardChecklist(checklistId)
					// success!
	 				.then(function (result) {
	 					if ($.isEmptyObject(result)) {
 							loopAsync(checklists, i + 1);
	 					} else {
		 					Trello.get('/checklists/' + checklistId + '/cards/',
		 						function (cards) {
		 							var card = cards[0];
		 							subboardChecklistsLinks.push(card.shortLink);

		 							loopAsync(checklists, i + 1);
		 						});
		 				}
	 				});
			} else {
				// Send back valid subboard shortlinks
		    	sendResponse({
		    		data: {
		    			subboardChecklistsLinks: subboardChecklistsLinks
		    		}
		    	});
			}
		};

    	Trello.get('/board/' + boardlink + '/checklists')
    		.then(function (checklists) {
    	 		loopAsync(checklists, 0);
    	 	});

    	return true;
    }
  
  });
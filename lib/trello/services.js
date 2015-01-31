TrelloClient = (function () {

	function TrelloClient () {
		Trello.authorize({
			interactive: false,
			success: function () {
				console.log('Initialized successfully');
			},
			error: function () {
				console.log('Odd. An error occurred');
			}
		});
	}

	TrelloClient.prototype.createSubboard = function (cardTitle) {
		return Trello.post('boards', { 
			name: 'CB: ' + cardTitle + ' Tasks'
		});
	};

	TrelloClient.prototype.createChecklist = function (cardId, title) {
		return Trello.post('checklists', {
			name: title + ' Tasks',
			idCard: cardId
		});
	}

	TrelloClient.prototype.getBoardUrl = function (boardId) {
		return Trello.boards.get(boardId, { fields: 'url' });
	};

	TrelloClient.prototype.getBoardMembers = function (boardId) {
		return Trello.boards.get(boardId + '/memberships', { member: true });
	};

	TrelloClient.prototype.getCard = function (cardId) {
		return Trello.cards.get(cardId);
	};

	TrelloClient.prototype.getChecklist = function (checklistId) {
		return Trello.checklists.get(checklistId);
	};

	TrelloClient.prototype.getCheckItem = function (checklistId, checkItemId) {
		return Trello.get('/checklist/' + checklistId 
				+ '/checkItems/' + checkItemId);
	};

	// Bleurghhhhhh
	TrelloClient.prototype.getLastCheckItem = function (checklistId) {
		return this.getChecklist(checklistId)
				.then(function (checklist) {
					return checklist.checkItems[checklist.checkItems.length - 1];
				});
	};

	// possibly store listId to add to in storage later?
	TrelloClient.prototype.addSubcard = function (boardId, checklistId) {
		return Trello.boards.get(boardId + '/lists')
				.then(function (lists) {
					var firstListId = lists[0].id;
					return this.getLastCheckItem(checklistId)
							.then(function (newCheckItem) {
								return Trello.post('lists/' + firstListId + '/cards', {
									name: newCheckItem.name,
								});
							});
				}.bind(this));
	};

	TrelloClient.prototype.updateSubcard = function (cardId, checkItem) {
		var newCardData = {
			name: checkItem.name
		};

		Trello.cards.get(cardId, { fields: 'idBoard' })
			.then(function (card) {
				var boardId = card.idBoard;

				if (checkItem.state == 'complete') {
					this.getFinishList(boardId)
						.then(function (finishListId) {
							newCardData.idList = finishListId;
							Trello.put('/cards/' + cardId, newCardData);
						});
				} else {
					this.getStartList(boardId)
						.then(function (startListId) {
							newCardData.idList = startListId;
							Trello.put('/cards/' + cardId, newCardData);
						});
				}
			}.bind(this));
	};

	TrelloClient.prototype.getStartList = function (boardId) {
		return Trello.boards.get(boardId + '/lists')
			.then(function (lists) {
				// For now, just first list on board (left to right)
				return lists[0].id;

			});
	};

	TrelloClient.prototype.getFinishList = function (boardId) {
		return Trello.boards.get(boardId + '/lists')
			.then(function (lists) {
				// For now, just last list on board (left to right)
				return lists[lists.length - 1].id;
			});
	};

	TrelloClient.prototype.addMemberToBoard = function (boardId, memberId, memberType) {
		return Trello.put('boards/' + boardId + '/members/' + memberId, {
			type: memberType
		});
	};

	TrelloClient.prototype.deleteSubcard = function (cardId) {
		return Trello.del('/cards/' + cardId);
	};

	TrelloClient.prototype.deleteCheckItem = function (checklistId, checkItemId) {
		return Trello.del('/checklist/' + checklistId 
				+ '/checkItems/' + checkItemId);
	};

	return TrelloClient;
})();


























// App = (function() {

// 	// Constructor
// 	function App () {
// 		Trello.authorize({
// 			interactive: false,
// 			success: function () {
// 				console.log('App initialized successfully');
// 			}
// 		});
// 	}

// 	App.prototype.getFromStorage = function (key) {
// 	    var d = new $.Deferred();
// 	    chrome.storage.local.get(key, function(result) {
// 	        if (chrome.runtime.lastError) {
// 	            d.reject('Error occured!');
// 	        } else {
//             	d.resolve(result);         
// 	        }
// 	    });
// 	    return d.promise();
// 	};


// 	// TODO: Use promises?
// 	App.prototype.createSubboard = function (cardId, cardTitle) {
// 		// TODO: check if board already has checklist!
// 		// won't handle yet - block for now

// 		console.log('creating checklist for ' + cardId)
// 		Trello.post('/checklists/', {
// 			name: cardTitle + ' Tasks',
// 			idCard: cardId
// 		}, function success (checklist) {
// 			console.log('creating board for ' + cardId)
// 			Trello.post('/boards/', {
// 				name: cardTitle + ' Tasks'
// 			}, function success (board) {
// 				console.debug('checklist', checklist.id);
// 				console.debug('board', board.id);

// 				// Two-way mapping
// 				var mapping = {};
// 				mapping[checklist.id] = board.id;
// 				mapping[board.id] = checklist.id;
// 				chrome.storage.local.set(mapping);
// 			});
// 		});
// 	};

// 	// No info on checkItem id :/ gotta be a better way
// 	App.prototype.createNewTask = function (checklistId, boardId) {
// 		Trello.get('/checklists/' + checklistId, {},
// 			function success (checklist) {
// 				// Get most recent checkItem on checklist
// 				var newCheckItem = checklist.checkItems[checklist.checkItems.length - 1];

// 				// Get first list on associated board
// 				Trello.get('/boards/' + boardId + '/lists/', function (lists) {
// 					var listId = lists[0].id;

// 					// Add new card given most recent checkItem info
// 					Trello.post('/lists/' + listId + '/cards/', 
// 						{
// 							name: newCheckItem.name
// 						},
// 						function (newCard) {
// 							// Two-way mapping
// 							var mapping = {};
// 							mapping[newCard.id] = newCheckItem.id;
// 							mapping[newCheckItem.id] = newCard.id;
// 							chrome.storage.local.set(mapping);
// 						}
// 					);
// 				});

// 			});
// 	};

// 	App.prototype.isSubboardChecklist = function (checklistId) {
// 		return this.getFromStorage(checklistId);
// 	};

// 	App.prototype.isSubboard = function (boardId) {
// 		return this.getFromStorage(boardId);
// 	};


// 	return App;
// })();
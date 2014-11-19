App = (function() {

	// Constructor
	function App () {
		Trello.authorize({
			interactive: false,
			success: function () {
				console.log('App initialized successfully');
			}
		});
	}

	App.prototype.getFromStorage = function (key) {
	    var d = new $.Deferred();
	    chrome.storage.local.get(key, function(result) {
	        if (chrome.runtime.lastError) {
	            d.reject('Error occured!');
	        } else {
            	d.resolve(result);         
	        }
	    });
	    return d.promise();
	};


	// TODO: Use promises?
	App.prototype.createSubboard = function (cardId, cardTitle) {
		// TODO: check if board already has checklist!
		// won't handle yet - block for now

		console.log('creating checklist for ' + cardId)
		Trello.post('/checklists/', {
			name: cardTitle + ' Tasks',
			idCard: cardId
		}, function success (checklist) {
			console.log('creating board for ' + cardId)
			Trello.post('/boards/', {
				name: cardTitle + ' Tasks'
			}, function success (board) {
				console.debug('checklist', checklist.id);
				console.debug('board', board.id);

				// Two-way mapping
				var mapping = {};
				mapping[checklist.id] = board.id;
				mapping[board.id] = checklist.id;
				chrome.storage.local.set(mapping);
			});
		});
	};

	// No info on checkItem id :/ gotta be a better way
	App.prototype.createNewTask = function (checklistId, boardId) {
		Trello.get('/checklists/' + checklistId, {},
			function success (checklist) {
				// Get most recent checkItem on checklist
				var newCheckItem = checklist.checkItems[checklist.checkItems.length - 1];

				// Get first list on associated board
				Trello.get('/boards/' + boardId + '/lists/', function (lists) {
					var listId = lists[0].id;

					// Add new card given most recent checkItem info
					Trello.post('/lists/' + listId + '/cards/', 
						{
							name: newCheckItem.name
						},
						function (newCard) {
							// Two-way mapping
							var mapping = {};
							mapping[newCard.id] = newCheckItem.id;
							mapping[newCheckItem.id] = newCard.id;
							chrome.storage.local.set(mapping);
						}
					);
				});

			});
	};

	App.prototype.isSubboardChecklist = function (checklistId) {
		return this.getFromStorage(checklistId);
	};

	App.prototype.isSubboard = function (boardId) {
		return this.getFromStorage(boardId);
	};


	return App;
})();
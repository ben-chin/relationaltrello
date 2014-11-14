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


	return App;
})();
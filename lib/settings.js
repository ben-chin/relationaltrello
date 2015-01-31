function init () {

	Trello.authorize({ 
		name: 'Relational Trello',
		expiration: 'never',
		interactive: true,
		persist: true,
		scope: {
			'read': true,
			'write': true
		},
		success: function (sth) {
			Trello.get('/members/me/boards', {
				filter: 'open'
			}, function success (data) {
				console.debug('data', data);
			})
			console.debug('Success setting', sth);
		},
		error: function (sth) {
			console.debug('error', sth);
		}
	});
}

window.addEventListener('load', init);
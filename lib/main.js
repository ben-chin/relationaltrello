function init() {
	console.log('Loaded');
	console.log(window.location.href);
	console.log(Trello.key());

	Trello.authorize({ 
		name: 'Relational Trello',
		expiration: 'never',
		interactive: true,
		persist: true,
		success: function (sth) {
			console.debug('Success', sth);
		},
		error: function (sth) {
			console.debug('error', sth);
		}
	});
}

window.addEventListener('load', init);
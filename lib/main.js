function closePopup() {
    // Close popup and open auth tab
    setTimeout(function() {
        window.close();
        chrome.tabs.create({url: chrome.extension.getURL('settings.html')});
    }, 100);
}

function init() {
    if(!localStorage.trello_token) {
        closePopup();
        return;
    }
    else {
        Trello.authorize({
            interactive:false,
            success: function (sth) {
				Trello.get('/members/me/boards', {
					filter: 'open'
				}, function success (data) {
					console.debug('data', data);
				})
				console.debug('Success main', sth);
			}
        });
    }
}


window.addEventListener('load', init);
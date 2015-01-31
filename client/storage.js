Storage = (function () {

	var store;

	function Storage (chrome) {
		store = chrome.storage.local;
	}

	// Returns a result ONLY IF key is found in storage
	Storage.prototype.get = function (key) {
		var d = new $.Deferred();
	    store.get(key, function (result) {
	        if ($.isEmptyObject(result) || chrome.runtime.lastError) {
	            d.reject('Error occured!');
	        } else {
            	d.resolve(result);         
	        }
	    });
	    return d.promise();
	};

	Storage.prototype.setMap = function (a, b) {
		var m_1 = {}; 
		var	m_2 = {};

		m_1[a] = b;
		m_2[b] = a;

		store.set(m_1);
		store.set(m_2);
	};

	Storage.prototype.deleteMap = function (a) {
		this.get(a)
			.then(function (mapping) {
				store.remove(mapping[a]);
				store.remove(a);
			});
	};

	// Assumes only one key
	Storage.prototype.set = function (obj) {
		for (key in obj) {
			this.get(key)
				.then(function (oldObj) {
					this.update(oldObj, obj);
				})
				.fail(function () {
					store.set(obj);
				});
		}
	};

	Storage.prototype.update = function (oldObj, newObj) {
		// TODO
	};

	return Storage;
})();
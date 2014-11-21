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
		store.set({ a: b });
		store.set({ b: a });
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
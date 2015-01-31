Storage = (function() {

    var store;

    function Storage (chrome) {
        store = chrome.storage.local;
    }

    // Returns a result ONLY IF key is found in storage
    Storage.prototype.get = function (key) {
        var d = new $.Deferred();
        store.get(key, function(result) {
            if ($.isEmptyObject(result) || chrome.runtime.lastError) {
                d.reject('Error occured!');
            } else {
                d.resolve(result);
            }
        });
        return d.promise();
    };

    Storage.prototype.setMap = function (a, b) {
        var m1 = {};
        var m2 = {};

        m1[a] = b;
        m2[b] = a;

        store.set(m1);
        store.set(m2);
    };

    Storage.prototype.deleteMap = function (a) {
        this.get(a)
            .then(function (mapping) {
                store.remove(mapping[a]);
                store.remove(a);
            });
    };

    Storage.prototype.update = function (oldObj, newObj) {
        // TODO
    };

    return Storage;
})();
RequestSnooper = (function() {

    var eventTriggers, urls;

    function RequestSnooper(chrome, urlMatchPatterns) {
        eventTriggers = [];
        urls = urlMatchPatterns;

        chrome.webRequest.onCompleted.addListener(
            function(request) {
                if (request.statusCode !== 200) return;
                console.log(request);

                // loop over matches to see which event to emit
                for (var i = 0; i < eventTriggers.length; i++) {
                    var match = eventTriggers[i].matcher.call(this, request.url, request.method);
                    if (match) {
                        var detail = eventTriggers[i].extractor.call(this, request.url);
                        var e = new CustomEvent(eventTriggers[i].eventName, {
                            detail: detail
                        });
                        window.dispatchEvent(e);
                        break;
                    }
                }
            }, {
                urls: urls
            }
        );
    }

    RequestSnooper.prototype.addEventTrigger = function(eventName, urlPattern, requestMethod) {
        var matcher = function(url, method) {
            return urlPattern.test(url) && method == requestMethod;
        };

        var extractor = function(url) {
            return urlPattern.exec(url).slice(1);
        };

        eventTriggers.push({
            eventName: eventName,
            matcher: matcher,
            extractor: extractor
        });
    };



    return RequestSnooper;
})();
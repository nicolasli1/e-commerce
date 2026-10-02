// Redirect alternate CloudFront aliases to the public canonical hostname.
// __CANONICAL_HOST__ is replaced by the CDK stack during synthesis.
function handler(event) {
    var request = event.request;
    var hostHeader = request.headers.host;
    var currentHost = hostHeader && hostHeader.value ? hostHeader.value.toLowerCase() : '';
    var canonicalHost = '__CANONICAL_HOST__';

    if (!currentHost || currentHost === canonicalHost) {
        return request;
    }

    var query = request.querystring || {};
    var queryParts = [];
    var keys = Object.keys(query);
    for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        var entry = query[key] || {};
        var values = entry.multiValue || [entry];
        for (var j = 0; j < values.length; j += 1) {
            var value = values[j] && values[j].value ? values[j].value : '';
            queryParts.push(encodeURIComponent(key) + (value ? '=' + encodeURIComponent(value) : ''));
        }
    }

    return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: {
            location: {
                value: 'https://' + canonicalHost + request.uri + (queryParts.length ? '?' + queryParts.join('&') : '')
            },
            'cache-control': { value: 'public, max-age=3600' }
        }
    };
}

// CloudFront Function to protect /admin/ routes
// Validates session cookie; redirects to /admin/login if missing

var COOKIE_NAME = "session";
// Logged-in paths that bypass cookie check
var PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/assets/"];

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var cookies = request.cookies;

    // Allow public admin paths
    for (var i = 0; i < PUBLIC_ADMIN_PATHS.length; i++) {
        if (uri.startsWith(PUBLIC_ADMIN_PATHS[i])) {
            return request;
        }
    }

    // Check for session cookie
    var hasSession = false;
    if (cookies && cookies[COOKIE_NAME]) {
        var val = cookies[COOKIE_NAME].value;
        if (val && val.length > 0) {
            hasSession = true;
        }
    }

    if (!hasSession) {
        return {
            statusCode: 302,
            statusDescription: "Found",
            headers: {
                location: { value: "/admin/login" }
            }
        };
    }

    return request;
}

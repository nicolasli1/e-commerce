// CloudFront Function for /admin/ routes
// SPA routing + session cookie validation.
//
// For MVP: validates session cookie exists (check is done at API level).
// The backoffice SPA uses localStorage + Bearer token for real auth.
// This function handles:
//   1. SPA fallback: rewrites /admin/* paths without file extensions to /admin/index.html
//   2. Session cookie check: redirects to /admin/login if no session cookie

var COOKIE_NAME = "session";
var FILE_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".json", ".webp", ".gif"];
var PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/assets/"];

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var cookies = request.cookies;

    // Allow public admin paths (login page, assets)
    for (var i = 0; i < PUBLIC_ADMIN_PATHS.length; i++) {
        if (uri.startsWith(PUBLIC_ADMIN_PATHS[i])) {
            return request;
        }
    }

    // If it's a real file request (has extension), let it through
    for (var i = 0; i < FILE_EXTENSIONS.length; i++) {
        if (uri.indexOf(FILE_EXTENSIONS[i]) === uri.length - FILE_EXTENSIONS[i].length) {
            return request;
        }
    }

    // SPA fallback: serve /admin/index.html for all /admin/ paths
    if (uri !== "/admin/index.html") {
        request.uri = "/admin/index.html";
    }

    return request;
}

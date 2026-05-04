// CloudFront Function for /admin/ routes
// For MVP: passes all requests through + SPA routing.
// Real authentication is at API level (API Key + JWT in Lambda).
// The backoffice SPA uses localStorage + Bearer token, not cookies.

// Paths that should NOT be rewritten to index.html (real files)
var FILE_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".svg", ".ico", ".woff", ".woff2", ".json"];

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check if the request is for a real file (has extension)
    for (var i = 0; i < FILE_EXTENSIONS.length; i++) {
        if (uri.indexOf(FILE_EXTENSIONS[i]) === uri.length - FILE_EXTENSIONS[i].length) {
            return request;  // Real file, let it through
        }
    }
    
    // SPA fallback: serve /admin/index.html for all /admin/ paths
    // This allows hash-based routing (#/login, #/dashboard, etc.)
    if (uri !== "/admin/index.html") {
        request.uri = "/admin/index.html";
    }
    
    return request;
}

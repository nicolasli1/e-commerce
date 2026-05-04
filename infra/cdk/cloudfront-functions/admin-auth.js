// CloudFront Function for /admin/ routes
// For MVP: passes all requests through.
// Real authentication is at API level (API Key + JWT in Lambda).
// The backoffice SPA uses localStorage + Bearer token, not cookies.

function handler(event) {
    return event.request;
}

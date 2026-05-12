/**
 * Rate Limiting for /api/* and /api/auth/login
 *
 * Uses CloudFront Function (cloudfront-js-2.0) to enforce per-IP rate limits.
 *
 * Limits:
 *   /api/*           → 100 requests per 60 seconds per IP
 *   /api/auth/login  → 10 requests per 60 seconds per IP
 *
 * Rate limit state is stored in a simple in-memory object.
 * Note: CloudFront Functions are stateless across edge locations,
 * so this is a best-effort per-edge-location rate limit, not global.
 * For stricter limits, use API Gateway throttling + WAF rate-based rules.
 */

// Simple in-memory rate limiter
var rateLimits = {};

function checkRateLimit(ip, path, limits) {
    var now = Date.now();
    var windowMs = 60000;  // 1 minute window
    
    // Determine which limit applies
    var maxRequests = limits.default;
    if (path.indexOf('/api/auth/login') === 0) {
        maxRequests = limits.login;
    }
    
    // Clean old entries
    if (!rateLimits[ip]) {
        rateLimits[ip] = [];
    }
    
    var timestamps = rateLimits[ip];
    // Remove timestamps older than the window
    while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
        timestamps.shift();
    }
    
    if (timestamps.length >= maxRequests) {
        return false;  // Rate limited
    }
    
    timestamps.push(now);
    return true;
}

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Only apply rate limiting to /api/ paths
    if (uri.indexOf('/api/') !== 0) {
        return request;
    }
    
    var clientIp = request.clientIp;
    
    var limits = {
        default: 100,   // 100 req/min for general API
        login: 10       // 10 req/min for login endpoint
    };
    
    if (!checkRateLimit(clientIp, uri, limits)) {
        return {
            statusCode: 429,
            statusDescription: 'Too Many Requests',
            headers: {
                'retry-after': { value: '60' },
                'content-type': { value: 'application/json' }
            },
            body: JSON.stringify({
                error: 'rate_limited',
                message: 'Demasiadas solicitudes. Intenta de nuevo en 60 segundos.'
            })
        };
    }
    
    return request;
}

# FlowDrop API Security Documentation

This document outlines the security measures implemented to ensure the FlowDrop API is strictly server-side and protected against common vulnerabilities.

## Server-Side Security Measures

### 1. Input Validation and Sanitization

All API endpoints implement comprehensive input validation:

#### Query Parameters
- **Limit validation**: Enforced between 1-1000 for nodes, 1-100 for workflows
- **Offset validation**: Must be non-negative integers
- **Search sanitization**: Trimmed and limited to 100 characters
- **Category validation**: Only accepts predefined valid categories

#### Request Body Validation
- **Workflow name**: Required, max 200 characters, trimmed
- **Description**: Optional, max 1000 characters, trimmed
- **Author**: Optional, max 100 characters, trimmed
- **Tags**: Array validation, max 20 tags, each max 50 characters
- **ID validation**: UUID v4 format validation for workflow IDs (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

#### Node ID Validation
- **Format validation**: Alphanumeric, hyphens, underscores only
- **Length limits**: 1-100 characters
- **Pattern matching**: `^[a-zA-Z0-9-_]+$`

### 2. Security Headers

All API responses include comprehensive security headers:

```typescript
// CORS Headers
"Access-Control-Allow-Origin": "*"
"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
"Access-Control-Allow-Headers": "Content-Type, Authorization"

// Security Headers
"X-Content-Type-Options": "nosniff"
"X-Frame-Options": "DENY"
"X-XSS-Protection": "1; mode=block"
"Referrer-Policy": "strict-origin-when-cross-origin"

// Cache Control (API-specific)
"Cache-Control": "no-cache, no-store, must-revalidate"
"Pragma": "no-cache"
"Expires": "0"
```

### 3. CORS Configuration

- **Preflight handling**: OPTIONS requests properly handled
- **Method restrictions**: Only allowed HTTP methods for each endpoint
- **Header restrictions**: Limited to essential headers only

### 4. Error Handling

- **No information disclosure**: Generic error messages in production
- **Proper HTTP status codes**: 400, 404, 500 as appropriate
- **Structured error responses**: Consistent error format
- **Logging**: Server-side logging for monitoring (no sensitive data)

### 5. Server-Side Hooks

Global security measures via `src/hooks.server.ts`:

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  // Universal security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // API-specific measures
  if (url.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("X-API-Version", "1.0.0");
  }
  
  return response;
};
```

## API Endpoint Security

### Nodes API (`/api/nodes`)

#### GET `/api/nodes`
- ✅ Input validation for query parameters
- ✅ Category whitelist validation
- ✅ Search query sanitization
- ✅ Pagination limits enforced
- ✅ CORS headers included
- ✅ Security headers applied

#### GET `/api/nodes/{id}`
- ✅ Node ID format validation
- ✅ Length limits enforced
- ✅ Pattern matching validation
- ✅ 404 handling for invalid IDs
- ✅ Security headers applied

### Workflows API (`/api/workflows`)

#### GET `/api/workflows`
- ✅ Query parameter validation
- ✅ Search sanitization
- ✅ Pagination limits
- ✅ CORS and security headers

#### POST `/api/workflows`
- ✅ Request body validation
- ✅ Field length limits
- ✅ Data type validation
- ✅ Array validation for nodes/edges
- ✅ Sanitization of all inputs

#### GET `/api/workflows/{id}`
- ✅ Workflow ID validation
- ✅ UUID v4 pattern matching
- ✅ 404 handling
- ✅ Security headers

#### PUT `/api/workflows/{id}`
- ✅ UUID v4 ID validation
- ✅ Update data validation
- ✅ Partial update support
- ✅ Data sanitization
- ✅ Security headers

#### DELETE `/api/workflows/{id}`
- ✅ UUID v4 ID validation
- ✅ 404 handling
- ✅ Security headers

## Data Protection

### 1. Input Sanitization
- **String trimming**: All string inputs are trimmed
- **Length limits**: Enforced on all text fields
- **Type validation**: Strict type checking for all inputs
- **Array validation**: Proper array type and length validation

### 2. Output Sanitization
- **No sensitive data exposure**: Error messages don't reveal internal structure
- **Consistent response format**: All responses follow the same structure
- **No stack traces**: Production errors don't expose implementation details

### 3. Storage Security
- **In-memory storage**: Currently using Map for development
- **No persistent storage**: Data is not persisted to disk
- **Isolated storage**: Each request gets fresh data context

## CSRF Protection

SvelteKit CSRF protection enabled:

```javascript
// svelte.config.js
kit: {
  csrf: {
    checkOrigin: true
  }
}
```

## Rate Limiting

Currently not implemented but recommended for production:

```typescript
// Recommended rate limiting implementation
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};
```

## Authentication & Authorization

Currently not implemented but structure is ready:

```typescript
// Recommended authentication middleware
function requireAuth(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ");
}
```

## Monitoring & Logging

### API Request Logging
- All API requests are logged with timestamp
- Method and path information captured
- No sensitive data in logs

### Error Logging
- Server errors are logged with stack traces (development only)
- Production errors are logged without sensitive information
- Structured error format for monitoring

## Production Recommendations

### 1. Environment Variables
```bash
# Required for production
NODE_ENV=production
API_SECRET_KEY=your-secret-key
DATABASE_URL=your-database-url
```

### 2. Database Security
- Use parameterized queries
- Implement connection pooling
- Enable SSL/TLS for database connections
- Regular security updates

### 3. Additional Security Measures
- **Rate limiting**: Implement per-IP rate limiting
- **Authentication**: Add JWT or session-based authentication
- **HTTPS only**: Enforce HTTPS in production
- **API keys**: Implement API key authentication for external access
- **Audit logging**: Log all data modifications
- **Backup security**: Secure backup procedures

### 4. Monitoring
- **Health checks**: Implement `/api/health` endpoint
- **Metrics**: Add request/response metrics
- **Alerting**: Set up alerts for unusual activity
- **Log aggregation**: Centralized logging system

## Security Checklist

- ✅ Input validation and sanitization
- ✅ Output sanitization
- ✅ Security headers
- ✅ CORS configuration
- ✅ Error handling
- ✅ CSRF protection
- ✅ Server-side only execution
- ✅ Request logging
- ⚠️ Rate limiting (recommended)
- ⚠️ Authentication (recommended)
- ⚠️ HTTPS enforcement (production)
- ⚠️ Database security (production)

## Testing Security

### Manual Testing
1. Test with invalid IDs
2. Test with malformed JSON
3. Test with oversized payloads
4. Test CORS preflight requests
5. Test with invalid query parameters

### Automated Testing
```typescript
// Example security test
test("should reject invalid workflow ID", async () => {
  const response = await fetch("/api/workflows/invalid-id");
  expect(response.status).toBe(400);
});
```

## Incident Response

### Security Breach Response
1. **Immediate**: Disable affected endpoints
2. **Investigation**: Review logs and identify scope
3. **Notification**: Inform stakeholders
4. **Fix**: Implement security patches
5. **Review**: Conduct security audit
6. **Documentation**: Update security procedures

### Contact Information
- **Security issues**: security@flowdrop.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Bug reports**: github.com/flowdrop/issues

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Security Level**: Development Ready (Production requires additional measures) 
# Security Implementation Guide

This document describes the security measures implemented in the Georgetown Traffic AI Management System.

## Table of Contents

1. [Security Middleware](#security-middleware)
2. [Input Validation and Sanitization](#input-validation-and-sanitization)
3. [API Security](#api-security)
4. [Rate Limiting](#rate-limiting)
5. [HTTPS Configuration](#https-configuration)
6. [Environment Variables](#environment-variables)
7. [Best Practices](#best-practices)

## Security Middleware

### Helmet.js

The application uses Helmet.js to set secure HTTP headers:

- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS attacks
- **HSTS**: Forces HTTPS connections in production
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer Policy**: Controls referrer information
- **XSS Filter**: Enables browser XSS protection

### CORS Configuration

CORS is configured to:
- Allow only specified origins (configurable via `CORS_ORIGIN` environment variable)
- Support credentials
- Limit allowed methods and headers
- Cache preflight requests

### Request Timeout

All requests have a configurable timeout (default: 30 seconds) to prevent resource exhaustion.

## Input Validation and Sanitization

### XSS Prevention

All user inputs are sanitized to remove:
- Script tags
- JavaScript protocols
- Event handlers
- Iframe/object/embed tags
- Data protocols (except images)
- VBScript protocols

### NoSQL Injection Prevention

The system checks for MongoDB operators (`$` prefix) in user inputs and rejects requests containing them.

### Content Type Validation

POST/PUT/PATCH requests must have `Content-Type: application/json` (except for file uploads with `multipart/form-data`).

### Joi Validation

All API endpoints use Joi schemas for request validation:
- Type checking
- Format validation
- Length constraints
- Pattern matching
- Required field enforcement

## API Security

### API Key Authentication

Inter-service communication between Node.js backend and Python AI service uses API key authentication:

1. **Backend → Python**: Includes `X-API-Key` header
2. **Python → Backend**: Verifies API key using constant-time comparison

**Configuration:**
```bash
# Backend .env
PYTHON_AI_API_KEY=your-api-key-here

# Python .env
API_KEY=your-api-key-here
```

### Request Signing

Additional security layer for inter-service communication:

1. **Signature Generation**: HMAC-SHA256 signature of `timestamp.method.path.body`
2. **Timestamp Validation**: Rejects requests older than 5 minutes (prevents replay attacks)
3. **Constant-Time Comparison**: Prevents timing attacks

**Configuration:**
```bash
# Both services
INTER_SERVICE_SECRET=your-shared-secret-here
```

### IP Whitelisting (Python Service)

Optional IP whitelisting for Python AI service:

```bash
# Python .env
IP_WHITELIST=192.168.1.100,192.168.1.101
```

## Rate Limiting

### General API Rate Limiter

- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Applies to**: All `/api/*` routes

### Authentication Rate Limiter

- **Window**: 15 minutes
- **Limit**: 5 failed attempts per IP
- **Applies to**: Login and registration endpoints
- **Behavior**: Skips successful requests

### Upload Rate Limiter

- **Window**: 1 hour
- **Limit**: 10 uploads per IP
- **Applies to**: File upload endpoints

### User-Based Rate Limiters

#### Simulation Limiter
- **Window**: 1 hour
- **Limit**: 20 simulations per user
- **Key**: User ID (if authenticated) or IP

#### Training Limiter
- **Window**: 1 hour
- **Limit**: 5 training jobs per user
- **Key**: User ID (if authenticated) or IP

### Custom Rate Limiters

Create custom rate limiters using:

```javascript
import { createUserRateLimiter } from './middleware/rateLimiter.js';

const customLimiter = createUserRateLimiter(
  60 * 60 * 1000, // 1 hour window
  50              // 50 requests
);

app.use('/api/custom', customLimiter);
```

## HTTPS Configuration

### Development

HTTPS is disabled by default in development mode.

### Production

Enable HTTPS in production:

```bash
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

The server will:
1. Load SSL certificates
2. Create HTTPS server
3. Redirect HTTP to HTTPS (301)

### Behind Reverse Proxy

If running behind Nginx or similar:
1. Configure SSL at the proxy level
2. Set `trust proxy` in Express (already configured)
3. Check `x-forwarded-proto` header for HTTPS detection

## Environment Variables

### Required for Production

```bash
# JWT
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>

# API Security
PYTHON_AI_API_KEY=<random-api-key>
INTER_SERVICE_SECRET=<shared-secret>

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Optional Security Settings

```bash
# Request Limits
MAX_REQUEST_SIZE=10mb
MAX_FILE_SIZE=50mb
REQUEST_TIMEOUT=30000

# HTTPS
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/cert
SSL_KEY_PATH=/path/to/key

# Python Service IP Whitelist
IP_WHITELIST=192.168.1.100,192.168.1.101
```

## Best Practices

### 1. Generate Strong Secrets

Use cryptographically secure random generators:

```javascript
// Node.js
import { generateApiKey } from './middleware/apiKey.js';
const apiKey = generateApiKey(); // 64-character hex string
```

```bash
# Command line
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Rotate Secrets Regularly

- Change API keys and secrets periodically
- Update both services simultaneously
- Use environment-specific secrets

### 3. Monitor Security Logs

Watch for:
- Rate limit violations
- Invalid API keys
- NoSQL injection attempts
- XSS attempts
- Failed authentication attempts

### 4. Keep Dependencies Updated

```bash
npm audit
npm audit fix
```

### 5. Use HTTPS in Production

Never run production without HTTPS. Use:
- Let's Encrypt for free certificates
- Cloudflare for CDN + SSL
- AWS Certificate Manager
- Reverse proxy (Nginx) with SSL termination

### 6. Implement Defense in Depth

Multiple security layers:
1. Network security (firewall, VPC)
2. Application security (this implementation)
3. Database security (authentication, encryption)
4. Monitoring and logging
5. Incident response plan

### 7. Validate on Both Client and Server

- Client-side validation for UX
- Server-side validation for security
- Never trust client input

### 8. Use Prepared Statements

Mongoose automatically uses prepared statements, but:
- Never concatenate user input into queries
- Use Mongoose query builders
- Sanitize search patterns

### 9. Implement Audit Logging

Log security-relevant events:
- Authentication attempts
- Authorization failures
- Data modifications
- Configuration changes

### 10. Regular Security Audits

- Code reviews
- Penetration testing
- Dependency scanning
- Security training for team

## Security Checklist

### Before Deployment

- [ ] All secrets are environment variables
- [ ] Strong, unique secrets generated
- [ ] HTTPS enabled and configured
- [ ] CORS origins restricted
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (but not logging secrets)
- [ ] Dependencies updated
- [ ] Security headers verified
- [ ] API keys rotated from defaults
- [ ] Database authentication enabled
- [ ] Backup and recovery tested

### Ongoing

- [ ] Monitor security logs
- [ ] Review access logs
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review and update security policies
- [ ] Conduct security training
- [ ] Test incident response procedures

## Incident Response

If a security incident occurs:

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Eradicate**: Remove threat
4. **Recover**: Restore normal operations
5. **Learn**: Post-incident review

### Emergency Contacts

- System Administrator: [contact info]
- Security Team: [contact info]
- Database Administrator: [contact info]

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

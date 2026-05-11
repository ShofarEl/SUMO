# Security Quick Reference Guide

## Quick Setup

### 1. Generate Secrets

```bash
# Generate API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate inter-service secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Environment Variables

**Backend (.env):**
```bash
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<different-generated-secret>
PYTHON_AI_API_KEY=<generated-api-key>
INTER_SERVICE_SECRET=<generated-secret>
CORS_ORIGIN=https://yourdomain.com
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

**Python Service (.env):**
```bash
API_KEY=<same-as-PYTHON_AI_API_KEY>
INTER_SERVICE_SECRET=<same-as-backend>
```

## Using Security Features

### Rate Limiting

```javascript
import { authLimiter, uploadLimiter, simulationLimiter } from './middleware/rateLimiter.js';

// Apply to specific routes
router.post('/login', authLimiter, loginController);
router.post('/upload', uploadLimiter, uploadController);
router.post('/simulate', simulationLimiter, simulateController);
```

### Input Validation

```javascript
import { validateRequest, commonSchemas } from '../utils/validation.js';
import Joi from 'joi';

// Define schema
const schema = Joi.object({
  email: commonSchemas.email.required(),
  name: commonSchemas.name.required(),
  age: Joi.number().integer().min(0).max(120)
});

// Apply to route
router.post('/users', validateRequest(schema), createUser);
```

### API Key Protection

```javascript
import { verifyApiKey } from '../middleware/apiKey.js';

// Protect internal API endpoints
router.post('/internal/callback', verifyApiKey, callbackHandler);
```

### Request Signing

```javascript
import { verifyRequestSignature } from '../middleware/apiKey.js';

// Verify signed requests
router.post('/secure-endpoint', verifyRequestSignature, handler);
```

## Common Patterns

### Protecting Admin Routes

```javascript
import { protect, authorize } from '../middleware/auth.js';
import { createUserRateLimiter } from '../middleware/rateLimiter.js';

const adminLimiter = createUserRateLimiter(60 * 60 * 1000, 100);

router.use('/admin', protect, authorize('admin'), adminLimiter);
```

### File Upload Security

```javascript
import { uploadLimiter } from '../middleware/rateLimiter.js';
import multer from 'multer';

const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedTypes = ['text/csv', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', 
  uploadLimiter, 
  upload.single('file'), 
  uploadHandler
);
```

### Sanitizing Database Queries

```javascript
import { sanitizeMongoQuery, createSafeRegex } from '../utils/validation.js';

// Sanitize user input before querying
const searchTerm = req.query.search;
const safeQuery = {
  name: createSafeRegex(searchTerm)
};

const results = await Model.find(safeQuery);
```

## Security Headers

### Check Headers

```bash
curl -I https://yourdomain.com/api/health
```

Expected headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## Testing Security

### Test Rate Limiting

```bash
# Should succeed for first 100 requests, then fail
for i in {1..110}; do
  curl http://localhost:5000/api/health
  echo "Request $i"
done
```

### Test XSS Prevention

```bash
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"XSS\")</script>"}' \
  -v
```

### Test NoSQL Injection

```bash
curl -X POST http://localhost:5000/api/test \
  -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""}}' \
  -v
```

### Test API Key

```bash
# Should fail
curl http://localhost:8000/api/ml/models

# Should succeed
curl http://localhost:8000/api/ml/models \
  -H "X-API-Key: your-api-key"
```

## Troubleshooting

### Rate Limit Issues

**Problem:** Legitimate users hitting rate limits

**Solution:**
```javascript
// Increase limits for authenticated users
const userLimiter = createUserRateLimiter(
  15 * 60 * 1000, // 15 minutes
  500             // 500 requests (increased from 100)
);
```

### CORS Errors

**Problem:** Frontend can't connect to backend

**Solution:**
```bash
# Add frontend origin to CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

### API Key Not Working

**Problem:** Python service rejects requests

**Solution:**
1. Verify API keys match in both services
2. Check for whitespace in environment variables
3. Restart both services after changing keys

### Request Signing Failures

**Problem:** Signature verification fails

**Solution:**
1. Ensure `INTER_SERVICE_SECRET` matches in both services
2. Check system clocks are synchronized
3. Verify request body is being captured correctly

## Emergency Procedures

### Disable Rate Limiting (Emergency Only)

```javascript
// In server.js, comment out:
// app.use('/api', apiLimiter);
```

### Temporarily Disable API Key

```javascript
// In pythonAI.service.js, comment out:
// if (PYTHON_AI_API_KEY) {
//   config.headers['X-API-Key'] = PYTHON_AI_API_KEY;
// }
```

### Reset Rate Limits

Rate limits are stored in memory and reset on server restart.

## Security Checklist

### Development
- [ ] Use `.env` file (not committed to git)
- [ ] Test with security headers enabled
- [ ] Validate all user inputs
- [ ] Use HTTPS for external APIs

### Staging
- [ ] Generate unique secrets
- [ ] Enable all rate limiters
- [ ] Test with production-like data
- [ ] Verify CORS configuration

### Production
- [ ] Strong, unique secrets
- [ ] HTTPS enabled
- [ ] Restrictive CORS
- [ ] All rate limiters active
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Incident response plan ready

## Resources

- Full documentation: `README_SECURITY.md`
- Validation utilities: `utils/validation.js`
- Rate limiters: `middleware/rateLimiter.js`
- API key auth: `middleware/apiKey.js`
- Input sanitization: `middleware/requestValidator.js`

# Security Setup Guide

## Overview
This document describes the security measures implemented in the School Management System backend.

## Security Features Implemented

### 1. JWT Authentication
- All protected routes now require a valid JWT token
- Tokens expire after 24 hours (configurable via `JWT_EXPIRES_IN`)
- Token verification endpoint: `GET /api/admin/verify-token`

### 2. Rate Limiting
- **API Rate Limit**: 100 requests per 15 minutes per IP
- **Login Rate Limit**: 5 attempts per 15 minutes per IP
- **Password Reset**: 3 attempts per hour per IP
- **File Upload**: 50 uploads per hour per IP

### 3. Input Validation & Sanitization
- All inputs are sanitized to prevent XSS attacks
- SQL injection patterns are detected and blocked
- Email, phone, username formats are validated

### 4. File Upload Security
- File type validation by extension AND MIME type
- Magic byte verification for file authenticity
- Maximum file sizes enforced (5MB images, 10MB documents)
- Filename sanitization

### 5. Security Headers (Helmet)
- Content Security Policy
- X-Content-Type-Options
- X-XSS-Protection
- And more...

### 6. HTTPS Support
- Ready for production HTTPS deployment
- Automatic HTTP to HTTPS redirect in production

---

## Environment Configuration

Add these to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# JWT Configuration (REQUIRED - change in production!)
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters
JWT_EXPIRES_IN=24h

# Environment
NODE_ENV=development  # Change to 'production' for production

# HTTPS (Production only)
HTTPS_ENABLED=false   # Set to 'true' in production
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt

# Frontend URL (for CORS in production)
FRONTEND_URL=https://yourdomain.com
```

---

## HTTPS Setup for Production

### Option 1: Using Let's Encrypt (Recommended)

1. Install Certbot:
```bash
# Ubuntu/Debian
sudo apt install certbot

# Windows - use win-acme or manual certificate
```

2. Generate certificates:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

3. Copy certificates to your project:
```bash
mkdir -p backend/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem backend/ssl/private.key
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem backend/ssl/certificate.crt
```

4. Update `.env`:
```env
NODE_ENV=production
HTTPS_ENABLED=true
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
```

### Option 2: Using a Reverse Proxy (Nginx)

1. Configure Nginx to handle SSL:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. Keep `HTTPS_ENABLED=false` in `.env` (Nginx handles SSL)

---

## API Authentication

### Login
```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}

# Response includes token:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### Using the Token
Include the token in the Authorization header:
```bash
GET /api/dashboard/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Verify Token
```bash
GET /api/admin/verify-token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response:
{
  "valid": true,
  "user": { "id": 1, "username": "admin", "role": "admin" }
}
```

---

## Protected Routes

The following routes now require authentication:

### Admin Routes
- `POST /api/admin/change-password` - Change password
- `PUT /api/admin/branding` - Update branding
- `POST /api/admin/branding/icon` - Upload icon
- `POST /api/admin/branding/logo` - Upload logo

### Dashboard Routes
- All `/api/dashboard/*` routes

### Chat Routes
- All `/api/chats/*` routes

### Post Routes
- `POST /api/posts` - Create post

### Sub-Account Routes
- All `/api/admin/sub-accounts/*` routes (admin only)

### Staff Routes
- `GET /api/staff/profile/:username` - Get profile

---

## Security Best Practices

1. **Change default admin password immediately**
2. **Use a strong JWT_SECRET** (at least 32 random characters)
3. **Enable HTTPS in production**
4. **Regularly update dependencies** (`npm audit fix`)
5. **Monitor logs for suspicious activity**
6. **Backup your database regularly**

---

## Troubleshooting

### "Access token required" error
- Ensure you're including the Authorization header
- Check if the token has expired

### "Invalid token" error
- Token may be malformed or tampered with
- Try logging in again to get a new token

### Rate limit exceeded
- Wait for the cooldown period
- Contact admin if legitimate use case

### File upload rejected
- Check file type is allowed
- Ensure file size is within limits
- Verify file is not corrupted

# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities privately:

1. **Email:** security@pantry-pixie.app
2. **Subject line:** `[SECURITY] Brief description of the issue`

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgement:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix timeline:** Depends on severity (critical: ASAP, high: 7 days, medium: 30 days)

### What to Expect

1. We'll confirm receipt of your report
2. We'll investigate and assess the severity
3. We'll work on a fix and coordinate disclosure
4. We'll credit you in the release notes (unless you prefer anonymity)

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for all sensitive configuration
- Keep dependencies updated and review security advisories
- Follow the principle of least privilege in code
- Sanitize all user input before processing

## Known Security Considerations

- **Authentication:** JWT-based with Argon2id password hashing
- **Database:** Parameterized queries via Drizzle ORM (SQL injection protection)
- **API keys:** Must be stored in environment variables, never in code
- **CORS:** Must be configured to specific origins in production
- **WebSocket:** Requires authenticated token for connection

## Disclosure Policy

We follow responsible disclosure. We ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Do not access or modify other users' data
- Do not perform actions that could harm the service or its users
- Act in good faith

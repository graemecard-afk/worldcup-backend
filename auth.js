import jwt from 'jsonwebtoken';

// Comma-separated allowlist of admin emails (lowercased).
// Example (Render env var): ADMIN_EMAILS="you@example.com,other@example.com"
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;

  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== 'bearer') return null;

  return parts[1];
}

// Auth middleware: verifies JWT, sets req.user to the decoded payload
export function authMiddleware(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail closed: do not allow auth without a secret
    return res.status(500).json({ error: 'Server auth misconfigured (JWT_SECRET missing)' });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin gate: allow if payload has role/is_admin OR if email in allowlist
export function adminOnly(req, res, next) {
  // Support role flags in token payload (if you already include them)
  if (req.user?.is_admin === true) return next();
  if (req.user?.role === 'admin') return next();

  const email = (req.user?.email || '').toLowerCase();
  if (email && ADMIN_EMAILS.includes(email)) return next();

  return res.status(403).json({ error: 'Admin only' });
}

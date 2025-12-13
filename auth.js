import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// ===== Password helpers (RESTORED) =====
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ===== JWT helpers (RESTORED) =====
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// ===== Admin allowlist =====
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// ===== Helpers =====
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(' ');
  if (type !== 'Bearer') return null;

  return token;
}

// ===== Middleware =====
export function authMiddleware(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.is_admin === true || req.user?.role === 'admin') {
    return next();
  }

  const email = (req.user?.email || '').toLowerCase();
  if (email && ADMIN_EMAILS.includes(email)) {
    return next();
  }

  return res.status(403).json({ error: 'Admin only' });
}

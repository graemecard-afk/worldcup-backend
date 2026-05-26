import express from 'express';
import { query } from '../db.js';
import { hashPassword, comparePassword, generateToken, authMiddleware } from '../auth.js';

export const authRouter = express.Router();

// Register
authRouter.post('/register', async (req, res) => {
  const { name, email, password, timezone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, timezone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, is_admin`,
      [name, email, passwordHash, timezone || 'UTC']
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await query(
      'SELECT id, name, email, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    delete user.password_hash;

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current user
authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, timezone, is_admin, payment_status FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});
// TEMPORARY ADMIN PASSWORD RESET - REMOVE AFTER USE
authRouter.post('/temporary-admin-reset', async (req, res) => {
  const { resetSecret, email, newPassword } = req.body;

  if (!process.env.TEMP_ADMIN_RESET_SECRET) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (resetSecret !== process.env.TEMP_ADMIN_RESET_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Missing email or newPassword' });
  }

  try {
    const passwordHash = await hashPassword(newPassword);

    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2) RETURNING id, email',
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true, email: result.rows[0].email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

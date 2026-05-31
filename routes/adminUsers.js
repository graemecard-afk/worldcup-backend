import express from 'express';
import { query } from '../db.js';
import { authMiddleware, adminOnly } from '../auth.js';

export const adminUsersRouter = express.Router();

const VALID_PAYMENT_STATUSES = ['none', 'unpaid', 'paid', 'waived'];

adminUsersRouter.get('/health', authMiddleware, adminOnly, async (req, res) => {
  res.json({ ok: true, route: 'admin/users' });
});

adminUsersRouter.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, timezone, is_admin, payment_status
       FROM users
       ORDER BY email ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

adminUsersRouter.patch('/:id/payment-status', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  if (!VALID_PAYMENT_STATUSES.includes(payment_status)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  try {
    const result = await query(
      `UPDATE users
       SET payment_status = $1
       WHERE id = $2
       RETURNING id, name, email, timezone, is_admin, payment_status`,
      [payment_status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

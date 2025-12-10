import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

export const tournamentsRouter = express.Router();

// List all tournaments (for now, you will just have one Dummy Cup)
tournamentsRouter.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, year, host_timezone, group_stage_start, group_stage_end, knockouts_start
       FROM tournaments
       ORDER BY year DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

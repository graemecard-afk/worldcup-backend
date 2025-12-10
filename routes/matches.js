import express from 'express';
import { query } from '../db.js';
import { authMiddleware, adminOnly } from '../auth.js';

export const matchesRouter = express.Router();

// List matches for a tournament
matchesRouter.get('/:tournamentId', authMiddleware, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const result = await query(
      `SELECT id, stage, group_name, home_team, away_team, kickoff_utc,
              venue, result_home_goals, result_away_goals, result_finalized
       FROM matches
       WHERE tournament_id = $1
       ORDER BY kickoff_utc ASC`,
      [tournamentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

// Admin: set final result for a match
matchesRouter.post('/:matchId/result', authMiddleware, adminOnly, async (req, res) => {
  const { matchId } = req.params;
  const { home_goals, away_goals } = req.body;

  if (
    typeof home_goals !== 'number' ||
    typeof away_goals !== 'number'
  ) {
    return res.status(400).json({ error: 'Scores must be numbers' });
  }

  try {
    await query(
      `UPDATE matches
       SET result_home_goals = $1,
           result_away_goals = $2,
           result_finalized = TRUE
       WHERE id = $3`,
      [home_goals, away_goals, matchId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

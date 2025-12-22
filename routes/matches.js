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

// Admin: set final result for a match (immutable once finalised)
matchesRouter.post('/:matchId/result', authMiddleware, adminOnly, async (req, res) => {
  const matchId = Number(req.params.matchId);
  const { home_goals, away_goals } = req.body;

  // Validate
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ error: 'Invalid matchId' });
  }
  if (!Number.isInteger(home_goals) || !Number.isInteger(away_goals)) {
    return res.status(400).json({ error: 'Scores must be whole numbers' });
  }
  if (home_goals < 0 || away_goals < 0) {
    return res.status(400).json({ error: 'Scores must be 0 or more' });
  }

  try {
    await query('BEGIN');

    // Lock the row to prevent races + enforce immutability
    const m = await query(
      `SELECT id, result_finalized
       FROM matches
       WHERE id = $1
       FOR UPDATE`,
      [matchId]
    );

    if (m.rowCount === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found' });
    }

    if (m.rows[0].result_finalized) {
      await query('ROLLBACK');
      return res.status(409).json({ error: 'Match already finalised (unfinalise first)' });
    }

    // Persist result (optionally set finalized_at/by if columns exist)
    const updated = await query(
      `UPDATE matches
       SET result_home_goals = $1,
           result_away_goals = $2,
           result_finalized = TRUE
       WHERE id = $3
       RETURNING id, result_home_goals, result_away_goals, result_finalized`,
      [home_goals, away_goals, matchId]
    );

    // OPTIONAL: if you store points on predictions, recompute here (recommended)
    // If you don’t want to implement scoring right now, remove this block.
    const preds = await query(
      `SELECT id, predicted_home_goals, predicted_away_goals
       FROM predictions
       WHERE match_id = $1`,
      [matchId]
    );

    for (const p of preds.rows) {
      const pts = computePoints(
        p.predicted_home_goals,
        p.predicted_away_goals,
        home_goals,
        away_goals
      );

      await query(
        `UPDATE predictions
         SET points = $1
         WHERE id = $2`,
        [pts, p.id]
      );
    }

    await query('COMMIT');
    res.json({ ok: true, match: updated.rows[0] });
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

// Admin: unfinalise a match (explicitly allow changes again)
matchesRouter.post('/:matchId/unfinalise', authMiddleware, adminOnly, async (req, res) => {
  const matchId = Number(req.params.matchId);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ error: 'Invalid matchId' });
  }

  try {
    await query('BEGIN');

    const result = await query(
      `UPDATE matches
       SET result_home_goals = NULL,
           result_away_goals = NULL,
           result_finalized = FALSE
       WHERE id = $1
       RETURNING id, result_home_goals, result_away_goals, result_finalized`,
      [matchId]
    );

    if (result.rowCount === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found' });
    }

    // OPTIONAL but recommended: clear points so leaderboard can’t “look finalised” after unfinalise
    await query(
      `UPDATE predictions
       SET points = NULL
       WHERE match_id = $1`,
      [matchId]
    );

    await query('COMMIT');
    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    await query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to unfinalise match' });
  }
});

// Placeholder scoring. Replace with your real scoring rules.
function computePoints(ph, pa, ah, aa) {
  // Null safety (if older predictions exist)
  if (!Number.isInteger(ph) || !Number.isInteger(pa)) return null;

  // Example: exact = 3, correct outcome = 1
  if (ph === ah && pa === aa) return 3;

  const predOutcome = ph === pa ? 'D' : ph > pa ? 'H' : 'A';
  const actOutcome = ah === aa ? 'D' : ah > aa ? 'H' : 'A';
  return predOutcome === actOutcome ? 1 : 0;
}

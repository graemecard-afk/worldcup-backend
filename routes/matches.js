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
              venue, result_home_goals, result_away_goals, result_finalized, actual_advancing_team
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
  const { home_goals, away_goals, actual_advancing_team } = req.body;

  if (typeof home_goals !== 'number' || typeof away_goals !== 'number') {
    return res.status(400).json({ error: 'Scores must be numbers' });
  }

  try {
    // Check current state
    const existing = await query(
      `SELECT result_finalized
       FROM matches
       WHERE id = $1`,
      [matchId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (existing.rows[0].result_finalized) {
      return res.status(409).json({ error: 'Match already finalized' });
    }

    // Finalize once
    const updated = await query(
      `UPDATE matches
 SET result_home_goals = $1,
     result_away_goals = $2,
     actual_advancing_team = $3,
     result_finalized = TRUE
 WHERE id = $4
   AND result_finalized = FALSE`,
[home_goals, away_goals, actual_advancing_team || null, matchId]
    );

    if (updated.rowCount === 0) {
      return res.status(409).json({ error: 'Match already finalized' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save result' });
  }
});


// Admin: unfinalise a match (make editable again)
matchesRouter.post('/:matchId/unfinalise', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { matchId } = req.params;

    const result = await query(
     `UPDATE matches
 SET result_home_goals = NULL,
     result_away_goals = NULL,
     actual_advancing_team = NULL,
     result_finalized = false
 WHERE id = $1
 RETURNING id, result_home_goals, result_away_goals, actual_advancing_team, result_finalized`,
      [matchId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unfinalise match' });
  }
});
// Admin: unfinalise all knockout matches
matchesRouter.post('/knockouts/unfinalise-all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await query(
      `UPDATE matches
       SET result_home_goals = NULL,
           result_away_goals = NULL,
           actual_advancing_team = NULL,
           result_finalized = false
       WHERE stage IN ('Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Third-place Play-off', 'Final')
       RETURNING id`
    );

    res.json({ ok: true, count: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unfinalise knockout matches' });
  }
});
// Admin: update knockout team label
matchesRouter.post('/:matchId/team-label', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { slot, team } = req.body;

    if (!['home_team', 'away_team'].includes(slot)) {
      return res.status(400).json({ error: 'slot must be home_team or away_team' });
    }

    if (typeof team !== 'string' || team.trim() === '') {
      return res.status(400).json({ error: 'team is required' });
    }

   const column = slot === 'home_team' ? 'home_team' : 'away_team';

   const result = await query(
  `UPDATE matches
   SET ${column} = $1
   WHERE id = $2
     AND stage IN ('Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Third-place Play-off', 'Final')
   RETURNING id, stage, group_name, home_team, away_team`,
  [team.trim(), matchId]
);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Knockout match not found' });
    }

    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update team label' });
  }
});

import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

export const predictionsRouter = express.Router();

// Helper: is match still editable? (now < kickoff - 2h)
async function isEditable(matchId) {
  const result = await query(
    'SELECT kickoff_utc FROM matches WHERE id = $1',
    [matchId]
  );

  if (result.rowCount === 0) return false;

  const kickoff = new Date(result.rows[0].kickoff_utc);
  const now = new Date();
  const cutoff = new Date(kickoff.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

  return now < cutoff;
}

// Upsert prediction for a specific match
predictionsRouter.post('/:matchId', authMiddleware, async (req, res) => {
  const { matchId } = req.params;
  const { predicted_home_goals, predicted_away_goals } = req.body;

  if (
    typeof predicted_home_goals !== 'number' ||
    typeof predicted_away_goals !== 'number'
  ) {
    return res.status(400).json({ error: 'Goals must be numbers' });
  }

  try {
    const editable = await isEditable(matchId);
    if (!editable) {
      return res.status(400).json({ error: 'Prediction window closed for this match' });
    }

    // Always insert into history for audit
    await query(
      `INSERT INTO prediction_history
       (user_id, match_id, predicted_home_goals, predicted_away_goals)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, matchId, predicted_home_goals, predicted_away_goals]
    );

    // Upsert current prediction
    const existing = await query(
      'SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2',
      [req.user.id, matchId]
    );

    if (existing.rowCount === 0) {
      await query(
        `INSERT INTO predictions
         (user_id, match_id, predicted_home_goals, predicted_away_goals)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, matchId, predicted_home_goals, predicted_away_goals]
      );
    } else {
      await query(
        `UPDATE predictions
         SET predicted_home_goals = $1,
             predicted_away_goals = $2,
             updated_at = now()
         WHERE user_id = $3 AND match_id = $4`,
        [predicted_home_goals, predicted_away_goals, req.user.id, matchId]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// Get my predictions for a tournament (with points)
predictionsRouter.get('/tournament/:tournamentId', authMiddleware, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const result = await query(
      `SELECT
         p.match_id,
         p.predicted_home_goals,
         p.predicted_away_goals,
         m.result_home_goals,
         m.result_away_goals,
         m.result_finalized
       FROM predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE p.user_id = $1
         AND m.tournament_id = $2`,
      [req.user.id, tournamentId]
    );

    const outcome = (h, a) => (h > a ? 'H' : h < a ? 'A' : 'D');

    const rowsWithPoints = result.rows.map(r => {
      // Not finalised yet → no points
      if (!r.result_finalized) {
        return {
          match_id: r.match_id,
          predicted_home_goals: r.predicted_home_goals,
          predicted_away_goals: r.predicted_away_goals,
          points: null,
        };
      }

      const ph = r.predicted_home_goals;
      const pa = r.predicted_away_goals;
      const ah = r.result_home_goals;
      const aa = r.result_away_goals;

      // Defensive: if results missing, no points
      if (ah === null || aa === null || ph === null || pa === null) {
        return {
          match_id: r.match_id,
          predicted_home_goals: r.predicted_home_goals,
          predicted_away_goals: r.predicted_away_goals,
          points: null,
        };
      }

      let points = 0;

      // 10 points per correct item (4 items = 40 total)
      if (outcome(ph, pa) === outcome(ah, aa)) points += 10;       // correct outcome
      if ((ph - pa) === (ah - aa)) points += 10;                   // correct goal difference
      if (ph === ah) points += 10;                                 // correct home goals
      if (pa === aa) points += 10;                                 // correct away goals

      return {
        match_id: r.match_id,
        predicted_home_goals: r.predicted_home_goals,
        predicted_away_goals: r.predicted_away_goals,
        points,
      };
    });

    res.json(rowsWithPoints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load predictions' });
  }
});


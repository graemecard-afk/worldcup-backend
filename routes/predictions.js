import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';
import { scoreMatchPrediction } from '../scoring.js';

export const predictionsRouter = express.Router();

const knockoutStages = new Set([
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Third-place Play-off',
  'Final',
]);

const advancementBonusByStage = {
  'Round of 32': 10,
  'Round of 16': 20,
  'Quarter-final': 40,
  'Semi-final': 80,
  'Third-place Play-off': 120,
  Final: 160,
};

// Helper: is match still editable? (now < kickoff - 2h)
async function isEditable(matchId) {
  const result = await query(
    'SELECT kickoff_utc FROM matches WHERE id = $1',
    [matchId]
  );

  if (result.rowCount === 0) return false;

  const kickoff = new Date(result.rows[0].kickoff_utc);
  const now = new Date();
  const cutoff = new Date(kickoff.getTime() - 2 * 60 * 60 * 1000);

  return now < cutoff;
}

// Upsert prediction for a specific match
predictionsRouter.post('/:matchId', authMiddleware, async (req, res) => {
  const { matchId } = req.params;
  const {
    predicted_home_goals,
    predicted_away_goals,
    predicted_advancing_team,
    predicted_home_team,
    predicted_away_team,
  } = req.body;

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

    await query(
     `INSERT INTO prediction_history
         (
           user_id,
           match_id,
           predicted_home_goals,
           predicted_away_goals,
           predicted_advancing_team,
           predicted_home_team,
           predicted_away_team
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          matchId,
          predicted_home_goals,
          predicted_away_goals,
          predicted_advancing_team,
          predicted_home_team,
          predicted_away_team,
        ]
    );

    const existing = await query(
      'SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2',
      [req.user.id, matchId]
    );

    if (existing.rowCount === 0) {
      await query(
          `INSERT INTO predictions
           (
             user_id,
             match_id,
             predicted_home_goals,
             predicted_away_goals,
             predicted_advancing_team,
             predicted_home_team,
             predicted_away_team
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user.id,
            matchId,
            predicted_home_goals,
            predicted_away_goals,
            predicted_advancing_team,
            predicted_home_team,
            predicted_away_team,
          ]
      );
    } else {
      await query(
        `UPDATE predictions
         SET predicted_home_goals = $1,
             predicted_away_goals = $2,
             predicted_advancing_team = $3,
             predicted_home_team = $4,
             predicted_away_team = $5,
             updated_at = now()
         WHERE user_id = $6 AND match_id = $7`,
        [
          predicted_home_goals,
          predicted_away_goals,
          predicted_advancing_team,
          predicted_home_team,
          predicted_away_team,
          req.user.id,
          matchId,
        ]
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
         p.predicted_advancing_team,
         m.stage,
         m.home_team,
         m.away_team,
         m.result_home_goals,
         m.result_away_goals,
         m.actual_advancing_team,
         m.result_finalized
       FROM predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE p.user_id = $1
         AND m.tournament_id = $2`,
      [req.user.id, tournamentId]
    );

    const rowsWithPoints = result.rows.map(r => {
      if (!r.result_finalized) {
        return {
          match_id: r.match_id,
          predicted_home_goals: r.predicted_home_goals,
          predicted_away_goals: r.predicted_away_goals,
          predicted_advancing_team: r.predicted_advancing_team,
          points: null,
        };
      }

      const ph = r.predicted_home_goals;
      const pa = r.predicted_away_goals;
      const ah = r.result_home_goals;
      const aa = r.result_away_goals;

      if (ah === null || aa === null || ph === null || pa === null) {
        return {
          match_id: r.match_id,
          predicted_home_goals: r.predicted_home_goals,
          predicted_away_goals: r.predicted_away_goals,
          predicted_advancing_team: r.predicted_advancing_team,
          points: null,
        };
      }

      let points = scoreMatchPrediction({
        actualHome: ah,
        actualAway: aa,
        predictedHome: ph,
        predictedAway: pa,
      });

      const isKnockout = knockoutStages.has(r.stage);

      let actualAdvancingTeam = r.actual_advancing_team;
      if (!actualAdvancingTeam) {
        if (ah > aa) actualAdvancingTeam = r.home_team;
        else if (aa > ah) actualAdvancingTeam = r.away_team;
      }

      let predictedAdvancingTeam = r.predicted_advancing_team;
      if (!predictedAdvancingTeam) {
        if (ph > pa) predictedAdvancingTeam = r.home_team;
        else if (pa > ph) predictedAdvancingTeam = r.away_team;
      }

      if (
        isKnockout &&
        predictedAdvancingTeam &&
        actualAdvancingTeam &&
        predictedAdvancingTeam === actualAdvancingTeam
      ) {
        points += advancementBonusByStage[r.stage] || 0;
      }

      return {
        match_id: r.match_id,
        predicted_home_goals: r.predicted_home_goals,
        predicted_away_goals: r.predicted_away_goals,
        predicted_advancing_team: r.predicted_advancing_team,
        points,
      };
    });

    res.json(rowsWithPoints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load predictions' });
  }
});

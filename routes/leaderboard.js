import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';
import { scoreMatchPrediction } from '../scoring.js';

export const leaderboardRouter = express.Router();

// Basic group-stage leaderboard
leaderboardRouter.get('/:tournamentId', authMiddleware, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // 1) Get all finalised matches in this tournament
    const matchesRes = await query(
      `SELECT id, result_home_goals, result_away_goals
       FROM matches
       WHERE tournament_id = $1
         AND result_finalized = TRUE`,
      [tournamentId]
    );

    const matches = matchesRes.rows;
    if (matches.length === 0) {
      return res.json([]); // no results yet
    }

    const matchIds = matches.map(m => m.id);

    // 2) Get all predictions for these matches
    const predsRes = await query(
      `SELECT p.user_id, p.match_id,
              p.predicted_home_goals, p.predicted_away_goals
       FROM predictions p
       WHERE p.match_id = ANY($1::uuid[])`,
      [matchIds]
    );

    const preds = predsRes.rows;

    // 3) Accumulate scores per user
    const userPoints = new Map(); // user_id -> total points

    for (const pred of preds) {
      const match = matches.find(m => m.id === pred.match_id);
      if (!match) continue;

      const basePoints = scoreMatchPrediction({
        actualHome: match.result_home_goals,
        actualAway: match.result_away_goals,
        predictedHome: pred.predicted_home_goals,
        predictedAway: pred.predicted_away_goals,
      });

      const prev = userPoints.get(pred.user_id) || 0;
      userPoints.set(pred.user_id, prev + basePoints);
    }

    // 4) Fetch user names for display
    const userIds = [...userPoints.keys()];
    if (userIds.length === 0) {
      return res.json([]);
    }

    const usersRes = await query(
      `SELECT id, name
       FROM users
       WHERE id = ANY($1::int[])`,
      [userIds]
    );

    const users = usersRes.rows;

    const leaderboard = userIds.map(uid => {
      const user = users.find(u => u.id === uid);
      return {
        user_id: uid,
        name: user?.name || 'Unknown',
        total_points: userPoints.get(uid),
      };
    });

    // 5) Sort by total_points descending
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

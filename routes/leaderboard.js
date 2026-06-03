import express from "express";
import { query } from "../db.js";
import { authMiddleware } from "../auth.js";
import { scoreMatchPrediction } from "../scoring.js";

export const leaderboardRouter = express.Router();

// Basic group-stage leaderboard
leaderboardRouter.get("/:tournamentId", authMiddleware, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // 1) Get all finalised matches in this tournament
    const matchesRes = await query(
     `SELECT id,
    stage,
    home_team,
    away_team,
    result_home_goals,
    result_away_goals,
    actual_advancing_team
FROM matches
   WHERE tournament_id = $1
     AND result_finalized = TRUE`,
      [tournamentId],
    );

    const matches = matchesRes.rows;
    if (matches.length === 0) {
      return res.json([]); // no results yet
    }

    const matchIds = matches.map((m) => m.id);

    // 2) Get all predictions for these matches
    const predsRes = await query(
      `SELECT p.user_id, p.match_id,
          p.predicted_home_goals,
          p.predicted_away_goals,
          p.predicted_advancing_team
   FROM predictions p
   WHERE p.match_id = ANY($1::uuid[])`,
      [matchIds],
    );

    const preds = predsRes.rows;

    // 3) Accumulate scores per user, separated by competition phase
    const groupStagePointsByUser = new Map();
    const knockoutPointsByUser = new Map();

    const knockoutStages = new Set([
      "Round of 32",
      "Round of 16",
      "Quarter-final",
      "Semi-final",
      "Third-place Play-off",
      "Final",
    ]);
    const advancementBonusByStage = {
      "Round of 32": 10,
      "Round of 16": 20,
      "Quarter-final": 40,
      "Semi-final": 80,
      "Third-place Play-off": 120,
      Final: 160,
    };

    for (const pred of preds) {
      const match = matches.find((m) => m.id === pred.match_id);
      if (!match) continue;

      const basePoints = scoreMatchPrediction({
        actualHome: match.result_home_goals,
        actualAway: match.result_away_goals,
        predictedHome: pred.predicted_home_goals,
        predictedAway: pred.predicted_away_goals,
      });

      const isKnockout = knockoutStages.has(match.stage);
      let totalForMatch = basePoints;

      let actualAdvancingTeam = match.actual_advancing_team;

if (!actualAdvancingTeam) {
  if (match.result_home_goals > match.result_away_goals) {
    actualAdvancingTeam = match.home_team;
  } else if (match.result_away_goals > match.result_home_goals) {
    actualAdvancingTeam = match.away_team;
  }
}

let predictedAdvancingTeam = pred.predicted_advancing_team;

if (!predictedAdvancingTeam) {
  if (pred.predicted_home_goals > pred.predicted_away_goals) {
    predictedAdvancingTeam = match.home_team;
  } else if (pred.predicted_away_goals > pred.predicted_home_goals) {
    predictedAdvancingTeam = match.away_team;
  }
}

if (
  isKnockout &&
  predictedAdvancingTeam &&
  actualAdvancingTeam &&
  predictedAdvancingTeam === actualAdvancingTeam
) {
  totalForMatch += advancementBonusByStage[match.stage] || 0;
}

      const targetMap = isKnockout
        ? knockoutPointsByUser
        : groupStagePointsByUser;
      const prev = targetMap.get(pred.user_id) || 0;

      targetMap.set(pred.user_id, prev + totalForMatch);
    }

    const allUserIds = new Set([
      ...groupStagePointsByUser.keys(),
      ...knockoutPointsByUser.keys(),
    ]);

    // 4) Fetch user names for display
    const userIds = [...allUserIds];
    if (userIds.length === 0) {
      return res.json([]);
    }

    const usersRes = await query(
      `SELECT id, name
       FROM users
       WHERE id = ANY($1::int[])`,
      [userIds],
    );

    const users = usersRes.rows;

    const leaderboard = userIds.map((uid) => {
      const user = users.find((u) => u.id === uid);
      const groupStagePoints = groupStagePointsByUser.get(uid) || 0;
      const knockoutPoints = knockoutPointsByUser.get(uid) || 0;
      const totalPoints = groupStagePoints + knockoutPoints;

      return {
        user_id: uid,
        name: user?.name || "Unknown",
        group_stage_points: groupStagePoints,
        knockout_points: knockoutPoints,
        total_points: totalPoints,
      };
    });

    // 5) Sort by total_points descending
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

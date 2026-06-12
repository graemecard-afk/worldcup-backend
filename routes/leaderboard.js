import express from "express";
import { query } from "../db.js";
import { authMiddleware, adminOnly } from "../auth.js";
import {
  scoreMatchPrediction,
  scoreKnockoutMatchPrediction,
} from "../scoring.js";
import { scoreThirdPlacePrediction } from "../scoringThirdPlace.js";

export const leaderboardRouter = express.Router();

function getMatchNumber(value) {
  const found = String(value || "").match(/\d+/);
  return found ? Number(found[0]) : null;
}

function resolveActualTeam(team, matchesByNumber) {
  const sourceMatchNumber = getMatchNumber(team);

  if (!sourceMatchNumber) {
    return team;
  }

  const sourceMatch = matchesByNumber.get(sourceMatchNumber);

  if (!sourceMatch) {
    return team;
  }

  return sourceMatch.actual_advancing_team || team;
}

function resolveActualMatchTeams(match, matchesByNumber) {
  const matchNumber = getMatchNumber(match.group_name);

  if (matchNumber === 103) {
    const semiOne = matchesByNumber.get(101);
    const semiTwo = matchesByNumber.get(102);

    const semiOneHome = resolveActualTeam(semiOne?.home_team, matchesByNumber);
    const semiOneAway = resolveActualTeam(semiOne?.away_team, matchesByNumber);
    const semiTwoHome = resolveActualTeam(semiTwo?.home_team, matchesByNumber);
    const semiTwoAway = resolveActualTeam(semiTwo?.away_team, matchesByNumber);

    const semiOneLoser =
      semiOne?.actual_advancing_team === semiOneHome ? semiOneAway : semiOneHome;

    const semiTwoLoser =
      semiTwo?.actual_advancing_team === semiTwoHome ? semiTwoAway : semiTwoHome;

    return {
      actualHomeTeam: semiOneLoser,
      actualAwayTeam: semiTwoLoser,
    };
  }

  return {
    actualHomeTeam: resolveActualTeam(match.home_team, matchesByNumber),
    actualAwayTeam: resolveActualTeam(match.away_team, matchesByNumber),
  };
}

async function buildLeaderboard(tournamentId) {
  const matchesRes = await query(
    `SELECT id,
            group_name,
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
    return [];
  }

  const matchesByNumber = new Map();

  matches.forEach(match => {
    const matchNumber = getMatchNumber(match.group_name);

    if (matchNumber !== null) {
      matchesByNumber.set(matchNumber, match);
    }
  });

  const matchIds = matches.map((m) => m.id);

  const predsRes = await query(
    `SELECT p.user_id,
            p.match_id,
            p.predicted_home_goals,
            p.predicted_away_goals,
            p.predicted_advancing_team,
            p.predicted_home_team,
            p.predicted_away_team
     FROM predictions p
     WHERE p.match_id = ANY($1::uuid[])`,
    [matchIds],
  );

  const preds = predsRes.rows;

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

    const isKnockout = knockoutStages.has(match.stage);
    const actualMatchTeams = resolveActualMatchTeams(match, matchesByNumber);
    const matchNumber = getMatchNumber(match.group_name);

    const basePoints = isKnockout
      ? matchNumber === 103
        ? scoreThirdPlacePrediction({
            actualHome: match.result_home_goals,
            actualAway: match.result_away_goals,
            predictedHome: pred.predicted_home_goals,
            predictedAway: pred.predicted_away_goals,
            actualHomeTeam: actualMatchTeams.actualHomeTeam,
            actualAwayTeam: actualMatchTeams.actualAwayTeam,
            predictedHomeTeam: pred.predicted_home_team,
            predictedAwayTeam: pred.predicted_away_team,
          })
        : scoreKnockoutMatchPrediction({
            actualHome: match.result_home_goals,
            actualAway: match.result_away_goals,
            predictedHome: pred.predicted_home_goals,
            predictedAway: pred.predicted_away_goals,
            actualHomeTeam: actualMatchTeams.actualHomeTeam,
            actualAwayTeam: actualMatchTeams.actualAwayTeam,
            predictedHomeTeam: pred.predicted_home_team,
            predictedAwayTeam: pred.predicted_away_team,
          })
      : scoreMatchPrediction({
          actualHome: match.result_home_goals,
          actualAway: match.result_away_goals,
          predictedHome: pred.predicted_home_goals,
          predictedAway: pred.predicted_away_goals,
        });

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

  const userIds = [...allUserIds];

  if (userIds.length === 0) {
    return [];
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

  leaderboard.sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }

    if (b.group_stage_points !== a.group_stage_points) {
      return b.group_stage_points - a.group_stage_points;
    }

    return String(a.name).localeCompare(String(b.name));
  });

  let lastPoints = null;
  let currentRank = 0;

  return leaderboard.map((row, idx) => {
    if (lastPoints === null || row.total_points !== lastPoints) {
      currentRank = idx + 1;
      lastPoints = row.total_points;
    }

    return {
      ...row,
      rank: currentRank,
    };
  });
}

leaderboardRouter.get("/:tournamentId", authMiddleware, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const leaderboard = await buildLeaderboard(tournamentId);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

leaderboardRouter.post("/:tournamentId/snapshots", authMiddleware, adminOnly, async (req, res) => {
  const { tournamentId } = req.params;
  const { snapshot_name } = req.body;

  const snapshotName = String(snapshot_name || "").trim();

  if (!snapshotName) {
    return res.status(400).json({ error: "Snapshot name is required" });
  }

  try {
    const leaderboard = await buildLeaderboard(tournamentId);

    if (!leaderboard.length) {
      return res.status(400).json({ error: "No leaderboard data to snapshot" });
    }

    const snapshotAtRes = await query(`SELECT now() AS snapshot_at`);
    const snapshotAt = snapshotAtRes.rows[0].snapshot_at;

    for (const row of leaderboard) {
      await query(
        `INSERT INTO leaderboard_snapshots (
           tournament_id,
           snapshot_name,
           snapshot_at,
           user_id,
           user_name,
           rank,
           group_stage_points,
           knockout_points,
           total_points
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tournamentId,
          snapshotName,
          snapshotAt,
          row.user_id,
          row.name,
          row.rank,
          row.group_stage_points,
          row.knockout_points,
          row.total_points,
        ],
      );
    }

    res.json({
      ok: true,
      snapshot_name: snapshotName,
      snapshot_at: snapshotAt,
      rows_saved: leaderboard.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save leaderboard snapshot" });
  }
});

leaderboardRouter.get("/:tournamentId/snapshots/report", authMiddleware, adminOnly, async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const snapshotsRes = await query(
      `SELECT snapshot_name, snapshot_at
       FROM leaderboard_snapshots
       WHERE tournament_id = $1
       GROUP BY snapshot_name, snapshot_at
       ORDER BY snapshot_at DESC
       LIMIT 2`,
      [tournamentId],
    );

    if (snapshotsRes.rowCount < 2) {
      return res.status(400).json({
        error: "At least two snapshots are required to generate a report",
      });
    }

    const latest = snapshotsRes.rows[0];
    const previous = snapshotsRes.rows[1];

    const comparisonRes = await query(
      `SELECT
         latest.user_id,
         latest.user_name,
         latest.rank AS latest_rank,
         previous.rank AS previous_rank,
         latest.total_points AS latest_total_points,
         previous.total_points AS previous_total_points,
         latest.total_points - previous.total_points AS points_gained,
         previous.rank - latest.rank AS rank_change
       FROM leaderboard_snapshots latest
       JOIN leaderboard_snapshots previous
         ON previous.tournament_id = latest.tournament_id
        AND previous.user_id = latest.user_id
       WHERE latest.tournament_id = $1
         AND latest.snapshot_at = $2
         AND previous.snapshot_at = $3`,
      [tournamentId, latest.snapshot_at, previous.snapshot_at],
    );

    const rows = comparisonRes.rows;

    const topScorers = [...rows]
      .filter(row => Number(row.points_gained) > 0)
      .sort((a, b) => {
        if (Number(b.points_gained) !== Number(a.points_gained)) {
          return Number(b.points_gained) - Number(a.points_gained);
        }

        return String(a.user_name).localeCompare(String(b.user_name));
      })
      .slice(0, 10);

    const biggestMovers = [...rows]
      .filter(row => Number(row.rank_change) > 0)
      .sort((a, b) => {
        if (Number(b.rank_change) !== Number(a.rank_change)) {
          return Number(b.rank_change) - Number(a.rank_change);
        }

        if (Number(b.points_gained) !== Number(a.points_gained)) {
          return Number(b.points_gained) - Number(a.points_gained);
        }

        return String(a.user_name).localeCompare(String(b.user_name));
      })
      .slice(0, 10);

    res.json({
      previous_snapshot: previous,
      latest_snapshot: latest,
      top_scorers: topScorers,
      biggest_movers: biggestMovers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate leaderboard report" });
  }
});
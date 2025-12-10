// Basic scoring logic for group-stage style matches (0–40 points)

function getOutcome(home, away) {
  if (home > away) return 'HOME_WIN';
  if (home < away) return 'AWAY_WIN';
  return 'DRAW';
}

/**
 * Score a 90-minute prediction (0–40 points).
 * Rules:
 * - Correct outcome (win/draw/loss) = 10 points
 * - Correct goal difference (spread) = 10 points
 * - Correct home goals = 10 points
 * - Correct away goals = 10 points
 */
export function scoreMatchPrediction({
  actualHome,
  actualAway,
  predictedHome,
  predictedAway,
}) {
  let points = 0;

  const actualDiff = actualHome - actualAway;
  const predDiff = predictedHome - predictedAway;

  const actualOutcome = getOutcome(actualHome, actualAway);
  const predOutcome = getOutcome(predictedHome, predictedAway);

  if (actualOutcome === predOutcome) points += 10;
  if (actualDiff === predDiff) points += 10;
  if (actualHome === predictedHome) points += 10;
  if (actualAway === predictedAway) points += 10;

  return points;
}

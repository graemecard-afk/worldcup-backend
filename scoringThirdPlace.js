export function scoreThirdPlacePrediction({
  actualHome,
  actualAway,
  predictedHome,
  predictedAway,
  actualHomeTeam,
  actualAwayTeam,
  predictedHomeTeam,
  predictedAwayTeam,
}) {
  const bothTeamsMatch =
    actualHomeTeam === predictedHomeTeam &&
    actualAwayTeam === predictedAwayTeam;

  if (!bothTeamsMatch) {
    return 0;
  }

  let points = 0;

  const actualDiff = actualHome - actualAway;
  const predDiff = predictedHome - predictedAway;

  const actualOutcome =
    actualHome > actualAway
      ? "HOME_WIN"
      : actualHome < actualAway
        ? "AWAY_WIN"
        : "DRAW";

  const predOutcome =
    predictedHome > predictedAway
      ? "HOME_WIN"
      : predictedHome < predictedAway
        ? "AWAY_WIN"
        : "DRAW";

  if (actualOutcome === predOutcome) points += 10;
  if (actualDiff === predDiff) points += 10;
  if (actualHome === predictedHome) points += 10;
  if (actualAway === predictedAway) points += 10;

  return points;
}
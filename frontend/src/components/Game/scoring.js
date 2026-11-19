const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function calculateScore({
  completed,
  timeLimit,
  elapsedSeconds,
  instructionCount,
  optimalInstructions,
  mistakes,
  efficient = false,
  firstTry = false,
  collectible = false,
}) {
  const timeEfficiency = clamp(1 - elapsedSeconds / Math.max(timeLimit, 1), 0, 1);
  const codeEfficiency = clamp(optimalInstructions / Math.max(instructionCount, 1), 0, 1);
  const accuracy = 1 / (1 + Math.max(mistakes, 0) * 0.4);
  const multiplier = efficient || firstTry || collectible ? 2 : 1;
  const bonusPoints = (efficient ? 2 : 0) + (firstTry ? 1 : 0) + (collectible ? 1 : 0);
  const baseScore = completed
    ? 45 + timeEfficiency * 20 + codeEfficiency * 15 + accuracy * 12
    : timeEfficiency * 20 + codeEfficiency * 15 + accuracy * 12;

  return {
    score: Math.round(clamp(baseScore + bonusPoints * multiplier, 0, 100) * 10) / 10,
    multiplier,
    timeEfficiency: Math.round(timeEfficiency * 1000) / 1000,
    codeEfficiency: Math.round(codeEfficiency * 1000) / 1000,
  };
}

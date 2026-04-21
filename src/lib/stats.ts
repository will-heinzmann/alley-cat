// Shared stats helpers

/** Population standard deviation. Returns 0 for empty/<2 inputs. */
export const standardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Convert a standard deviation of bowling scores into a 0–100 "Consistency Score".
 * Lower std-dev → higher consistency. ~5 pin sd ≈ ~95; ~50 pin sd ≈ ~0.
 */
export const consistencyScoreFromStdDev = (sd: number): number => {
  if (!Number.isFinite(sd) || sd <= 0) return 100;
  const score = 100 - sd * 2; // every pin of sd costs 2 points
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const consistencyLabel = (score: number): string => {
  if (score >= 85) return "Robotic 🤖";
  if (score >= 70) return "Rock Solid 💎";
  if (score >= 55) return "Steady ⚖️";
  if (score >= 40) return "Streaky 🎢";
  return "Unpredictable 🎲";
};

/**
 * Spare Suggestions / Visual Coaching
 * Given the remaining pins after Roll 1, returns target pins to highlight.
 * 
 * Common spare conversions with recommended target pins:
 * This is a simplified guide — highlights the pins the bowler should aim at.
 */

// Pin layout (standard):
// Row 4:  7  8  9  10   (indices 6,7,8,9)
// Row 3:    4  5  6     (indices 3,4,5)
// Row 2:     2  3       (indices 1,2)
// Row 1:      1         (index 0)

interface SpareAdvice {
  targetPins: number[]; // indices to highlight as targets
  tip: string;          // short coaching text
}

/**
 * Get spare suggestion based on which pins are still standing.
 * @param standing - boolean[10], true = pin is still up
 * @returns SpareAdvice with target pins and a tip
 */
export const getSpareAdvice = (standing: boolean[]): SpareAdvice => {
  const upPins = standing.map((s, i) => s ? i : -1).filter(i => i >= 0);
  
  if (upPins.length === 0) {
    return { targetPins: [], tip: "" };
  }

  // All remaining pins are targets
  // Add specific tips for common leaves
  const key = upPins.join(",");
  
  const tips: Record<string, string> = {
    // Single pin spares
    "0": "Hit the 1-pin head on",
    "1": "Aim slightly left of center",
    "2": "Aim slightly right of center",
    "3": "Target the left side of the lane",
    "4": "Hit straight through the middle",
    "5": "Target the right side of the lane",
    "6": "Cross lane — aim from the right side",
    "7": "Aim through the center-right",
    "8": "Aim through the center-left",
    "9": "Cross lane — aim from the left side",
    // Common multi-pin leaves
    "3,6": "7-10 split! Aim for the 7-pin edge",  // 4,7 pins
    "6,9": "7-10 split! Nearly impossible — pick one side",
    "0,1": "1-2 leave — aim between them",
    "0,2": "1-3 leave — aim between them",
    "1,3": "2-4 leave — target the 2-pin",
    "2,5": "3-6 leave — target the 3-pin",
    "3,4,5": "4-5-6 — hit the 5-pin center",
    "0,1,2": "1-2-3 — target the head pin",
  };

  const tip = tips[key] || `Aim for the ${upPins.map(i => i + 1).join(", ")} pin${upPins.length > 1 ? "s" : ""}`;

  return {
    targetPins: upPins,
    tip,
  };
};

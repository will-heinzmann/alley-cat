import { useCallback } from "react";

interface PinDeckProps {
  /** Which pins are still standing (true = standing) */
  standing: boolean[];
  /** Which pins the user has marked as hit this roll */
  hit: boolean[];
  /** Toggle a pin as hit/unhit */
  onTogglePin: (pinIndex: number) => void;
  /** Whether interaction is disabled */
  disabled?: boolean;
}

/**
 * Visual 10-pin bowling deck layout.
 * Pin numbering (standard):
 *   Row 4 (back):  7  8  9  10
 *   Row 3:          4  5  6
 *   Row 2:           2  3
 *   Row 1 (front):    1
 */
const PIN_ROWS = [
  [6, 7, 8, 9],  // pins 7,8,9,10 (index 6-9)
  [3, 4, 5],     // pins 4,5,6 (index 3-5)
  [1, 2],        // pins 2,3 (index 1-2)
  [0],           // pin 1 (index 0)
];

const PinDeck = ({ standing, hit, onTogglePin, disabled = false }: PinDeckProps) => {
  const handleTap = useCallback((idx: number) => {
    if (disabled || !standing[idx]) return;
    onTogglePin(idx);
  }, [disabled, standing, onTogglePin]);

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {PIN_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 justify-center">
          {row.map((pinIdx) => {
            const isStanding = standing[pinIdx];
            const isHit = hit[pinIdx];

            if (!isStanding) {
              // Pin already knocked down from previous roll
              return (
                <div
                  key={pinIdx}
                  className="w-10 h-10 rounded-full border border-border/30 bg-muted/20 opacity-30"
                />
              );
            }

            return (
              <button
                key={pinIdx}
                type="button"
                onClick={() => handleTap(pinIdx)}
                disabled={disabled}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-150 text-xs font-bold
                  active:scale-95 touch-manipulation
                  ${isHit
                    ? "border-destructive bg-destructive/20 text-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.4)]"
                    : "border-primary bg-primary/10 text-primary shadow-[0_0_6px_hsl(var(--primary)/0.3)] hover:bg-primary/20"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {pinIdx + 1}
              </button>
            );
          })}
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-1">Tap pins to mark as hit</p>
    </div>
  );
};

export default PinDeck;

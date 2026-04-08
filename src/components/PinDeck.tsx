import { useCallback } from "react";

interface PinDeckProps {
  standing: boolean[];
  hit: boolean[];
  onTogglePin: (pinIndex: number) => void;
  disabled?: boolean;
  /** Indices of pins to highlight as spare targets */
  spareSuggestions?: number[];
}

const PIN_ROWS = [
  [6, 7, 8, 9],
  [3, 4, 5],
  [1, 2],
  [0],
];

const PinDeck = ({ standing, hit, onTogglePin, disabled = false, spareSuggestions = [] }: PinDeckProps) => {
  const handleTap = useCallback((idx: number) => {
    if (disabled || !standing[idx]) return;
    onTogglePin(idx);
  }, [disabled, standing, onTogglePin]);

  const isSuggested = (idx: number) => spareSuggestions.includes(idx);

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {PIN_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 justify-center">
          {row.map((pinIdx) => {
            const isStanding = standing[pinIdx];
            const isHit = hit[pinIdx];
            const suggested = isSuggested(pinIdx) && isStanding && !isHit;

            if (!isStanding) {
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
                    : suggested
                      ? "border-secondary bg-secondary/20 text-secondary shadow-[0_0_10px_hsl(var(--secondary)/0.5)] animate-pulse"
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
      <p className="text-[10px] text-muted-foreground mt-1">{invertMode ? "Tap pins you MISSED" : "Tap pins to mark as hit"}</p>
    </div>
  );
};

export default PinDeck;

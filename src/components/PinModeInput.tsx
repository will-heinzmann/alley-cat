import { useState, useCallback, useRef } from "react";
import PinDeck from "./PinDeck";
import { getSpareAdvice } from "@/lib/spareGuide";

interface FrameData {
  roll1: number | null;
  roll2: number | null;
  roll3?: number | null;
}

interface PinModeInputProps {
  onScoreChange: (totalScore: number, frames: FrameData[]) => void;
}

const allStanding = () => Array(10).fill(true);
const noHits = () => Array(10).fill(false);

const framesToRolls = (frames: FrameData[]): number[] => {
  const rolls: number[] = [];
  for (let i = 0; i < 10; i++) {
    const f = frames[i];
    if (!f) break;
    rolls.push(f.roll1 ?? 0);
    if (i < 9) {
      if (f.roll1 !== 10) rolls.push(f.roll2 ?? 0);
    } else {
      rolls.push(f.roll2 ?? 0);
      if (f.roll3 !== undefined && f.roll3 !== null) rolls.push(f.roll3);
    }
  }
  return rolls;
};

const calculateScore = (frames: FrameData[]): number => {
  const rolls = framesToRolls(frames);
  let score = 0, ri = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (rolls[ri] === 10) {
      score += 10 + (rolls[ri + 1] || 0) + (rolls[ri + 2] || 0);
      ri += 1;
    } else if ((rolls[ri] + (rolls[ri + 1] || 0)) === 10) {
      score += 10 + (rolls[ri + 2] || 0);
      ri += 2;
    } else {
      score += (rolls[ri] || 0) + (rolls[ri + 1] || 0);
      ri += 2;
    }
  }
  return score;
};

const initFrames = (): FrameData[] =>
  Array.from({ length: 10 }, (_, i) => ({
    roll1: null, roll2: null, ...(i === 9 ? { roll3: null } : {}),
  }));

const getRollDisplay = (frames: FrameData[], frameIdx: number, rollIdx: number): string => {
  const f = frames[frameIdx];
  const val = rollIdx === 0 ? f.roll1 : rollIdx === 1 ? f.roll2 : f.roll3;
  if (val === null || val === undefined) return "";
  if (val === 10 && (rollIdx === 0 || frameIdx === 9)) return "X";
  if (frameIdx < 9 && rollIdx === 1 && f.roll1 !== null && f.roll1 + val === 10) return "/";
  if (frameIdx === 9) {
    if (rollIdx === 1 && f.roll1 !== 10 && f.roll1 !== null && f.roll1 + val === 10) return "/";
    if (rollIdx === 2) {
      if (val === 10) return "X";
      if (f.roll1 === 10 && f.roll2 !== null && f.roll2 !== 10 && f.roll2 + val === 10) return "/";
      if (f.roll1 !== 10 && (f.roll1 ?? 0) + (f.roll2 ?? 0) === 10 && val === 10) return "X";
    }
  }
  if (val === 0) return "-";
  return String(val);
};

const PinModeInput = ({ onScoreChange }: PinModeInputProps) => {
  const [frames, setFrames] = useState<FrameData[]>(initFrames);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentRoll, setCurrentRoll] = useState(0);
  const [standing, setStanding] = useState<boolean[]>(allStanding);
  const [hit, setHit] = useState<boolean[]>(noHits);
  const [gameComplete, setGameComplete] = useState(false);
  const [pinModeEnabled, setPinModeEnabled] = useState(true);

  // Long-press editing state
  const [editingFrame, setEditingFrame] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const togglePin = useCallback((idx: number) => {
    setHit(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }, []);

  // Spare suggestions: show on roll 2+ when pin mode is enabled
  const spareSuggestions = (() => {
    if (!pinModeEnabled || currentRoll === 0) return [];
    // On 10th frame, show suggestions on roll 2 if roll 1 wasn't a strike,
    // or on roll 3 if applicable
    if (currentFrame === 9) {
      const f = frames[currentFrame];
      if (currentRoll === 1 && f.roll1 === 10) return []; // fresh rack after strike
      if (currentRoll === 2) {
        const r1 = f.roll1 ?? 0;
        const r2 = f.roll2 ?? 0;
        if (r1 === 10 && r2 === 10) return []; // fresh rack
        if (r1 !== 10 && r1 + r2 === 10) return []; // fresh rack after spare
      }
    }
    const advice = getSpareAdvice(standing);
    return advice.targetPins;
  })();

  const spareTip = (() => {
    if (spareSuggestions.length === 0) return "";
    return getSpareAdvice(standing).tip;
  })();

  // Long-press handlers for frame editing
  const handleFramePointerDown = (frameIdx: number) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      startEditingFrame(frameIdx);
    }, 500);
  };

  const handleFramePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startEditingFrame = (frameIdx: number) => {
    const f = frames[frameIdx];
    if (f.roll1 === null) return; // nothing to edit

    setEditingFrame(frameIdx);
    // Reset the frame data
    const newFrames = frames.map((fr, i) => {
      if (i === frameIdx) {
        return frameIdx === 9
          ? { roll1: null, roll2: null, roll3: null }
          : { roll1: null, roll2: null };
      }
      return { ...fr };
    });
    setFrames(newFrames);
    setCurrentFrame(frameIdx);
    setCurrentRoll(0);
    setStanding(allStanding());
    setHit(noHits());
    setGameComplete(false);
    onScoreChange(calculateScore(newFrames), newFrames);
  };

  const cancelEdit = () => {
    setEditingFrame(null);
  };

  const confirmRoll = useCallback(() => {
    const pinsHit = hit.filter(Boolean).length;
    const newFrames = frames.map(f => ({ ...f }));
    const frame = currentFrame;
    const roll = currentRoll;

    if (frame < 9) {
      if (roll === 0) {
        newFrames[frame].roll1 = pinsHit;
        if (pinsHit === 10) {
          newFrames[frame].roll2 = null;
          setFrames(newFrames);
          const total = calculateScore(newFrames);
          onScoreChange(total, newFrames);
          // If editing, check if we should stop or continue
          if (editingFrame !== null) {
            setEditingFrame(null);
            // Find next incomplete frame
            const nextIncomplete = newFrames.findIndex((f, i) => {
              if (i < 9) return f.roll1 === null;
              return f.roll1 === null;
            });
            if (nextIncomplete === -1) {
              setGameComplete(true);
            } else {
              setCurrentFrame(nextIncomplete);
              setCurrentRoll(0);
              setStanding(allStanding());
              setHit(noHits());
            }
          } else if (frame < 9) {
            setCurrentFrame(frame + 1);
            setCurrentRoll(0);
            setStanding(allStanding());
            setHit(noHits());
          }
          return;
        }
        const newStanding = standing.map((s, i) => s && !hit[i]);
        setStanding(newStanding);
        setHit(noHits());
        setCurrentRoll(1);
        setFrames(newFrames);
        onScoreChange(calculateScore(newFrames), newFrames);
      } else {
        newFrames[frame].roll2 = pinsHit;
        setFrames(newFrames);
        onScoreChange(calculateScore(newFrames), newFrames);
        if (editingFrame !== null) {
          setEditingFrame(null);
          const nextIncomplete = newFrames.findIndex((f, i) => {
            if (i < 9) return f.roll1 === null;
            return f.roll1 === null;
          });
          if (nextIncomplete === -1) {
            setGameComplete(true);
          } else {
            setCurrentFrame(nextIncomplete);
            setCurrentRoll(0);
            setStanding(allStanding());
            setHit(noHits());
          }
        } else if (frame < 9) {
          setCurrentFrame(frame + 1);
          setCurrentRoll(0);
          setStanding(allStanding());
          setHit(noHits());
        }
      }
    } else {
      if (roll === 0) {
        newFrames[9].roll1 = pinsHit;
        setFrames(newFrames);
        onScoreChange(calculateScore(newFrames), newFrames);
        if (pinsHit === 10) {
          setStanding(allStanding());
          setHit(noHits());
        } else {
          const newStanding = standing.map((s, i) => s && !hit[i]);
          setStanding(newStanding);
          setHit(noHits());
        }
        setCurrentRoll(1);
      } else if (roll === 1) {
        newFrames[9].roll2 = pinsHit;
        setFrames(newFrames);
        onScoreChange(calculateScore(newFrames), newFrames);
        const r1 = newFrames[9].roll1 ?? 0;
        const needsThird = r1 === 10 || r1 + pinsHit >= 10;
        if (needsThird) {
          if (r1 === 10 && pinsHit === 10) {
            setStanding(allStanding());
          } else if (r1 === 10) {
            const newStanding = standing.map((s, i) => s && !hit[i]);
            setStanding(newStanding);
          } else {
            setStanding(allStanding());
          }
          setHit(noHits());
          setCurrentRoll(2);
        } else {
          setEditingFrame(null);
          setGameComplete(true);
        }
      } else {
        newFrames[9].roll3 = pinsHit;
        setFrames(newFrames);
        onScoreChange(calculateScore(newFrames), newFrames);
        setEditingFrame(null);
        setGameComplete(true);
      }
    }
  }, [hit, standing, frames, currentFrame, currentRoll, onScoreChange, editingFrame]);

  const resetGame = () => {
    setFrames(initFrames());
    setCurrentFrame(0);
    setCurrentRoll(0);
    setStanding(allStanding());
    setHit(noHits());
    setGameComplete(false);
    setEditingFrame(null);
    onScoreChange(0, initFrames());
  };

  const getCumulatives = (): (number | null)[] => {
    const rolls = framesToRolls(frames);
    const cumuls: (number | null)[] = [];
    let score = 0, ri = 0;
    for (let frame = 0; frame < 10; frame++) {
      const f = frames[frame];
      if (f.roll1 === null) break;
      if (frame === 9) {
        if (f.roll2 === null) break;
        const needs3 = f.roll1 === 10 || f.roll1 + (f.roll2 ?? 0) >= 10;
        if (needs3 && f.roll3 === null) break;
        score += (rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
        cumuls.push(score);
        break;
      }
      if (rolls[ri] === 10) {
        const nextFrame = frames[frame + 1];
        if (!nextFrame || nextFrame.roll1 === null) break;
        if (nextFrame.roll1 !== 10 && frame < 8 && nextFrame.roll2 === null) break;
        score += 10 + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
        cumuls.push(score);
        ri += 1;
      } else {
        if (f.roll2 === null) break;
        if ((rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) === 10) {
          if (frames[frame + 1]?.roll1 === null) break;
          score += 10 + (rolls[ri + 2] ?? 0);
        } else {
          score += (rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0);
        }
        cumuls.push(score);
        ri += 2;
      }
    }
    return cumuls;
  };

  const cumuls = getCumulatives();
  const frameLabel = editingFrame !== null
    ? `Editing Frame ${currentFrame + 1}`
    : currentFrame < 9 ? `Frame ${currentFrame + 1}` : "10th Frame";
  const rollLabel = currentRoll === 0 ? "Roll 1" : currentRoll === 1 ? "Roll 2" : "Roll 3";

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[10px] text-muted-foreground">Long-press a frame to edit</p>
        <button 
          onClick={() => setPinModeEnabled(!pinModeEnabled)}
          className={`text-[10px] px-2 py-1 border ${pinModeEnabled ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
        >
          {pinModeEnabled ? 'Pin Mode: ON' : 'Pin Mode: OFF'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs min-w-[380px] w-full">
          <thead>
            <tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <th key={i} className={`border border-border p-1 text-muted-foreground w-[9%] ${
                  i === currentFrame && !gameComplete ? "bg-primary/20 text-primary" : "bg-muted"
                } ${editingFrame === i ? "ring-2 ring-secondary" : ""}`}>{i + 1}</th>
              ))}
              <th className="border border-border p-1 text-muted-foreground bg-muted">TOT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {frames.map((frame, i) => {
                const isStrike = i < 9 && frame.roll1 === 10;
                const needsThird = i === 9 && frame.roll1 !== null && frame.roll2 !== null &&
                  (frame.roll1 === 10 || frame.roll1 + (frame.roll2 ?? 0) >= 10);
                const hasData = frame.roll1 !== null;
                return (
                  <td
                    key={i}
                    className={`border border-border p-0 text-center align-top select-none ${
                      i === currentFrame && !gameComplete ? "bg-primary/5" : ""
                    } ${editingFrame === i ? "ring-2 ring-secondary" : ""} ${
                      hasData ? "cursor-pointer" : ""
                    }`}
                    onPointerDown={() => hasData && !gameComplete ? handleFramePointerDown(i) : undefined}
                    onPointerUp={handleFramePointerUp}
                    onPointerLeave={handleFramePointerUp}
                  >
                    <div className="flex border-b border-border">
                      <span className="flex-1 p-0.5 border-r border-border text-foreground">
                        {getRollDisplay(frames, i, 0)}
                      </span>
                      <span className="flex-1 p-0.5 text-foreground">
                        {isStrike ? "" : getRollDisplay(frames, i, 1)}
                      </span>
                      {i === 9 && (
                        <span className="flex-1 p-0.5 border-l border-border text-foreground">
                          {needsThird || frame.roll3 !== null ? getRollDisplay(frames, i, 2) : ""}
                        </span>
                      )}
                    </div>
                    <div className="p-1 text-primary font-bold h-6 text-[10px]">
                      {cumuls[i] ?? ""}
                    </div>
                  </td>
                );
              })}
              <td className="border border-border p-1 text-center text-secondary font-bold text-sm align-middle">
                {cumuls[9] ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {gameComplete ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-primary font-bold text-lg">Game Complete! 🎳</p>
          <p className="text-sm text-muted-foreground">Final Score: {calculateScore(frames)}</p>
          <button type="button" onClick={resetGame}
            className="border border-border bg-muted text-foreground px-3 py-1 text-xs hover:opacity-80">
            [Reset]
          </button>
        </div>
      ) : (
        <div className="border border-border bg-card p-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className={`text-xs font-bold ${editingFrame !== null ? "text-secondary" : "text-primary"}`}>
                {frameLabel} — {rollLabel}
              </span>
              {editingFrame !== null && (
                <button type="button" onClick={cancelEdit}
                  className="ml-2 text-[10px] text-muted-foreground hover:text-foreground">[cancel]</button>
              )}
            </div>
            <button type="button" onClick={confirmRoll}
              className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 active:scale-95 transition-transform">
              [Confirm Roll →]
            </button>
          </div>

          {/* Spare suggestion tip */}
          {spareTip && (
            <div className="bg-secondary/10 border border-secondary/30 px-2 py-1 mb-2 text-[10px] text-secondary text-center">
              🎯 {spareTip}
            </div>
          )}

          {pinModeEnabled ? (
            <PinDeck
              standing={standing}
              hit={hit}
              onTogglePin={togglePin}
              spareSuggestions={spareSuggestions}
            />
          ) : (
            <div className="grid grid-cols-5 gap-2 py-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n} onClick={() => {
                  const newHit = noHits();
                  for(let i=0; i<n; i++) newHit[i] = true;
                  setHit(newHit);
                }} className="border border-border p-2 text-xs hover:bg-primary/10">
                  {n}
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Pins hit: <span className="text-primary font-bold">{hit.filter(Boolean).length}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2 text-[10px] text-muted-foreground">
        <span>X = Strike</span>
        <span>/ = Spare</span>
        <span>- = Gutter</span>
      </div>
    </div>
  );
};

export default PinModeInput;

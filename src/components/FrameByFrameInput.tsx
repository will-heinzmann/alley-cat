import { useState, useCallback, useRef, useEffect } from "react";

interface FrameData {
  roll1: number | null;
  roll2: number | null;
  roll3?: number | null;
}

interface FrameByFrameInputProps {
  onScoreChange: (totalScore: number, frames: FrameData[]) => void;
}

const calculateBowlingScore = (frames: FrameData[]): number => {
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

  let score = 0;
  let ri = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (ri >= rolls.length) break;
    if (frame === 9) {
      score += (rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
      break;
    }
    if (rolls[ri] === 10) {
      score += 10 + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
      ri += 1;
    } else if ((rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) === 10) {
      score += 10 + (rolls[ri + 2] ?? 0);
      ri += 2;
    } else {
      score += (rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0);
      ri += 2;
    }
  }
  return Math.min(300, score);
};

const initFrames = (): FrameData[] =>
  Array.from({ length: 10 }, (_, i) => ({
    roll1: null,
    roll2: null,
    ...(i === 9 ? { roll3: null } : {}),
  }));

const FrameByFrameInput = ({ onScoreChange }: FrameByFrameInputProps) => {
  const [frames, setFrames] = useState<FrameData[]>(initFrames);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getMaxPins = (frameIdx: number, rollIdx: number, currentFrames: FrameData[]): number => {
    const f = currentFrames[frameIdx];
    if (frameIdx === 9) {
      if (rollIdx === 0) return 10;
      if (rollIdx === 1) {
        return (f.roll1 === 10) ? 10 : 10 - (f.roll1 ?? 0);
      }
      // roll3
      if (f.roll2 === null) return 0;
      if (f.roll1 === 10 && f.roll2 === 10) return 10;
      if (f.roll1 === 10) return 10 - f.roll2;
      if ((f.roll1 ?? 0) + (f.roll2 ?? 0) === 10) return 10;
      return 0; // no 3rd roll if no spare/strike in 10th
    }
    if (rollIdx === 0) return 10;
    return 10 - (f.roll1 ?? 0);
  };

  const needsThirdRoll = (f: FrameData): boolean => {
    if (f.roll1 === null || f.roll2 === null) return false;
    return f.roll1 === 10 || (f.roll1 + f.roll2 >= 10);
  };

  const getRefIndex = (frameIdx: number, rollIdx: number): number => {
    let idx = 0;
    for (let i = 0; i < frameIdx; i++) idx += 2;
    idx += rollIdx;
    return idx;
  };

  const focusNext = useCallback((frameIdx: number, rollIdx: number, currentFrames: FrameData[]) => {
    const f = currentFrames[frameIdx];
    if (frameIdx < 9) {
      if (rollIdx === 0 && f.roll1 === 10) {
        // Strike — skip roll2, go to next frame
        const next = getRefIndex(frameIdx + 1, 0);
        inputRefs.current[next]?.focus();
      } else if (rollIdx === 0) {
        const next = getRefIndex(frameIdx, 1);
        inputRefs.current[next]?.focus();
      } else if (frameIdx < 9) {
        const next = getRefIndex(frameIdx + 1, 0);
        inputRefs.current[next]?.focus();
      }
    } else {
      // 10th frame
      if (rollIdx === 0) {
        const next = getRefIndex(9, 1);
        inputRefs.current[next]?.focus();
      } else if (rollIdx === 1 && needsThirdRoll({ ...f, roll2: f.roll2 })) {
        // focus 3rd roll — it's at index getRefIndex(9,2) which is 20
        inputRefs.current[20]?.focus();
      }
    }
  }, []);

  const handleChange = (frameIdx: number, rollIdx: number, value: string) => {
    const newFrames = frames.map((f, i) => (i === frameIdx ? { ...f } : { ...f }));
    const key = rollIdx === 0 ? "roll1" : rollIdx === 1 ? "roll2" : "roll3";

    if (value === "" || value === null) {
      (newFrames[frameIdx] as any)[key] = null;
    } else {
      const num = parseInt(value);
      if (isNaN(num)) return;
      const max = getMaxPins(frameIdx, rollIdx, newFrames);
      const clamped = Math.max(0, Math.min(max, num));
      (newFrames[frameIdx] as any)[key] = clamped;
    }

    // Auto-fill roll2 as null for strikes in frames 1-9
    if (frameIdx < 9 && rollIdx === 0 && newFrames[frameIdx].roll1 === 10) {
      newFrames[frameIdx].roll2 = null;
    }

    setFrames(newFrames);
    const total = calculateBowlingScore(newFrames);
    onScoreChange(total, newFrames);

    if (value !== "" && value !== null) {
      setTimeout(() => focusNext(frameIdx, rollIdx, newFrames), 50);
    }
  };

  const displayValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    return String(val);
  };

  const getRollDisplay = (frameIdx: number, rollIdx: number): string => {
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

  // Calculate running totals
  const getCumulatives = (): (number | null)[] => {
    const rolls: number[] = [];
    for (let i = 0; i < 10; i++) {
      const f = frames[i];
      rolls.push(f.roll1 ?? 0);
      if (i < 9) {
        if (f.roll1 !== 10) rolls.push(f.roll2 ?? 0);
      } else {
        rolls.push(f.roll2 ?? 0);
        if (f.roll3 !== undefined && f.roll3 !== null) rolls.push(f.roll3);
      }
    }

    const cumuls: (number | null)[] = [];
    let score = 0;
    let ri = 0;
    for (let frame = 0; frame < 10; frame++) {
      const f = frames[frame];
      if (f.roll1 === null) { cumuls.push(null); break; }
      if (frame === 9) {
        if (f.roll2 === null) { cumuls.push(null); break; }
        const needs3 = f.roll1 === 10 || f.roll1 + (f.roll2 ?? 0) >= 10;
        if (needs3 && f.roll3 === null) { cumuls.push(null); break; }
        score += (rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
        cumuls.push(score);
        break;
      }
      if (rolls[ri] === 10) {
        if (rolls[ri + 1] === undefined || rolls[ri + 2] === undefined) { cumuls.push(null); break; }
        // Check if next rolls are actually filled
        const nextFrame = frames[frame + 1];
        if (nextFrame.roll1 === null) { cumuls.push(null); break; }
        if (nextFrame.roll1 !== 10 && frame < 8 && nextFrame.roll2 === null) { cumuls.push(null); break; }
        score += 10 + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
        cumuls.push(score);
        ri += 1;
      } else {
        if (f.roll2 === null) { cumuls.push(null); break; }
        if ((rolls[ri] ?? 0) + (rolls[ri + 1] ?? 0) === 10) {
          // Spare — need next roll
          if (rolls[ri + 2] === undefined || frames[frame + 1]?.roll1 === null) { cumuls.push(null); break; }
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

  const inputClass = "w-7 h-7 text-center border border-border bg-input text-foreground text-xs outline-none p-0";

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs min-w-[380px] w-full">
        <thead>
          <tr>
            {Array.from({ length: 10 }).map((_, i) => (
              <th key={i} className="border border-border p-1 text-muted-foreground bg-muted w-[9%]">{i + 1}</th>
            ))}
            <th className="border border-border p-1 text-muted-foreground bg-muted">TOT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {frames.map((frame, i) => {
              const isStrike = i < 9 && frame.roll1 === 10;
              const show3rd = i === 9 && needsThirdRoll(frame);
              return (
                <td key={i} className="border border-border p-0 text-center align-top">
                  <div className="flex border-b border-border">
                    <div className="flex-1 border-r border-border">
                      <input
                        ref={el => { inputRefs.current[getRefIndex(i, 0)] = el; }}
                        type="number"
                        min="0"
                        max="10"
                        value={displayValue(frame.roll1)}
                        onChange={e => handleChange(i, 0, e.target.value)}
                        className={inputClass + " w-full"}
                        placeholder="·"
                      />
                    </div>
                    <div className="flex-1">
                      {isStrike ? (
                        <div className="h-7 flex items-center justify-center text-primary font-bold">X</div>
                      ) : (
                        <input
                          ref={el => { inputRefs.current[getRefIndex(i, 1)] = el; }}
                          type="number"
                          min="0"
                          max={getMaxPins(i, 1, frames)}
                          value={displayValue(frame.roll2)}
                          onChange={e => handleChange(i, 1, e.target.value)}
                          className={inputClass + " w-full"}
                          placeholder="·"
                          disabled={frame.roll1 === null}
                        />
                      )}
                    </div>
                    {i === 9 && (
                      <div className="flex-1 border-l border-border">
                        {show3rd || frame.roll3 !== null ? (
                          <input
                            ref={el => { inputRefs.current[20] = el; }}
                            type="number"
                            min="0"
                            max={getMaxPins(9, 2, frames)}
                            value={displayValue(frame.roll3)}
                            onChange={e => handleChange(9, 2, e.target.value)}
                            className={inputClass + " w-full"}
                            placeholder="·"
                          />
                        ) : (
                          <div className="h-7 bg-muted" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-1 text-primary font-bold h-6">
                    {cumuls[i] !== null && cumuls[i] !== undefined ? cumuls[i] : ""}
                  </div>
                </td>
              );
            })}
            <td className="border border-border p-1 text-center text-secondary font-bold text-sm align-middle">
              {cumuls[9] !== null && cumuls[9] !== undefined ? cumuls[9] : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
        <span>X = Strike</span>
        <span>/ = Spare</span>
        <span>- = Gutter</span>
        <span>Tap each box to enter pins</span>
      </div>
    </div>
  );
};

export default FrameByFrameInput;

import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PinDeck from "@/components/PinDeck";

interface FrameData {
  roll1: number | null;
  roll2: number | null;
  roll3?: number | null;
}

interface Player {
  name: string;
  isGuest: boolean;
  frames: FrameData[];
}

const allStanding = () => Array(10).fill(true);
const noHits = () => Array(10).fill(false);

const initFrames = (): FrameData[] =>
  Array.from({ length: 10 }, (_, i) => ({
    roll1: null, roll2: null, ...(i === 9 ? { roll3: null } : {}),
  }));

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

const getRollDisplay = (frames: FrameData[], fi: number, ri: number): string => {
  const f = frames[fi];
  const val = ri === 0 ? f.roll1 : ri === 1 ? f.roll2 : f.roll3;
  if (val === null || val === undefined) return "";
  if (val === 10 && (ri === 0 || fi === 9)) return "X";
  if (fi < 9 && ri === 1 && f.roll1 !== null && f.roll1 + val === 10) return "/";
  if (fi === 9) {
    if (ri === 1 && f.roll1 !== 10 && f.roll1 !== null && f.roll1 + val === 10) return "/";
    if (ri === 2) {
      if (val === 10) return "X";
      if (f.roll1 === 10 && f.roll2 !== null && f.roll2 !== 10 && f.roll2 + val === 10) return "/";
    }
  }
  if (val === 0) return "-";
  return String(val);
};

const getCumulatives = (frames: FrameData[]): (number | null)[] => {
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
      const nf = frames[frame + 1];
      if (!nf || nf.roll1 === null) break;
      if (nf.roll1 !== 10 && frame < 8 && nf.roll2 === null) break;
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

const isFrameComplete = (frames: FrameData[], frameIdx: number): boolean => {
  const f = frames[frameIdx];
  if (f.roll1 === null) return false;
  if (frameIdx < 9) return f.roll1 === 10 || f.roll2 !== null;
  // 10th frame
  if (f.roll2 === null) return false;
  const needs3 = f.roll1 === 10 || f.roll1 + (f.roll2 ?? 0) >= 10;
  if (needs3) return f.roll3 !== null;
  return true;
};

const getCurrentFrameIndex = (frames: FrameData[]): number => {
  for (let i = 0; i < 10; i++) {
    if (!isFrameComplete(frames, i)) return i;
  }
  return 10; // game complete
};

const LeagueNight = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Setup state
  const [phase, setPhase] = useState<"setup" | "playing" | "summary">("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  // Pin mode state for active player
  const [standing, setStanding] = useState<boolean[]>(allStanding);
  const [hit, setHit] = useState<boolean[]>(noHits);
  const [currentRoll, setCurrentRoll] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);

  // Alley selection
  const [alleys, setAlleys] = useState<any[]>([]);
  const [alleyId, setAlleyId] = useState("");
  const [alleySearch, setAlleySearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const scoreboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlleys = async () => {
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase.from("alleys").select("id, name, city, state").order("name").range(from, from + 999);
        if (!data || data.length === 0) break;
        all = [...all, ...data];
        if (data.length < 1000) break;
        from += 1000;
      }
      setAlleys(all);
    };
    fetchAlleys();
  }, []);

  const addPlayerSlot = () => {
    if (playerNames.length >= 6) return;
    setPlayerNames(prev => [...prev, ""]);
  };

  const removePlayerSlot = (idx: number) => {
    if (playerNames.length <= 2) return;
    setPlayerNames(prev => prev.filter((_, i) => i !== idx));
  };

  const startGame = () => {
    const names = playerNames.filter(n => n.trim());
    if (names.length < 2) {
      toast({ title: "Need at least 2 players" });
      return;
    }
    const newPlayers: Player[] = names.map((name, i) => ({
      name: name.trim(),
      isGuest: i > 0, // first player is the logged-in user
      frames: initFrames(),
    }));
    setPlayers(newPlayers);
    setActivePlayerIdx(0);
    setPhase("playing");
    openPinSelector(newPlayers, 0);
  };

  const openPinSelector = (ps: Player[], playerIdx: number) => {
    const frameIdx = getCurrentFrameIndex(ps[playerIdx].frames);
    if (frameIdx >= 10) return;
    const f = ps[playerIdx].frames[frameIdx];

    if (frameIdx < 9) {
      if (f.roll1 === null) {
        setStanding(allStanding());
        setCurrentRoll(0);
      } else {
        // Roll 2 — only standing pins remain
        const remaining = allStanding().map((_, i) => true); // We need to track what was hit in roll 1
        // Actually we need to figure out which pins are still up
        // Since roll1 = pinsHit count, we don't know exact pins. For pin mode we track at confirm time.
        // This function is called fresh, so standing should already be set
        setCurrentRoll(1);
      }
    } else {
      // 10th frame
      if (f.roll1 === null) {
        setStanding(allStanding());
        setCurrentRoll(0);
      } else if (f.roll2 === null) {
        setCurrentRoll(1);
        // standing already set from previous confirm
      } else {
        setCurrentRoll(2);
      }
    }
    setHit(noHits());
    setShowPinModal(true);
  };

  const confirmRoll = () => {
    const pinsHit = hit.filter(Boolean).length;
    const newPlayers = players.map(p => ({ ...p, frames: p.frames.map(f => ({ ...f })) }));
    const player = newPlayers[activePlayerIdx];
    const frameIdx = getCurrentFrameIndex(player.frames);
    if (frameIdx >= 10) return;

    const f = player.frames[frameIdx];

    if (frameIdx < 9) {
      if (currentRoll === 0) {
        f.roll1 = pinsHit;
        if (pinsHit === 10) {
          f.roll2 = null;
          setPlayers(newPlayers);
          advanceToNextPlayer(newPlayers);
          return;
        }
        const newStanding = standing.map((s, i) => s && !hit[i]);
        setStanding(newStanding);
        setHit(noHits());
        setCurrentRoll(1);
        setPlayers(newPlayers);
      } else {
        f.roll2 = pinsHit;
        setPlayers(newPlayers);
        advanceToNextPlayer(newPlayers);
        return;
      }
    } else {
      // 10th frame
      if (currentRoll === 0) {
        f.roll1 = pinsHit;
        setPlayers(newPlayers);
        if (pinsHit === 10) {
          setStanding(allStanding());
        } else {
          const ns = standing.map((s, i) => s && !hit[i]);
          setStanding(ns);
        }
        setHit(noHits());
        setCurrentRoll(1);
      } else if (currentRoll === 1) {
        f.roll2 = pinsHit;
        setPlayers(newPlayers);
        const r1 = f.roll1 ?? 0;
        const needs3 = r1 === 10 || r1 + pinsHit >= 10;
        if (needs3) {
          if (r1 === 10 && pinsHit === 10) {
            setStanding(allStanding());
          } else if (r1 === 10) {
            const ns = standing.map((s, i) => s && !hit[i]);
            setStanding(ns);
          } else {
            setStanding(allStanding());
          }
          setHit(noHits());
          setCurrentRoll(2);
        } else {
          advanceToNextPlayer(newPlayers);
          return;
        }
      } else {
        f.roll3 = pinsHit;
        setPlayers(newPlayers);
        advanceToNextPlayer(newPlayers);
        return;
      }
    }
  };

  const advanceToNextPlayer = (ps: Player[]) => {
    setShowPinModal(false);
    // Check if all players are done
    const allDone = ps.every(p => getCurrentFrameIndex(p.frames) >= 10);
    if (allDone) {
      setPlayers(ps);
      setPhase("summary");
      return;
    }

    // Find next player who still has frames to play
    let nextIdx = (activePlayerIdx + 1) % ps.length;
    let attempts = 0;
    while (getCurrentFrameIndex(ps[nextIdx].frames) >= 10 && attempts < ps.length) {
      nextIdx = (nextIdx + 1) % ps.length;
      attempts++;
    }
    setActivePlayerIdx(nextIdx);
    setStanding(allStanding());
    setHit(noHits());
    setCurrentRoll(0);
    // Auto-open pin selector after brief delay
    setTimeout(() => openPinSelector(ps, nextIdx), 200);
  };

  const handleSaveLoggedUserScore = async () => {
    if (!user || !alleyId) {
      toast({ title: "Please select an alley" });
      return;
    }
    setSaving(true);
    const myScore = calculateScore(players[0].frames);
    const { error } = await supabase.from("games").insert({
      user_id: user.id,
      alley_id: alleyId,
      score: myScore,
      date,
      oil_condition: "House",
      notes: `League Night with ${players.slice(1).map(p => p.name).join(", ")}`,
    });
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Game saved!", description: "+50 AlleyPoints" });
    }
    setSaving(false);
  };

  const handleShareResults = async () => {
    // Generate a text-based shareable summary
    const lines = players.map(p => `${p.name}: ${calculateScore(p.frames)}`).join("\n");
    const text = `🎳 Alley Cat League Night!\n\n${lines}\n\nTrack your games at alley-cat.lovable.app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Alley Cat League Night", text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pb-20 p-4">
        <header className="border-b border-border pb-4 mb-4">
          <Link to="/" className="text-primary text-xs">← Back</Link>
          <h1 className="text-lg text-primary mt-1">🏆 League Night</h1>
        </header>
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Sign in to track League Night scores</p>
          <Link to="/auth" className="border border-border bg-primary text-primary-foreground px-4 py-2 text-xs hover:opacity-80">
            [Sign In]
          </Link>
        </div>
      </div>
    );
  }

  // SETUP PHASE
  if (phase === "setup") {
    return (
      <div className="min-h-screen pb-20 p-4">
        <header className="border-b border-border pb-4 mb-4">
          <Link to="/" className="text-primary text-xs">← Back</Link>
          <h1 className="text-lg text-primary mt-1">🏆 League Night</h1>
          <p className="text-xs text-muted-foreground">Track scores for your whole group</p>
        </header>

        <div className="space-y-3">
          <h2 className="text-sm text-primary font-bold">Players</h2>
          {playerNames.map((name, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={name}
                onChange={e => {
                  const next = [...playerNames];
                  next[i] = e.target.value;
                  setPlayerNames(next);
                }}
                placeholder={i === 0 ? "You (your name)" : `Guest ${i}`}
                className="flex-1 border border-border bg-input px-2 py-1.5 text-foreground text-sm outline-none"
              />
              {i === 0 && <span className="text-[10px] text-primary">★</span>}
              {playerNames.length > 2 && i > 0 && (
                <button type="button" onClick={() => removePlayerSlot(i)}
                  className="text-destructive text-xs hover:opacity-80">[×]</button>
              )}
            </div>
          ))}
          {playerNames.length < 6 && (
            <button type="button" onClick={addPlayerSlot}
              className="text-xs text-primary hover:underline">[+ Add Player]</button>
          )}

          <div className="border-t border-border pt-3 mt-3">
            <p className="text-[10px] text-muted-foreground mb-2">★ = Your score will be saved to your profile. Guest scores are for display only.</p>
            <button type="button" onClick={startGame}
              className="w-full border border-border bg-primary text-primary-foreground py-2 text-xs hover:opacity-80">
              [Start League Night →]
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUMMARY PHASE
  if (phase === "summary") {
    const sorted = [...players].sort((a, b) => calculateScore(b.frames) - calculateScore(a.frames));
    return (
      <div className="min-h-screen pb-20 p-4">
        <header className="border-b border-border pb-4 mb-4">
          <h1 className="text-lg text-primary">🏆 League Night Results</h1>
        </header>

        <div ref={scoreboardRef} className="space-y-2 mb-4">
          {sorted.map((player, rank) => {
            const score = calculateScore(player.frames);
            const cumuls = getCumulatives(player.frames);
            return (
              <div key={rank} className="border border-border bg-card overflow-x-auto">
                <div className={`px-2 py-1 border-b border-border flex justify-between items-center ${
                  rank === 0 ? "bg-primary/10" : "bg-muted"
                }`}>
                  <span className="text-xs font-bold text-primary">
                    {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`} {player.name}
                    {player.isGuest && <span className="text-muted-foreground"> (guest)</span>}
                  </span>
                  <span className="text-sm font-bold text-secondary">{score}</span>
                </div>
                <table className="w-full border-collapse text-xs min-w-[360px]">
                  <tbody>
                    <tr>
                      {player.frames.map((_, fi) => {
                        const isStrike = fi < 9 && player.frames[fi].roll1 === 10;
                        const f10 = player.frames[fi];
                        const needs3 = fi === 9 && f10.roll1 !== null && f10.roll2 !== null &&
                          (f10.roll1 === 10 || f10.roll1 + (f10.roll2 ?? 0) >= 10);
                        return (
                          <td key={fi} className="border border-border p-0 text-center">
                            <div className="flex border-b border-border">
                              <span className="flex-1 p-0.5 border-r border-border text-foreground">
                                {getRollDisplay(player.frames, fi, 0)}
                              </span>
                              <span className="flex-1 p-0.5 text-foreground">
                                {isStrike ? "" : getRollDisplay(player.frames, fi, 1)}
                              </span>
                              {fi === 9 && (
                                <span className="flex-1 p-0.5 border-l border-border text-foreground">
                                  {needs3 || f10.roll3 !== null ? getRollDisplay(player.frames, fi, 2) : ""}
                                </span>
                              )}
                            </div>
                            <div className="p-0.5 text-primary font-bold text-[10px]">
                              {cumuls[fi] ?? ""}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-border p-1 text-center text-secondary font-bold">{score}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Save & Share */}
        <div className="space-y-2">
          <div className="relative">
            <label className="text-xs text-muted-foreground block mb-1">Alley (to save your score):</label>
            <input
              type="text" placeholder="Search alleys..." value={alleySearch}
              onChange={e => { setAlleySearch(e.target.value); setAlleyId(""); }}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none"
            />
            {alleyId && <p className="text-xs text-primary mt-1">✓ {alleys.find(a => a.id === alleyId)?.name}</p>}
            {alleySearch && !alleyId && (
              <div className="absolute z-10 w-full border border-border bg-card max-h-32 overflow-y-auto">
                {alleys.filter(a => `${a.name} ${a.city}`.toLowerCase().includes(alleySearch.toLowerCase())).slice(0, 20).map(a => (
                  <button key={a.id} type="button" onClick={() => { setAlleyId(a.id); setAlleySearch(a.name); }}
                    className="w-full text-left px-2 py-1 text-xs text-foreground hover:bg-muted border-b border-border last:border-0">
                    {a.name} — {a.city}, {a.state}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveLoggedUserScore} disabled={saving || !alleyId}
              className="flex-1 border border-border bg-primary text-primary-foreground py-1.5 text-xs hover:opacity-80 disabled:opacity-50">
              {saving ? "Saving..." : "[Save My Score]"}
            </button>
            <button onClick={handleShareResults}
              className="flex-1 border border-border bg-secondary text-secondary-foreground py-1.5 text-xs hover:opacity-80">
              [Share Results]
            </button>
          </div>
          <button onClick={() => { setPhase("setup"); setPlayers([]); }}
            className="w-full border border-border bg-muted text-foreground py-1.5 text-xs hover:opacity-80">
            [New Game]
          </button>
        </div>
      </div>
    );
  }

  // PLAYING PHASE
  const activePlayer = players[activePlayerIdx];
  const activeFrameIdx = getCurrentFrameIndex(activePlayer.frames);
  const frameLabel = activeFrameIdx < 9 ? `Frame ${activeFrameIdx + 1}` : "10th Frame";
  const rollLabel = currentRoll === 0 ? "Roll 1" : currentRoll === 1 ? "Roll 2" : "Roll 3";

  return (
    <div className="min-h-screen pb-20 p-2">
      <header className="border-b border-border pb-2 mb-2">
        <h1 className="text-sm text-primary font-bold">🏆 League Night</h1>
      </header>

      {/* Horizontal scoreboard for all players */}
      <div className="space-y-1 mb-3 overflow-x-auto">
        {players.map((player, pIdx) => {
          const isActive = pIdx === activePlayerIdx;
          const cumuls = getCumulatives(player.frames);
          const done = getCurrentFrameIndex(player.frames) >= 10;
          return (
            <div key={pIdx} className={`border ${isActive ? "border-primary" : "border-border"} bg-card`}>
              <div className={`px-2 py-0.5 border-b border-border flex justify-between ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {isActive && "▶ "}{player.name}{done && " ✓"}
                </span>
                <span className="text-[10px] text-secondary font-bold">{calculateScore(player.frames)}</span>
              </div>
              <div className="flex overflow-x-auto">
                {player.frames.map((_, fi) => {
                  const isStrike = fi < 9 && player.frames[fi].roll1 === 10;
                  return (
                    <div key={fi} className="flex-shrink-0 border-r border-border last:border-0 text-center" style={{ minWidth: "32px" }}>
                      <div className="flex border-b border-border text-[9px]">
                        <span className="flex-1 p-px border-r border-border text-foreground">
                          {getRollDisplay(player.frames, fi, 0)}
                        </span>
                        <span className="flex-1 p-px text-foreground">
                          {isStrike ? "" : getRollDisplay(player.frames, fi, 1)}
                        </span>
                        {fi === 9 && (
                          <span className="flex-1 p-px border-l border-border text-foreground">
                            {getRollDisplay(player.frames, fi, 2)}
                          </span>
                        )}
                      </div>
                      <div className="p-px text-primary font-bold text-[9px]">
                        {cumuls[fi] ?? ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pin selector for active player */}
      {showPinModal && activeFrameIdx < 10 && (
        <div className="border border-primary bg-card p-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xs text-primary font-bold">{activePlayer.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{frameLabel} — {rollLabel}</span>
            </div>
            <button type="button" onClick={confirmRoll}
              className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 active:scale-95 transition-transform">
              [Confirm →]
            </button>
          </div>
          <PinDeck standing={standing} hit={hit} onTogglePin={(i) => {
            setHit(prev => {
              const next = [...prev];
              next[i] = !next[i];
              return next;
            });
          }} />
          <p className="text-center text-xs text-muted-foreground">
            Pins hit: <span className="text-primary font-bold">{hit.filter(Boolean).length}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default LeagueNight;

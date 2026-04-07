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

interface PastGame {
  id: string;
  date: string;
  alley_name: string | null;
  players: { player_name: string; is_guest: boolean; score: number }[];
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
  if (f.roll2 === null) return false;
  const needs3 = f.roll1 === 10 || f.roll1 + (f.roll2 ?? 0) >= 10;
  if (needs3) return f.roll3 !== null;
  return true;
};

const getCurrentFrameIndex = (frames: FrameData[]): number => {
  for (let i = 0; i < 10; i++) {
    if (!isFrameComplete(frames, i)) return i;
  }
  return 10;
};

const GroupPlay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"setup" | "playing" | "summary">("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  const [standing, setStanding] = useState<boolean[]>(allStanding);
  const [hit, setHit] = useState<boolean[]>(noHits);
  const [currentRoll, setCurrentRoll] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [scoringMode, setScoringMode] = useState<"frame" | "pin">("frame");
  const [frameInput, setFrameInput] = useState("");

  const [alleys, setAlleys] = useState<any[]>([]);
  const [alleyId, setAlleyId] = useState("");
  const [alleySearch, setAlleySearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  // Past games
  const [pastGames, setPastGames] = useState<PastGame[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  const scoreboardRef = useRef<HTMLDivElement>(null);

  const fetchPastGames = async () => {
    if (!user) { setLoadingPast(false); return; }
    setLoadingPast(true);
    const { data: games } = await supabase
      .from("group_games")
      .select("id, date, alley_id, alleys(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!games || games.length === 0) { setPastGames([]); setLoadingPast(false); return; }

    const gameIds = games.map(g => g.id);
    const { data: playerRows } = await supabase
      .from("group_game_players")
      .select("group_game_id, player_name, is_guest, score")
      .in("group_game_id", gameIds);

    const mapped: PastGame[] = games.map(g => ({
      id: g.id,
      date: g.date,
      alley_name: (Array.isArray(g.alleys) ? (g.alleys as any)[0]?.name : (g.alleys as any)?.name) ?? null,
      players: (playerRows ?? []).filter(p => p.group_game_id === g.id).sort((a, b) => b.score - a.score),
    }));
    setPastGames(mapped);
    setLoadingPast(false);
  };

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
    fetchPastGames();
  }, [user]);

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
      isGuest: i > 0,
      frames: initFrames(),
    }));
    setPlayers(newPlayers);
    setActivePlayerIdx(0);
    setPhase("playing");
    if (scoringMode === "pin") {
      openPinSelector(newPlayers, 0);
    } else {
      setShowPinModal(true);
      setFrameInput("");
    }
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
        setCurrentRoll(1);
      }
    } else {
      if (f.roll1 === null) {
        setStanding(allStanding());
        setCurrentRoll(0);
      } else if (f.roll2 === null) {
        setCurrentRoll(1);
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

  const confirmFrameInput = () => {
    const value = parseInt(frameInput);
    if (isNaN(value) || value < 0) return;
    const newPlayers = players.map(p => ({ ...p, frames: p.frames.map(f => ({ ...f })) }));
    const player = newPlayers[activePlayerIdx];
    const frameIdx = getCurrentFrameIndex(player.frames);
    if (frameIdx >= 10) return;
    const f = player.frames[frameIdx];

    if (frameIdx < 9) {
      if (f.roll1 === null) {
        if (value > 10) return;
        f.roll1 = value;
        if (value === 10) {
          f.roll2 = null;
          setPlayers(newPlayers);
          setFrameInput("");
          advanceToNextPlayer(newPlayers);
        } else {
          setPlayers(newPlayers);
          setFrameInput("");
          setCurrentRoll(1);
        }
      } else {
        const maxPins = 10 - (f.roll1 ?? 0);
        if (value > maxPins) return;
        f.roll2 = value;
        setPlayers(newPlayers);
        setFrameInput("");
        advanceToNextPlayer(newPlayers);
      }
    } else {
      if (f.roll1 === null) {
        if (value > 10) return;
        f.roll1 = value;
        setPlayers(newPlayers);
        setFrameInput("");
        setCurrentRoll(1);
      } else if (f.roll2 === null) {
        const r1 = f.roll1 ?? 0;
        const max2 = r1 === 10 ? 10 : 10 - r1;
        if (value > max2) return;
        f.roll2 = value;
        setPlayers(newPlayers);
        setFrameInput("");
        const needs3 = r1 === 10 || r1 + value >= 10;
        if (needs3) {
          setCurrentRoll(2);
        } else {
          advanceToNextPlayer(newPlayers);
        }
      } else {
        if (value > 10) return;
        f.roll3 = value;
        setPlayers(newPlayers);
        setFrameInput("");
        advanceToNextPlayer(newPlayers);
      }
    }
  };

  const advanceToNextPlayer = (ps: Player[]) => {
    setShowPinModal(false);
    const allDone = ps.every(p => getCurrentFrameIndex(p.frames) >= 10);
    if (allDone) {
      setPlayers(ps);
      setPhase("summary");
      return;
    }

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
    setFrameInput("");
    if (scoringMode === "pin") {
      setTimeout(() => openPinSelector(ps, nextIdx), 200);
    } else {
      setShowPinModal(true);
    }
  };

  const handleSaveGroupGame = async () => {
    if (!user || !alleyId) {
      toast({ title: "Please select an alley" });
      return;
    }
    setSaving(true);

    // Save the logged-in user's score to games table too
    const myScore = calculateScore(players[0].frames);
    const { error: gameErr } = await supabase.from("games").insert({
      user_id: user.id,
      alley_id: alleyId,
      score: myScore,
      date,
      oil_condition: "House",
      notes: `Group Play with ${players.slice(1).map(p => p.name).join(", ")}`,
    });

    // Save group game record
    const { data: groupGame, error: ggErr } = await supabase.from("group_games").insert({
      user_id: user.id,
      alley_id: alleyId,
      date,
    }).select("id").single();

    if (ggErr || !groupGame) {
      toast({ title: "Error saving group game", description: ggErr?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Save all player scores
    const playerInserts = players.map(p => ({
      group_game_id: groupGame.id,
      player_name: p.name,
      is_guest: p.isGuest,
      score: calculateScore(p.frames),
    }));

    const { error: pErr } = await supabase.from("group_game_players").insert(playerInserts);

    if (gameErr || pErr) {
      toast({ title: "Partially saved", description: "Some data may not have saved", variant: "destructive" });
    } else {
      toast({ title: "Group game saved!", description: "+50 AlleyPoints for your score" });
    }
    setSaving(false);
    fetchPastGames();
  };

  const handleShareResults = async () => {
    const lines = players.map(p => `${p.name}: ${calculateScore(p.frames)}`).join("\n");
    const text = `🎳 Alley Cat Group Play!\n\n${lines}\n\nTrack your games at alley-cat.lovable.app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Alley Cat Group Play", text });
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
          <h1 className="text-lg text-primary mt-1">🏆 Group Play</h1>
        </header>
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Sign in to track Group Play scores</p>
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
          <h1 className="text-lg text-primary mt-1">🏆 Group Play</h1>
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
            <div className="mb-2">
              <p className="text-[10px] text-muted-foreground mb-1">Scoring Mode:</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => setScoringMode("frame")}
                  className={`text-xs px-2 py-1 border ${scoringMode === "frame" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  [Frame-by-Frame]
                </button>
                <button type="button" onClick={() => setScoringMode("pin")}
                  className={`text-xs px-2 py-1 border ${scoringMode === "pin" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  [Pin Mode 🎳]
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">★ = Your score will be saved to your profile. Guest scores are for display only.</p>
            <button type="button" onClick={startGame}
              className="w-full border border-border bg-primary text-primary-foreground py-2 text-xs hover:opacity-80">
              [Start Group Play →]
            </button>
          </div>
        </div>

        {/* Past Group Games */}
        <div className="mt-6 border-t border-border pt-4">
          <h2 className="text-sm text-primary font-bold mb-2">Past Group Games</h2>
          {loadingPast ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : pastGames.length === 0 ? (
            <p className="text-xs text-muted-foreground">No group games yet. Start one above!</p>
          ) : (
            <div className="space-y-2">
              {pastGames.map(game => (
                <div key={game.id} className="border border-border bg-card p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{game.date}</span>
                    {game.alley_name && <span className="text-xs text-primary">{game.alley_name}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {game.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-foreground">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}{" "}
                          {p.player_name}
                          {p.is_guest && <span className="text-muted-foreground"> (guest)</span>}
                        </span>
                        <span className="text-secondary font-bold">{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <h1 className="text-lg text-primary">🏆 Group Play Results</h1>
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
            <label className="text-xs text-muted-foreground block mb-1">Alley (to save scores):</label>
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
            <button onClick={handleSaveGroupGame} disabled={saving || !alleyId}
              className="flex-1 border border-border bg-primary text-primary-foreground py-1.5 text-xs hover:opacity-80 disabled:opacity-50">
              {saving ? "Saving..." : "[Save Group Game]"}
            </button>
            <button onClick={handleShareResults}
              className="flex-1 border border-border bg-secondary text-secondary-foreground py-1.5 text-xs hover:opacity-80">
              [Share Results]
            </button>
          </div>
          <button onClick={() => { setPhase("setup"); setPlayers([]); fetchPastGames(); }}
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
        <h1 className="text-sm text-primary font-bold">🏆 Group Play</h1>
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

      {/* Scoring input for active player */}
      {showPinModal && activeFrameIdx < 10 && (
        <div className="border border-primary bg-card p-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xs text-primary font-bold">{activePlayer.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{frameLabel} — {rollLabel}</span>
            </div>
            {scoringMode === "pin" ? (
              <button type="button" onClick={confirmRoll}
                className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 active:scale-95 transition-transform">
                [Confirm →]
              </button>
            ) : (
              <button type="button" onClick={confirmFrameInput}
                className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 active:scale-95 transition-transform">
                [Enter →]
              </button>
            )}
          </div>
          {scoringMode === "pin" ? (
            <>
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
            </>
          ) : (
            <div className="text-center">
              <input
                type="number"
                min="0"
                max="10"
                value={frameInput}
                onChange={(e) => setFrameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmFrameInput(); } }}
                className="border border-border bg-input px-3 py-2 text-foreground text-lg text-center outline-none w-24"
                placeholder="0-10"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Enter pins knocked down</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupPlay;

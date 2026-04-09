import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isOnline, onConnectivityChange, addToOfflineQueue, syncOfflineGames, getOfflineQueue, type OfflineGame } from "@/lib/offlineSync";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import FrameByFrameInput from "@/components/FrameByFrameInput";
import PinModeInput from "@/components/PinModeInput";
import SeriesSummary from "@/components/SeriesSummary";

interface FrameData {
  roll1: number | null;
  roll2: number | null;
  roll3?: number | null;
}

interface FrameScore {
  roll1: string;
  roll2: string;
  roll3?: string;
  cumulative: number;
}

const frameDataToDisplay = (frameData: FrameData[]): FrameScore[] => {
  const rolls: number[] = [];
  for (let i = 0; i < 10; i++) {
    const f = frameData[i];
    if (!f) break;
    rolls.push(f.roll1 ?? 0);
    if (i < 9) {
      if (f.roll1 !== 10) rolls.push(f.roll2 ?? 0);
    } else {
      rolls.push(f.roll2 ?? 0);
      if (f.roll3 !== undefined && f.roll3 !== null) rolls.push(f.roll3);
    }
  }

  const frames: FrameScore[] = [];
  let cumulative = 0;
  let ri = 0;
  let pendingCumulative = false;

  for (let i = 0; i < 10; i++) {
    const f = frameData[i];
    if (!f || f.roll1 === null) break;
    const r1 = f.roll1 ?? 0;
    const r2 = f.roll2 ?? 0;

    if (i < 9) {
      if (r1 === 10) {
        const nextF = frameData[i + 1];
        const hasBonusRolls = nextF && nextF.roll1 !== null &&
          (nextF.roll1 === 10 ? (i + 2 < 10 ? frameData[i + 2]?.roll1 !== null : nextF.roll2 !== null) : nextF.roll2 !== null);
        if (hasBonusRolls && !pendingCumulative) {
          cumulative += 10 + (rolls[ri + 1] ?? 0) + (rolls[ri + 2] ?? 0);
          frames.push({ roll1: "X", roll2: "", cumulative });
        } else {
          pendingCumulative = true;
          frames.push({ roll1: "X", roll2: "", cumulative: 0 });
        }
        ri += 1;
      } else if (f.roll2 === null) {
        frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: "", cumulative: 0 });
        pendingCumulative = true;
        ri += 1;
      } else if (r1 + r2 === 10) {
        const nextF = frameData[i + 1];
        const hasBonusRoll = nextF && nextF.roll1 !== null;
        if (hasBonusRoll && !pendingCumulative) {
          cumulative += 10 + (rolls[ri + 2] ?? 0);
          frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: "/", cumulative });
        } else {
          pendingCumulative = true;
          frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: "/", cumulative: 0 });
        }
        ri += 2;
      } else {
        if (!pendingCumulative) {
          cumulative += r1 + r2;
          frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: r2 === 0 ? "-" : String(r2), cumulative });
        } else {
          frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: r2 === 0 ? "-" : String(r2), cumulative: 0 });
        }
        ri += 2;
      }
    } else {
      const r3 = f.roll3 ?? 0;
      const needs3 = r1 === 10 || r1 + r2 >= 10;
      const isComplete = f.roll2 !== null && (!needs3 || f.roll3 !== null);
      let d1 = r1 === 10 ? "X" : r1 === 0 ? "-" : String(r1);
      let d2: string;
      if (r1 === 10) { d2 = f.roll2 === null ? "" : r2 === 10 ? "X" : r2 === 0 ? "-" : String(r2); }
      else { d2 = f.roll2 === null ? "" : r1 + r2 === 10 ? "/" : r2 === 0 ? "-" : String(r2); }
      let d3 = "";
      if (needs3 && f.roll3 !== null) {
        if (r1 === 10 && r2 === 10) d3 = r3 === 10 ? "X" : r3 === 0 ? "-" : String(r3);
        else if (r1 === 10) d3 = r2 + r3 === 10 ? "/" : r3 === 0 ? "-" : String(r3);
        else d3 = r3 === 10 ? "X" : r3 === 0 ? "-" : String(r3);
      }
      if (isComplete && !pendingCumulative) {
        cumulative += r1 + r2 + r3;
        frames.push({ roll1: d1, roll2: d2, roll3: d3, cumulative });
      } else {
        frames.push({ roll1: d1, roll2: d2, roll3: d3, cumulative: 0 });
      }
      ri += 3;
    }
  }

  if (pendingCumulative && frames.length === 10) {
    let cum = 0; let rIdx = 0; let allResolved = true;
    for (let i = 0; i < 10; i++) {
      const f = frameData[i];
      if (!f || f.roll1 === null) { allResolved = false; break; }
      const r1 = f.roll1 ?? 0; const r2 = f.roll2 ?? 0;
      if (i < 9) {
        if (r1 === 10) {
          if (rolls[rIdx + 1] === undefined || rolls[rIdx + 2] === undefined) { allResolved = false; break; }
          cum += 10 + (rolls[rIdx + 1] ?? 0) + (rolls[rIdx + 2] ?? 0); frames[i].cumulative = cum; rIdx += 1;
        } else if (f.roll2 === null) { allResolved = false; break; }
        else if (r1 + r2 === 10) {
          if (rolls[rIdx + 2] === undefined) { allResolved = false; break; }
          cum += 10 + (rolls[rIdx + 2] ?? 0); frames[i].cumulative = cum; rIdx += 2;
        } else { cum += r1 + r2; frames[i].cumulative = cum; rIdx += 2; }
      } else { cum += r1 + r2 + (f.roll3 ?? 0); frames[i].cumulative = cum; }
    }
    if (!allResolved) frames.forEach(f => f.cumulative = 0);
  }
  return frames;
};

const generateFallbackFrames = (totalScore: number): FrameScore[] => {
  const frames: FrameScore[] = [];
  let cumulative = 0;
  const avg = totalScore / 10;
  for (let i = 0; i < 10; i++) {
    const pins = i < 9 ? Math.round(avg) : totalScore - cumulative;
    cumulative += Math.max(0, Math.min(10, pins));
    frames.push({ roll1: String(Math.max(0, Math.min(10, pins))), roll2: "-", cumulative: Math.min(cumulative, totalScore) });
  }
  if (frames.length > 0) frames[frames.length - 1].cumulative = totalScore;
  return frames;
};

const ScoreDisplay = ({ playerName, score, gameId, frameData, hideHeader }: { playerName: string; score: number; gameId: string; frameData?: FrameData[] | null; hideHeader?: boolean }) => {
  const frames = frameData && frameData.length === 10 ? frameDataToDisplay(frameData) : generateFallbackFrames(score);
  return (
    <div className="border border-border bg-card overflow-x-auto">
      {!hideHeader && (
        <div className="bg-muted px-2 py-1 border-b border-border">
          <span className="text-xs text-primary font-bold">{playerName}</span>
        </div>
      )}
      <table className="w-full border-collapse text-xs min-w-[360px]">
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
            {frames.map((frame, i) => (
              <td key={i} className="border border-border p-0 text-center">
                <div className="flex border-b border-border">
                  <span className="flex-1 p-0.5 border-r border-border text-foreground">{frame.roll1}</span>
                  <span className="flex-1 p-0.5 text-foreground">{frame.roll2}</span>
                  {i === 9 && <span className="flex-1 p-0.5 border-l border-border text-foreground">{frame.roll3 || ""}</span>}
                </div>
                <div className="p-1 text-primary font-bold">{frame.cumulative > 0 ? frame.cumulative : ""}</div>
              </td>
            ))}
            <td className="border border-border p-1 text-center text-secondary font-bold text-sm">{score}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const DRAFT_KEY = "alleycat_session_draft";

type SessionType = "practice" | "league" | "tournament";

interface SessionDraft {
  sessionType: SessionType;
  totalGames: number;
  currentGameNumber: number;
  sessionId: string;
  alleyId: string;
  alleySearch: string;
  date: string;
  oil: string;
  entryMode: "total" | "frame" | "pin";
  // Per-game data
  score: string;
  notes: string;
  frameScore: number;
  currentFrameData: FrameData[] | null;
  // Completed games in this session
  completedGames: Array<{ score: number; gameNumber: number; frameData: FrameData[] | null }>;
  phase: "setup" | "bowling" | "done";
  savedAt: number;
}

const saveDraft = (draft: Partial<SessionDraft>) => {
  try {
    const existing = loadDraft();
    const merged = { ...existing, ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(merged));
  } catch {}
};

const loadDraft = (): SessionDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SessionDraft;
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch { return null; }
};

const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); };

const ScoreLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [alleys, setAlleys] = useState<any[]>([]);
  const [searchParams] = useSearchParams();

  const draft = loadDraft();

  // Session state
  const [phase, setPhase] = useState<"idle" | "setup" | "bowling" | "done">(
    draft?.phase === "bowling" ? "bowling" : draft?.phase === "setup" ? "setup" : "idle"
  );
  const [sessionType, setSessionType] = useState<SessionType>(draft?.sessionType ?? "practice");
  const [totalGames, setTotalGames] = useState(draft?.totalGames ?? 3);
  const [currentGameNumber, setCurrentGameNumber] = useState(draft?.currentGameNumber ?? 1);
  const [sessionId, setSessionId] = useState(draft?.sessionId ?? "");
  const [completedGames, setCompletedGames] = useState<Array<{ score: number; gameNumber: number; frameData: FrameData[] | null }>>(draft?.completedGames ?? []);

  // Per-game state
  const [score, setScore] = useState(draft?.score ?? "");
  const [alleyId, setAlleyId] = useState(draft?.alleyId ?? "");
  const [useCustomAlley, setUseCustomAlley] = useState(false);
  const [customAlleyName, setCustomAlleyName] = useState("");
  const [date, setDate] = useState(draft?.date ?? new Date().toISOString().split("T")[0]);
  const [oil, setOil] = useState(draft?.oil ?? "House");
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [entryMode, setEntryMode] = useState<"total" | "frame" | "pin">(draft?.entryMode ?? "total");
  const [frameScore, setFrameScore] = useState<number>(draft?.frameScore ?? 0);
  const [currentFrameData, setCurrentFrameData] = useState<FrameData[] | null>(draft?.currentFrameData ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [alleySearch, setAlleySearch] = useState(draft?.alleySearch ?? "");
  const [saving, setSaving] = useState(false);

  const [selectedGame, setSelectedGame] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(getOfflineQueue().length);

  // Auto-save draft
  useEffect(() => {
    if (phase === "setup" || phase === "bowling") {
      saveDraft({
        sessionType, totalGames, currentGameNumber, sessionId,
        alleyId, alleySearch, date, oil, entryMode,
        score, notes, frameScore, currentFrameData,
        completedGames,
        phase: phase as "setup" | "bowling",
      });
    }
  }, [phase, sessionType, totalGames, currentGameNumber, sessionId, alleyId, alleySearch, date, oil, entryMode, score, notes, frameScore, currentFrameData, completedGames]);

  // Pre-select alley from query param
  useEffect(() => {
    const alleyParam = searchParams.get("alley");
    if (alleyParam) {
      setAlleyId(alleyParam);
      setPhase("setup");
    }
  }, [searchParams]);

  useEffect(() => {
    const cleanup = onConnectivityChange(async (isNowOnline) => {
      setOnline(isNowOnline);
      if (isNowOnline && user) {
        const { synced } = await syncOfflineGames(async (game) => supabase.from("games").insert(game));
        if (synced > 0) { toast({ title: `Synced ${synced} offline game${synced > 1 ? "s" : ""}!` }); fetchData(); }
        setPendingCount(getOfflineQueue().length);
      }
    });
    return cleanup;
  }, [user]);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    const gamesRes = user
      ? await supabase.from("games").select("*, alleys!games_alley_id_fkey(name, city, state)").eq("user_id", user.id).order("date", { ascending: false })
      : { data: [] };
    let allAlleys: any[] = [];
    const BATCH = 1000;
    let from = 0;
    while (true) {
      const { data: batch } = await supabase.from("alleys").select("id, name, city, state").order("name").range(from, from + BATCH - 1);
      if (!batch || batch.length === 0) break;
      allAlleys = [...allAlleys, ...batch];
      if (batch.length < BATCH) break;
      from += BATCH;
    }
    setGames(gamesRes.data || []);
    setAlleys(allAlleys);
    setPendingCount(getOfflineQueue().length);
  };

  const startSession = () => {
    if (!user) { navigate("/auth"); return; }
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setCurrentGameNumber(1);
    setCompletedGames([]);
    resetGameFields();
    setPhase("bowling");
  };

  const resetGameFields = () => {
    setScore("");
    setNotes("");
    setFrameScore(0);
    setCurrentFrameData(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const saveCurrentGame = async () => {
    if (!user) return;
    if (!alleyId && !useCustomAlley) { toast({ title: "Please select an alley" }); return; }
    if (!score || parseInt(score) < 0) { toast({ title: "Please enter a score" }); return; }
    setSaving(true);

    let imageUrl: string | null = null;
    if (imageFile && isOnline()) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("game-images").upload(path, imageFile);
      if (uploadErr) {
        toast({ title: "Image upload failed", description: uploadErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("game-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const gameData: any = {
      user_id: user.id,
      alley_id: useCustomAlley ? null : alleyId,
      score: parseInt(score),
      date,
      notes: useCustomAlley && customAlleyName ? (notes ? `[${customAlleyName}] ${notes}` : `[${customAlleyName}]`) : (notes || null),
      oil_condition: oil,
      image_url: imageUrl,
      frame_data: currentFrameData ? JSON.parse(JSON.stringify(currentFrameData)) : null,
      session_id: sessionId,
      session_type: sessionType,
      game_number: currentGameNumber,
    };

    if (!isOnline()) {
      addToOfflineQueue({ ...gameData, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      toast({ title: "Game saved offline! 📴" });
      setPendingCount(getOfflineQueue().length);
    } else {
      const { error } = await supabase.from("games").insert(gameData);
      if (error) {
        addToOfflineQueue({ ...gameData, id: crypto.randomUUID(), created_at: new Date().toISOString() });
        toast({ title: "Saved offline! 📴", description: "Cloud sync failed, will retry." });
        setPendingCount(getOfflineQueue().length);
      } else {
        toast({ title: `Game ${currentGameNumber} logged! 🎳`, description: "+50 AlleyPoints" });
      }
    }

    const newCompleted = [...completedGames, { score: parseInt(score), gameNumber: currentGameNumber, frameData: currentFrameData }];
    setCompletedGames(newCompleted);

    if (currentGameNumber < totalGames) {
      // Progress to next game
      setCurrentGameNumber(currentGameNumber + 1);
      resetGameFields();
      toast({ title: `On to Game ${currentGameNumber + 1}!`, description: `${totalGames - currentGameNumber} game${totalGames - currentGameNumber > 1 ? "s" : ""} left in this series` });
    } else {
      // Session complete
      const totalPins = newCompleted.reduce((sum, g) => sum + g.score, 0);
      const avg = Math.round(totalPins / newCompleted.length);
      setPhase("done");
      clearDraft();
      fetchData();
      toast({
        title: `🏆 Series Complete!`,
        description: `${newCompleted.length} games — ${totalPins} total pins — ${avg} avg`,
      });
    }
    setSaving(false);
  };

  const endSessionEarly = () => {
    setPhase("idle");
    clearDraft();
    fetchData();
  };

  const sessionTypeLabel = (t: SessionType) =>
    t === "practice" ? "🎳 Practice" : t === "league" ? "🏆 League" : "⭐ Tournament";

  // Group history games by alley → then by date
  const alleyGroups = (() => {
    // First group by session_id so multi-game sessions stay together
    const bySession = games.reduce<Record<string, any[]>>((acc, g) => {
      const sid = g.session_id || g.id;
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(g);
      return acc;
    }, {});

    const sessions = Object.entries(bySession).map(([sid, sessionGames]) => {
      const sorted = [...sessionGames].sort((a, b) => (a.game_number || 1) - (b.game_number || 1));
      const alley = Array.isArray(sorted[0]?.alleys) ? sorted[0]?.alleys[0] : sorted[0]?.alleys;
      const alleyKey = alley?.name || (sorted[0]?.notes?.match(/^\[(.+?)\]/)?.[1]) || "Other";
      return {
        sid, games: sorted,
        total: sorted.reduce((s, g) => s + g.score, 0),
        avg: Math.round(sorted.reduce((s, g) => s + g.score, 0) / sorted.length),
        date: sorted[0]?.date,
        type: sorted[0]?.session_type || "practice",
        alley,
        alleyKey,
      };
    });

    // Group sessions by alley name
    const byAlley: Record<string, { alley: any; alleyKey: string; dates: Record<string, typeof sessions> }> = {};
    for (const s of sessions) {
      if (!byAlley[s.alleyKey]) byAlley[s.alleyKey] = { alley: s.alley, alleyKey: s.alleyKey, dates: {} };
      if (!byAlley[s.alleyKey].dates[s.date]) byAlley[s.alleyKey].dates[s.date] = [];
      byAlley[s.alleyKey].dates[s.date].push(s);
    }

    // Convert to sorted array: alleys sorted by most recent date, dates newest first
    return Object.values(byAlley)
      .map(group => {
        const dateEntries = Object.entries(group.dates)
          .sort(([a], [b]) => b.localeCompare(a)) // newest date first
          .map(([date, dateSessions]) => ({ date, sessions: dateSessions }));
        const latestDate = dateEntries[0]?.date || "";
        return { ...group, dateEntries, latestDate };
      })
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  })();

  return (
    <>
    <Helmet>
      <title>Log Bowling Score — Track Frames & Stats | Alley Cat</title>
      <meta name="description" content="Log your bowling scores frame-by-frame with Alley Cat. Track strikes, spares, and splits to analyze your game and improve your average." />
      <link rel="canonical" href="https://alleycat-bowling.com/log" />
    </Helmet>
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-primary text-xs">← Back</Link>
          <h1 className="text-lg text-primary mt-1">🎳 Score Log</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-destructive"}`} />
            <span className="text-[10px] text-muted-foreground">
              {online ? "Online" : "Offline — scores save locally"}
            </span>
            {pendingCount > 0 && (
              <span className="text-[10px] text-secondary font-bold">({pendingCount} pending sync)</span>
            )}
          </div>
        </div>
        {phase === "idle" && (
          <button
            onClick={() => user ? setPhase("setup") : navigate("/auth")}
            className="border border-border bg-secondary text-secondary-foreground px-3 py-1 text-xs hover:opacity-80"
          >
            [+ New Session]
          </button>
        )}
      </header>

      {/* ── PHASE: SESSION SETUP ─────────────────────────────── */}
      {phase === "setup" && (
        <div className="p-4 border-b border-border bg-card space-y-4">
          <h2 className="text-sm text-primary font-bold">Start a Bowling Session</h2>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Session Type:</label>
            <div className="flex gap-2 flex-wrap">
              {(["practice", "league", "tournament"] as SessionType[]).map(t => (
                <button key={t} type="button" onClick={() => {
                  setSessionType(t);
                  if (t === "league") setTotalGames(3);
                  if (t === "tournament") setTotalGames(3);
                }}
                  className={`text-xs px-3 py-2 border ${sessionType === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
                  {sessionTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1"># of Games:</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setTotalGames(n)}
                  className={`text-xs px-3 py-1.5 border ${totalGames === n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="text-xs text-muted-foreground block mb-1">Alley:</label>
            {useCustomAlley ? (
              <div>
                <input type="text" placeholder="Enter location name (optional)..." value={customAlleyName}
                  onChange={(e) => setCustomAlleyName(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
                <p className="text-xs text-primary mt-1">✓ Private / Unlisted Alley</p>
                <button type="button" onClick={() => { setUseCustomAlley(false); setCustomAlleyName(""); }}
                  className="text-xs text-muted-foreground underline mt-1">Search database instead</button>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Type to search alleys..." value={alleySearch}
                  onChange={(e) => { setAlleySearch(e.target.value); setAlleyId(""); }}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
                {alleyId && <p className="text-xs text-primary mt-1">✓ {alleys.find((a) => a.id === alleyId)?.name}</p>}
                {alleySearch && !alleyId && (
                  <div className="absolute z-10 w-full border border-border bg-card max-h-40 overflow-y-auto mt-0.5">
                    {alleys
                      .filter((a) => {
                        const nameL = a.name.toLowerCase();
                        if (nameL.includes("pro shop") || nameL.includes("bowling supply") || nameL.includes("pro-shop")) return false;
                        return `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(alleySearch.toLowerCase());
                      })
                      .slice(0, 50)
                      .map((a) => (
                        <button key={a.id} type="button" onClick={() => { setAlleyId(a.id); setAlleySearch(a.name); }}
                          className="w-full text-left px-2 py-1 text-xs text-foreground hover:bg-muted border-b border-border last:border-0">
                          {a.name} — {a.city}, {a.state}
                        </button>
                      ))}
                    {alleys.filter((a) => {
                      const nameL = a.name.toLowerCase();
                      if (nameL.includes("pro shop") || nameL.includes("bowling supply") || nameL.includes("pro-shop")) return false;
                      return `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(alleySearch.toLowerCase());
                    }).length === 0 && (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No alleys found</p>
                    )}
                    <button type="button" onClick={() => { setUseCustomAlley(true); setAlleyId(""); setAlleySearch(""); }}
                      className="w-full text-left px-2 py-1 text-xs text-primary hover:bg-muted border-t border-primary font-bold">
                      🏠 Alley Not Listed / Private Lane
                    </button>
                  </div>
                )}
                <button type="button" onClick={() => { setUseCustomAlley(true); setAlleyId(""); setAlleySearch(""); }}
                  className="text-xs text-muted-foreground underline mt-1">Alley not listed?</button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Oil:</label>
              <select value={oil} onChange={(e) => setOil(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none">
                <option>House</option><option>Fresh</option><option>Dry</option><option>Sport</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={startSession} disabled={!alleyId && !useCustomAlley}
              className="flex-1 border border-border bg-primary text-primary-foreground py-2 text-sm hover:opacity-80 disabled:opacity-50">
              Start {sessionTypeLabel(sessionType)} ({totalGames} game{totalGames > 1 ? "s" : ""})
            </button>
            <button onClick={() => setPhase("idle")}
              className="border border-border bg-card text-muted-foreground px-3 py-2 text-xs hover:opacity-80">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: BOWLING (active game entry) ───────────────── */}
      {phase === "bowling" && (
        <div className="p-4 border-b border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">{sessionTypeLabel(sessionType)}</span>
              <h2 className="text-sm text-primary font-bold">
                Game {currentGameNumber} of {totalGames}
              </h2>
            </div>
            <button onClick={endSessionEarly} className="text-xs text-muted-foreground border border-border px-2 py-1 hover:bg-muted">
              End Session
            </button>
          </div>

          {/* Show completed games in this session */}
          {completedGames.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {completedGames.map((g) => (
                <span key={g.gameNumber} className="text-xs border border-border bg-muted px-2 py-1 text-primary font-bold">
                  G{g.gameNumber}: {g.score}
                </span>
              ))}
              <span className="text-xs border border-border bg-muted px-2 py-1 text-secondary font-bold">
                Σ {completedGames.reduce((s, g) => s + g.score, 0)}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="flex gap-0.5">
            {Array.from({ length: totalGames }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 ${i < completedGames.length ? "bg-primary" : i === completedGames.length ? "bg-secondary" : "bg-muted"}`} />
            ))}
          </div>

          {/* Entry mode picker */}
          <div className="flex gap-1 flex-wrap">
            <button type="button" onClick={() => { setEntryMode("total"); setCurrentFrameData(null); }}
              className={`text-xs px-2 py-1 border ${entryMode === "total" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Total Score]
            </button>
            <button type="button" onClick={() => setEntryMode("frame")}
              className={`text-xs px-2 py-1 border ${entryMode === "frame" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Frame-by-Frame]
            </button>
            <button type="button" onClick={() => setEntryMode("pin")}
              className={`text-xs px-2 py-1 border ${entryMode === "pin" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Pin Mode 🎳]
            </button>
          </div>

          {entryMode === "total" ? (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Score (0-300):</label>
              <input type="number" min="0" max="300" value={score} onChange={(e) => setScore(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
            </div>
          ) : entryMode === "frame" ? (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Enter each roll:</label>
              <FrameByFrameInput onScoreChange={(total, frames) => { setFrameScore(total); setScore(String(total)); setCurrentFrameData(frames); }} />
              <p className="text-xs text-primary mt-1 font-bold">Calculated Score: {frameScore}</p>
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tap pins to score:</label>
              <PinModeInput onScoreChange={(total, frames) => { setFrameScore(total); setScore(String(total)); setCurrentFrameData(frames); }} />
              <p className="text-xs text-primary mt-1 font-bold">Calculated Score: {frameScore}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes (optional):</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none resize-none"
              placeholder="Ball choice, lane conditions..." />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Photo (optional):</label>
            <input type="file" accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setImageFile(f);
                setImagePreview(f ? URL.createObjectURL(f) : null);
              }}
              className="w-full text-xs text-foreground" />
            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-1 max-h-32 border border-border" />}
          </div>

          <button onClick={saveCurrentGame} disabled={saving || !score}
            className="w-full border border-border bg-primary text-primary-foreground py-2 text-sm hover:opacity-80 disabled:opacity-50">
            {saving ? "Saving..." : currentGameNumber < totalGames
              ? `Save Game ${currentGameNumber} → Next Game`
              : `Save Game ${currentGameNumber} — Finish Series`
            }
          </button>
        </div>
      )}

      {/* ── PHASE: SESSION COMPLETE ──────────────────────────── */}
      {phase === "done" && (
        <div className="p-4 border-b border-border bg-card space-y-3 text-center">
          <p className="text-lg text-primary font-bold">🏆 Series Complete!</p>
          <div className="flex justify-center gap-3">
            {completedGames.map((g) => (
              <span key={g.gameNumber} className="text-sm border border-border bg-muted px-3 py-2 text-primary font-bold">
                G{g.gameNumber}: {g.score}
              </span>
            ))}
          </div>
          <div className="text-sm text-secondary font-bold">
            Total: {completedGames.reduce((s, g) => s + g.score, 0)} · Avg: {Math.round(completedGames.reduce((s, g) => s + g.score, 0) / completedGames.length)}
          </div>
          <button onClick={() => { setPhase("idle"); setCompletedGames([]); }}
            className="border border-border bg-primary text-primary-foreground px-4 py-1.5 text-xs hover:opacity-80">
            Done
          </button>
        </div>
      )}

      {/* ── HISTORY ──────────────────────────────────────────── */}
      <div className="p-4">
        {games.length > 0 && (
          <div className="mb-4">
            <SeriesSummary games={games} />
          </div>
        )}
        {games.length === 0 && phase === "idle" ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No games logged yet. Hit [+ New Session] to get started!</p>
          </div>
        ) : games.length > 0 && (
          <>
            <h2 className="text-sm text-muted-foreground mb-2">Session History:</h2>
            <div className="space-y-6">
              {alleyGroups.map(({ alleyKey, alley, dateEntries }) => (
                <div key={alleyKey}>
                  {/* Alley header */}
                  <div className="bg-muted border border-border px-3 py-2 mb-1">
                    <h3 className="text-sm text-primary font-bold">📍 {alleyKey.toUpperCase()}</h3>
                    {alley?.city && <p className="text-[10px] text-muted-foreground">{alley.city}, {alley.state}</p>}
                  </div>

                  <div className="space-y-3 ml-2 border-l-2 border-border pl-3">
                    {dateEntries.map(({ date: sessionDate, sessions: dateSessions }) => {
                      const formatted = new Date(sessionDate + "T12:00:00").toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      });
                      return (
                        <div key={sessionDate}>
                          {/* Date sub-header */}
                          <p className="text-xs text-secondary font-bold mb-1.5">📅 {formatted}</p>

                          <div className="space-y-2">
                            {dateSessions.map(({ sid, games: sGames, total, avg, type }) => (
                              <div key={sid} className="border border-border bg-card">
                                {/* Session header (only if multi-game or has type) */}
                                {(sGames.length > 1 || type !== "practice") && (
                                  <div className="bg-muted/50 px-2 py-1 border-b border-border flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                      {type === "league" ? "🏆 League" : type === "tournament" ? "⭐ Tournament" : "🎳 Practice"}
                                      {sGames.length > 1 && ` · ${sGames.length} games`}
                                    </span>
                                    {sGames.length > 1 && (
                                      <span className="text-xs text-secondary font-bold">
                                        {total} pins · {avg} avg
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="p-2 space-y-2">
                                  {sGames.map((game, gi) => (
                                    <div key={game.id}>
                                      {sGames.length > 1 && (
                                        <p className="text-[10px] text-muted-foreground mb-1">Game {game.game_number || gi + 1}</p>
                                      )}
                                      <ScoreDisplay
                                        playerName={sGames.length > 1 ? `GAME ${game.game_number || gi + 1}` : (type === "league" ? "🏆 LEAGUE" : type === "tournament" ? "⭐ TOURNAMENT" : "🎳 GAME")}
                                        score={game.score}
                                        gameId={game.id}
                                        frameData={game.frame_data as FrameData[] | null}
                                      />
                                      {game.notes && <p className="text-[10px] text-muted-foreground italic mt-1">"{game.notes}"</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default ScoreLog;

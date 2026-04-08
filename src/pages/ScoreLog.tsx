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
  // Build flat rolls array
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
  let pendingCumulative = false; // track if we lost certainty

  for (let i = 0; i < 10; i++) {
    const f = frameData[i];
    if (!f || f.roll1 === null) break;
    const r1 = f.roll1 ?? 0;
    const r2 = f.roll2 ?? 0;

    if (i < 9) {
      if (r1 === 10) {
        // Strike: need next 2 rolls to resolve
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
        // Incomplete frame
        frames.push({ roll1: r1 === 0 ? "-" : String(r1), roll2: "", cumulative: 0 });
        pendingCumulative = true;
        ri += 1;
      } else if (r1 + r2 === 10) {
        // Spare: need next 1 roll to resolve
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
        // Open frame
        if (!pendingCumulative) {
          cumulative += r1 + r2;
          frames.push({
            roll1: r1 === 0 ? "-" : String(r1),
            roll2: r2 === 0 ? "-" : String(r2),
            cumulative,
          });
        } else {
          frames.push({
            roll1: r1 === 0 ? "-" : String(r1),
            roll2: r2 === 0 ? "-" : String(r2),
            cumulative: 0,
          });
        }
        ri += 2;
      }
    } else {
      // 10th frame
      const r3 = f.roll3 ?? 0;
      const needs3 = r1 === 10 || r1 + r2 >= 10;
      const isComplete = f.roll2 !== null && (!needs3 || f.roll3 !== null);

      let d1 = r1 === 10 ? "X" : r1 === 0 ? "-" : String(r1);
      let d2: string;
      if (r1 === 10) {
        d2 = f.roll2 === null ? "" : r2 === 10 ? "X" : r2 === 0 ? "-" : String(r2);
      } else {
        d2 = f.roll2 === null ? "" : r1 + r2 === 10 ? "/" : r2 === 0 ? "-" : String(r2);
      }
      let d3 = "";
      if (needs3 && f.roll3 !== null) {
        if (r1 === 10 && r2 === 10) {
          d3 = r3 === 10 ? "X" : r3 === 0 ? "-" : String(r3);
        } else if (r1 === 10) {
          d3 = r2 + r3 === 10 ? "/" : r3 === 0 ? "-" : String(r3);
        } else {
          d3 = r3 === 10 ? "X" : r3 === 0 ? "-" : String(r3);
        }
      }

      // For completed games, recalculate total from scratch for accuracy
      if (isComplete && !pendingCumulative) {
        cumulative += r1 + r2 + r3;
        frames.push({ roll1: d1, roll2: d2, roll3: d3, cumulative });
      } else {
        frames.push({ roll1: d1, roll2: d2, roll3: d3, cumulative: 0 });
      }
      ri += 3;
    }
  }

  // If there were pending cumulatives (strikes/spares waiting for bonus),
  // do a second pass now that all data is available for completed games
  if (pendingCumulative && frames.length === 10) {
    let cum = 0;
    let rIdx = 0;
    let allResolved = true;
    for (let i = 0; i < 10; i++) {
      const f = frameData[i];
      if (!f || f.roll1 === null) { allResolved = false; break; }
      const r1 = f.roll1 ?? 0;
      const r2 = f.roll2 ?? 0;
      if (i < 9) {
        if (r1 === 10) {
          if (rolls[rIdx + 1] === undefined || rolls[rIdx + 2] === undefined) { allResolved = false; break; }
          cum += 10 + (rolls[rIdx + 1] ?? 0) + (rolls[rIdx + 2] ?? 0);
          frames[i].cumulative = cum;
          rIdx += 1;
        } else if (f.roll2 === null) {
          allResolved = false; break;
        } else if (r1 + r2 === 10) {
          if (rolls[rIdx + 2] === undefined) { allResolved = false; break; }
          cum += 10 + (rolls[rIdx + 2] ?? 0);
          frames[i].cumulative = cum;
          rIdx += 2;
        } else {
          cum += r1 + r2;
          frames[i].cumulative = cum;
          rIdx += 2;
        }
      } else {
        const r3 = f.roll3 ?? 0;
        cum += r1 + r2 + r3;
        frames[i].cumulative = cum;
      }
    }
    if (!allResolved) {
      // Clear cumulatives that couldn't be resolved
      for (let i = 0; i < frames.length; i++) {
        frames[i].cumulative = 0;
      }
    }
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

const ScoreDisplay = ({ playerName, score, gameId, frameData }: { playerName: string; score: number; gameId: string; frameData?: FrameData[] | null }) => {
  const frames = frameData && frameData.length === 10 ? frameDataToDisplay(frameData) : generateFallbackFrames(score);
  return (
    <div className="border border-border bg-card overflow-x-auto">
      <div className="bg-muted px-2 py-1 border-b border-border">
        <span className="text-xs text-primary font-bold">{playerName}</span>
      </div>
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

const ScoreLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);
  const [alleys, setAlleys] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchParams] = useSearchParams();
  const [score, setScore] = useState("");
  const [alleyId, setAlleyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [oil, setOil] = useState("House");
  const [notes, setNotes] = useState("");
  const [selectedGame, setSelectedGame] = useState(0);
  const [saving, setSaving] = useState(false);
  const [entryMode, setEntryMode] = useState<"total" | "frame" | "pin">("total");
  const [frameScore, setFrameScore] = useState<number>(0);
  const [currentFrameData, setCurrentFrameData] = useState<FrameData[] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [alleySearch, setAlleySearch] = useState("");
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(getOfflineQueue().length);

  // Pre-select alley from query param
  useEffect(() => {
    const alleyParam = searchParams.get("alley");
    if (alleyParam) {
      setAlleyId(alleyParam);
      setShowForm(true);
    }
  }, [searchParams]);

  // Connectivity monitoring + auto-sync
  useEffect(() => {
    const cleanup = onConnectivityChange(async (isNowOnline) => {
      setOnline(isNowOnline);
      if (isNowOnline && user) {
        const { synced } = await syncOfflineGames(async (game) => {
          return supabase.from("games").insert(game);
        });
        if (synced > 0) {
          toast({ title: `Synced ${synced} offline game${synced > 1 ? "s" : ""}!` });
          fetchData();
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!alleyId) { toast({ title: "Please select an alley" }); return; }
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

    const gameData = {
      user_id: user.id,
      alley_id: alleyId,
      score: parseInt(score),
      date,
      oil_condition: oil,
      notes: notes || null,
      image_url: imageUrl,
      frame_data: currentFrameData ? JSON.parse(JSON.stringify(currentFrameData)) : null,
    };

    if (!isOnline()) {
      addToOfflineQueue({
        ...gameData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      toast({ title: "Saved offline! 📴", description: "Will sync when you're back online." });
      setPendingCount(getOfflineQueue().length);
      setShowForm(false); setScore(""); setAlleyId(""); setNotes(""); setImageFile(null); setImagePreview(null);
    } else {
      const { error } = await supabase.from("games").insert(gameData);
      if (error) {
        addToOfflineQueue({
          ...gameData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        });
        toast({ title: "Saved offline! 📴", description: "Cloud sync failed, will retry later." });
        setPendingCount(getOfflineQueue().length);
      } else {
        toast({ title: "Game logged!", description: "+50 AlleyPoints" });
      }
      setShowForm(false); setScore(""); setAlleyId(""); setNotes(""); setImageFile(null); setImagePreview(null); setCurrentFrameData(null); fetchData();
    }
    setSaving(false);
  };

  return (
    <>
    <Helmet>
      <title>Log Bowling Score — Track Frames & Stats | Alley Cat</title>
      <meta name="description" content="Log your bowling scores frame-by-frame with Alley Cat. Track strikes, spares, and splits to analyze your game and improve your average." />
      <link rel="canonical" href="https://alley-cat.lovable.app/log" />
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
        <button
          onClick={() => user ? setShowForm(!showForm) : navigate("/auth")}
          className="border border-border bg-secondary text-secondary-foreground px-3 py-1 text-xs hover:opacity-80"
        >
          [+ Log Game]
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-border bg-card space-y-2">
          <div className="flex gap-1 mb-2 flex-wrap">
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
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required />
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
          <div className="relative">
            <label className="text-xs text-muted-foreground block mb-1">Alley:</label>
            <input
              type="text"
              placeholder="Type to search alleys..."
              value={alleySearch}
              onChange={(e) => {
                setAlleySearch(e.target.value);
                setAlleyId("");
              }}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none"
            />
            {alleyId && (
              <p className="text-xs text-primary mt-1">
                ✓ {alleys.find((a) => a.id === alleyId)?.name}
              </p>
            )}
            {alleySearch && !alleyId && (
              <div className="absolute z-10 w-full border border-border bg-card max-h-40 overflow-y-auto mt-0.5">
                {alleys
                  .filter((a) => `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(alleySearch.toLowerCase()))
                  .slice(0, 50)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAlleyId(a.id);
                        setAlleySearch(a.name);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-foreground hover:bg-muted border-b border-border last:border-0"
                    >
                      {a.name} — {a.city}, {a.state}
                    </button>
                  ))}
                {alleys.filter((a) => `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(alleySearch.toLowerCase())).length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No alleys found</p>
                )}
              </div>
            )}
            <input type="hidden" value={alleyId} required />
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
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes:</label>
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
          <button type="submit" disabled={saving}
            className="w-full border border-border bg-primary text-primary-foreground py-1.5 text-xs hover:opacity-80 disabled:opacity-50">
            {saving ? "Saving..." : "Save Game (+50 pts)"}
          </button>
        </form>
      )}

      <div className="p-4">
        {games.length > 0 && (
          <div className="mb-4">
            <SeriesSummary games={games} />
          </div>
        )}
        {games.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No games logged yet. Hit [+ Log Game] to get started!</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm text-muted-foreground mb-2">Recent Games:</h2>
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {games.map((game, i) => (
                <button key={game.id} onClick={() => setSelectedGame(i)}
                  className={`text-xs px-2 py-1 border whitespace-nowrap transition-colors ${
                    selectedGame === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary"
                  }`}>
                  {game.date?.slice(5)} · {game.score}
                </button>
              ))}
            </div>

            {games[selectedGame] && (
              <div className="space-y-2">
                <ScoreDisplay
                  playerName={`${(Array.isArray(games[selectedGame].alleys) ? games[selectedGame].alleys[0] : games[selectedGame].alleys)?.name?.toUpperCase() || "UNKNOWN"}`}
                  score={games[selectedGame].score}
                  gameId={games[selectedGame].id}
                  frameData={games[selectedGame].frame_data as FrameData[] | null}
                />
                <div className="border border-border bg-card p-2 text-xs space-y-1">
                  <p><span className="text-muted-foreground">Alley:</span> <span className="text-foreground">{(Array.isArray(games[selectedGame].alleys) ? games[selectedGame].alleys[0] : games[selectedGame].alleys)?.name}</span></p>
                  <p><span className="text-muted-foreground">Oil:</span> <span className="text-primary">{games[selectedGame].oil_condition}</span></p>
                  {games[selectedGame].notes && <p className="text-muted-foreground italic">"{games[selectedGame].notes}"</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScoreLog;

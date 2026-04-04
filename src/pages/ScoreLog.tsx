import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import FrameByFrameInput from "@/components/FrameByFrameInput";

interface FrameScore {
  roll1: string;
  roll2: string;
  roll3?: string;
  cumulative: number;
}

const generateFrames = (totalScore: number, seed: string): FrameScore[] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const rng = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 1000) / 1000;
  };

  if (totalScore === 300) {
    const frames: FrameScore[] = [];
    for (let i = 0; i < 9; i++) frames.push({ roll1: "X", roll2: "", cumulative: (i + 1) * 30 });
    frames.push({ roll1: "X", roll2: "X", roll3: "X", cumulative: 300 });
    return frames;
  }

  const frameScores: number[] = [];
  let remaining = totalScore;
  for (let i = 0; i < 10; i++) {
    const framesLeft = 10 - i;
    const avg = remaining / framesLeft;
    const variance = Math.min(avg, 10 - avg, 3);
    let frameVal = Math.round(avg + (rng() - 0.5) * 2 * variance);
    frameVal = Math.max(0, Math.min(10, frameVal));
    if (i === 9) frameVal = Math.max(0, Math.min(10, remaining));
    remaining -= frameVal;
    remaining = Math.max(0, remaining);
    frameScores.push(frameVal);
  }
  let diff = totalScore - frameScores.reduce((a, b) => a + b, 0);
  for (let i = 0; diff > 0 && i < 10; i++) {
    const add = Math.min(diff, 10 - frameScores[i]);
    frameScores[i] += add;
    diff -= add;
  }

  const frames: FrameScore[] = [];
  let cumulative = 0;
  for (let i = 0; i < 10; i++) {
    const pins = frameScores[i];
    const isLast = i === 9;
    if (pins === 10) {
      cumulative += 10;
      if (isLast) {
        const bonus1 = Math.floor(rng() * 11);
        const bonus2 = bonus1 === 10 ? Math.floor(rng() * 11) : Math.floor(rng() * (11 - bonus1));
        frames.push({ roll1: "X", roll2: bonus1 === 10 ? "X" : String(bonus1), roll3: bonus1 === 10 && bonus2 === 10 ? "X" : bonus2 === (10 - bonus1) && bonus1 !== 10 ? "/" : String(bonus2), cumulative: totalScore });
      } else {
        frames.push({ roll1: "X", roll2: "", cumulative });
      }
    } else {
      const roll1 = Math.min(pins, Math.floor(rng() * (pins + 1)));
      const roll2 = pins - roll1;
      cumulative += pins;
      if (isLast) {
        frames.push({ roll1: roll1 === 10 ? "X" : String(roll1), roll2: roll1 + roll2 === 10 ? "/" : String(roll2), roll3: "-", cumulative: totalScore });
      } else {
        const r2Display = roll1 + roll2 === 10 ? "/" : roll2 === 0 ? "-" : String(roll2);
        frames.push({ roll1: roll1 === 0 ? "-" : String(roll1), roll2: r2Display, cumulative });
      }
    }
  }
  if (frames.length > 0) frames[frames.length - 1].cumulative = totalScore;
  return frames;
};

const ScoreDisplay = ({ playerName, score, gameId }: { playerName: string; score: number; gameId: string }) => {
  const frames = generateFrames(score, gameId);
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
                <div className="p-1 text-primary font-bold">{frame.cumulative}</div>
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
  const [entryMode, setEntryMode] = useState<"total" | "frame">("total");
  const [frameScore, setFrameScore] = useState<number>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Pre-select alley from query param
  useEffect(() => {
    const alleyParam = searchParams.get("alley");
    if (alleyParam) {
      setAlleyId(alleyParam);
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    const [gamesRes, alleysRes] = await Promise.all([
      user ? supabase.from("games").select("*, alleys!games_alley_id_fkey(name, city, state)").eq("user_id", user.id).order("date", { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from("alleys").select("id, name").order("name"),
    ]);
    setGames(gamesRes.data || []);
    setAlleys(alleysRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    setSaving(true);
    let imageUrl: string | null = null;
    if (imageFile) {
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
    const { error } = await supabase.from("games").insert({ user_id: user.id, alley_id: alleyId, score: parseInt(score), date, oil_condition: oil, notes: notes || null, image_url: imageUrl });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Game logged!", description: "+50 AlleyPoints" });
      setShowForm(false); setScore(""); setAlleyId(""); setNotes(""); setImageFile(null); setImagePreview(null); fetchData();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-primary text-xs">← Back</Link>
          <h1 className="text-lg text-primary mt-1">🎳 Score Log</h1>
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
          <div className="flex gap-1 mb-2">
            <button type="button" onClick={() => setEntryMode("total")}
              className={`text-xs px-2 py-1 border ${entryMode === "total" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Total Score]
            </button>
            <button type="button" onClick={() => setEntryMode("frame")}
              className={`text-xs px-2 py-1 border ${entryMode === "frame" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Frame-by-Frame]
            </button>
          </div>

          {entryMode === "total" ? (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Score (0-300):</label>
              <input type="number" min="0" max="300" value={score} onChange={(e) => setScore(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Enter each roll:</label>
              <FrameByFrameInput onScoreChange={(total) => { setFrameScore(total); setScore(String(total)); }} />
              <p className="text-xs text-primary mt-1 font-bold">Calculated Score: {frameScore}</p>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Alley:</label>
            <select value={alleyId} onChange={(e) => setAlleyId(e.target.value)}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required>
              <option value="">Select alley...</option>
              {alleys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
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

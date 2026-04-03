import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FrameScore {
  roll1: string;
  roll2: string;
  roll3?: string;
  cumulative: number;
}

/**
 * Generate realistic-looking frame-by-frame scores that add up to the given total.
 * Uses seeded randomness based on the game id for consistency.
 */
const generateFrames = (totalScore: number, seed: string): FrameScore[] => {
  // Simple seeded RNG from string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const rng = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 1000) / 1000;
  };

  // Perfect game
  if (totalScore === 300) {
    const frames: FrameScore[] = [];
    for (let i = 0; i < 9; i++) {
      frames.push({ roll1: "X", roll2: "", cumulative: (i + 1) * 30 });
    }
    frames.push({ roll1: "X", roll2: "X", roll3: "X", cumulative: 300 });
    return frames;
  }

  // Generate individual frame pin counts that roughly sum to the total
  const frameScores: number[] = [];
  const avgPerFrame = totalScore / 10;
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

  // Distribute any remainder
  let diff = totalScore - frameScores.reduce((a, b) => a + b, 0);
  for (let i = 0; diff > 0 && i < 10; i++) {
    const add = Math.min(diff, 10 - frameScores[i]);
    frameScores[i] += add;
    diff -= add;
  }

  // Convert to display frames
  const frames: FrameScore[] = [];
  let cumulative = 0;

  for (let i = 0; i < 10; i++) {
    const pins = frameScores[i];
    const isLast = i === 9;

    if (pins === 10) {
      // Strike
      cumulative += 10;
      if (isLast) {
        const bonus1 = Math.floor(rng() * 11);
        const bonus2 = bonus1 === 10 ? Math.floor(rng() * 11) : Math.floor(rng() * (11 - bonus1));
        frames.push({
          roll1: "X",
          roll2: bonus1 === 10 ? "X" : String(bonus1),
          roll3: bonus1 === 10 && bonus2 === 10 ? "X" : bonus2 === (10 - bonus1) && bonus1 !== 10 ? "/" : String(bonus2),
          cumulative: totalScore,
        });
      } else {
        frames.push({ roll1: "X", roll2: "", cumulative });
      }
    } else {
      const roll1 = Math.min(pins, Math.floor(rng() * (pins + 1)));
      const roll2 = pins - roll1;
      cumulative += pins;

      if (pins === 10 && !isLast) {
        // Spare (shouldn't happen since pins === 10 is strike, but safety)
        frames.push({ roll1: String(roll1), roll2: "/", cumulative });
      } else if (isLast) {
        frames.push({
          roll1: roll1 === 10 ? "X" : String(roll1),
          roll2: roll1 + roll2 === 10 ? "/" : String(roll2),
          roll3: "-",
          cumulative: totalScore,
        });
      } else {
        const r2Display = roll1 + roll2 === 10 ? "/" : roll2 === 0 ? "-" : String(roll2);
        frames.push({
          roll1: roll1 === 0 ? "-" : String(roll1),
          roll2: r2Display,
          cumulative,
        });
      }
    }
  }

  // Fix last cumulative
  if (frames.length > 0) {
    frames[frames.length - 1].cumulative = totalScore;
  }

  return frames;
};

const CRTScreen = ({ playerName, score, gameId }: { playerName: string; score: number; gameId: string }) => {
  const frames = generateFrames(score, gameId);

  return (
    <div className="bg-[#1a1a2e] border-[6px] border-[#6b6b7b] p-1 relative" style={{
      borderTopColor: '#8a8a9a',
      borderLeftColor: '#8a8a9a',
      borderRightColor: '#4a4a5a',
      borderBottomColor: '#4a4a5a',
      boxShadow: 'inset 0 0 30px rgba(0,100,255,0.15), 0 4px 12px rgba(0,0,0,0.5)',
    }}>
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0000aa 0%, #0000cc 30%, #0000aa 100%)',
        boxShadow: 'inset 0 0 60px rgba(0,50,200,0.4)',
      }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,50,0.4) 100%)',
        }} />

        <div className="relative z-10 p-2">
          <div className="flex items-center mb-1">
            <span className="font-pixel text-[8px] tracking-wider" style={{
              color: '#00ff00',
              textShadow: '0 0 6px rgba(0,255,0,0.6)',
            }}>
              {playerName}
            </span>
          </div>

          <div className="grid grid-cols-[repeat(10,1fr)_auto] gap-0 border border-[#4488ff]/60">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border-r border-[#4488ff]/40 text-center py-0.5" style={{ background: 'rgba(0,50,150,0.5)' }}>
                <span className="font-pixel text-[7px]" style={{ color: '#88ccff', textShadow: '0 0 4px rgba(100,180,255,0.5)' }}>{i + 1}</span>
              </div>
            ))}
            <div className="text-center py-0.5 px-1" style={{ background: 'rgba(0,50,150,0.5)' }}>
              <span className="font-pixel text-[6px]" style={{ color: '#88ccff' }}>TOT</span>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(10,1fr)_auto] gap-0 border-x border-b border-[#4488ff]/60">
            {frames.map((frame, i) => (
              <div key={i} className="border-r border-[#4488ff]/40">
                <div className="flex border-b border-[#4488ff]/30">
                  <div className="flex-1 text-center py-0.5 border-r border-[#4488ff]/20">
                    <span className="font-pixel text-[8px] font-bold" style={{
                      color: frame.roll1 === 'X' ? '#ffff00' : '#00ffaa',
                      textShadow: frame.roll1 === 'X' ? '0 0 6px rgba(255,255,0,0.7)' : '0 0 4px rgba(0,255,170,0.5)',
                    }}>{frame.roll1}</span>
                  </div>
                  <div className="flex-1 text-center py-0.5">
                    <span className="font-pixel text-[8px]" style={{
                      color: frame.roll2 === '/' ? '#ffff00' : '#00ffaa',
                      textShadow: frame.roll2 === '/' ? '0 0 6px rgba(255,255,0,0.7)' : '0 0 4px rgba(0,255,170,0.5)',
                    }}>{frame.roll2}</span>
                  </div>
                  {i === 9 && (
                    <div className="flex-1 text-center py-0.5 border-l border-[#4488ff]/20">
                      <span className="font-pixel text-[8px]" style={{ color: '#00ffaa' }}>{frame.roll3 || ""}</span>
                    </div>
                  )}
                </div>
                <div className="text-center py-1">
                  <span className="font-pixel text-[9px] font-bold" style={{ color: '#ffffff', textShadow: '0 0 6px rgba(255,255,255,0.5)' }}>
                    {frame.cumulative}
                  </span>
                </div>
              </div>
            ))}
            <div className="text-center flex items-end justify-center pb-1 px-1">
              <span className="font-pixel text-[10px] font-bold" style={{ color: '#ffff00', textShadow: '0 0 6px rgba(255,255,0,0.7)' }}>
                {score}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center py-0.5" style={{ background: '#2a2a3a' }}>
        <span className="font-pixel text-[5px] tracking-[0.2em]" style={{ color: '#5a5a6a' }}>ALLEYCAT SCORING SYSTEMS</span>
      </div>
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
  const [score, setScore] = useState("");
  const [alleyId, setAlleyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [oil, setOil] = useState("House");
  const [notes, setNotes] = useState("");
  const [selectedGame, setSelectedGame] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [gamesRes, alleysRes] = await Promise.all([
      user
        ? supabase.from("games").select("*, alleys!games_alley_id_fkey(name, city, state)").eq("user_id", user.id).order("date", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("alleys").select("id, name").order("name"),
    ]);
    setGames(gamesRes.data || []);
    setAlleys(alleysRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("games").insert({
      user_id: user.id,
      alley_id: alleyId,
      score: parseInt(score),
      date,
      oil_condition: oil,
      notes: notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Game logged!", description: "+50 AlleyPoints" });
      setShowForm(false);
      setScore("");
      setAlleyId("");
      setNotes("");
      fetchData();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-primary"><ArrowLeft size={20} /></Link>
          <h1 className="font-pixel text-xs text-primary neon-text">SCORE LOG</h1>
        </div>
        <button
          onClick={() => user ? setShowForm(!showForm) : navigate("/auth")}
          className="border-2 border-secondary bg-secondary text-secondary-foreground px-3 py-1.5 font-pixel text-[8px] flex items-center gap-1 hover:orange-border transition-all"
        >
          <Plus size={12} />
          LOG GAME
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b-2 border-secondary bg-card space-y-3">
          <div>
            <label className="font-pixel text-[8px] text-secondary block mb-1">SCORE (0-300)</label>
            <input type="number" min="0" max="300" value={score} onChange={(e) => setScore(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none" required />
          </div>
          <div>
            <label className="font-pixel text-[8px] text-secondary block mb-1">ALLEY</label>
            <select value={alleyId} onChange={(e) => setAlleyId(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none" required>
              <option value="">Select alley...</option>
              {alleys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-pixel text-[8px] text-secondary block mb-1">DATE</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none" />
            </div>
            <div>
              <label className="font-pixel text-[8px] text-secondary block mb-1">OIL</label>
              <select value={oil} onChange={(e) => setOil(e.target.value)}
                className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none">
                <option>House</option><option>Fresh</option><option>Dry</option><option>Sport</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-pixel text-[8px] text-secondary block mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none resize-none"
              placeholder="Ball choice, lane conditions..." />
          </div>
          <button type="submit" disabled={saving}
            className="w-full border-2 border-primary bg-primary text-primary-foreground py-2 font-pixel text-[9px] hover:neon-border transition-all disabled:opacity-50">
            {saving ? "SAVING..." : "SAVE GAME (+50 PTS)"}
          </button>
        </form>
      )}

      <div className="p-4">
        {games.length === 0 ? (
          <div className="border-2 border-muted p-8 text-center">
            <p className="font-pixel text-xs text-muted-foreground">NO GAMES LOGGED YET</p>
            <p className="text-xs text-muted-foreground mt-2">Hit LOG GAME to get started!</p>
          </div>
        ) : (
          <>
            <h2 className="font-pixel text-[10px] text-muted-foreground mb-3">RECENT GAMES</h2>
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {games.map((game, i) => (
                <button key={game.id} onClick={() => setSelectedGame(i)}
                  className={`font-pixel text-[7px] px-3 py-1.5 border-2 whitespace-nowrap transition-all ${
                    selectedGame === i
                      ? "border-primary bg-primary text-primary-foreground neon-border"
                      : "border-muted bg-card text-muted-foreground hover:border-primary"
                  }`}>
                  {game.date?.slice(5)} · {game.score}
                </button>
              ))}
            </div>

            {games[selectedGame] && (
              <div className="space-y-3">
                <CRTScreen
                  playerName={`PLAYER 1 - ${(Array.isArray(games[selectedGame].alleys) ? games[selectedGame].alleys[0] : games[selectedGame].alleys)?.name?.toUpperCase() || "UNKNOWN"}`}
                  score={games[selectedGame].score}
                  gameId={games[selectedGame].id}
                />
                <div className="border-2 border-muted bg-card p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Alley</span>
                    <span className="text-foreground">{(Array.isArray(games[selectedGame].alleys) ? games[selectedGame].alleys[0] : games[selectedGame].alleys)?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Oil</span>
                    <span className="text-primary">{games[selectedGame].oil_condition}</span>
                  </div>
                  {games[selectedGame].notes && (
                    <p className="text-xs text-muted-foreground italic mt-2">"{games[selectedGame].notes}"</p>
                  )}
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

import { useState } from "react";
import { mockAlleys, mockGames } from "@/data/mockData";
import { ArrowLeft, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

interface FrameScore {
  roll1: string;
  roll2: string;
  roll3?: string;
  cumulative: number | null;
}

const parseScoreToFrames = (totalScore: number): FrameScore[] => {
  const frames: FrameScore[] = [];
  let remaining = totalScore;
  
  for (let i = 0; i < 10; i++) {
    const isLast = i === 9;
    const avgPerFrame = remaining / (10 - i);
    
    if (remaining <= 0) {
      frames.push({ roll1: "-", roll2: "-", cumulative: totalScore - remaining + 0 });
      continue;
    }

    if (avgPerFrame >= 9 && remaining >= 30 && !isLast) {
      // Strike
      remaining -= 10 + Math.min(10, Math.floor(remaining / (10 - i)));
      const bonus = Math.floor(Math.random() * 5) + 5;
      remaining = Math.max(0, remaining);
      frames.push({ roll1: "X", roll2: "", cumulative: totalScore - remaining });
    } else if (avgPerFrame >= 7 && remaining >= 15 && !isLast) {
      // Spare
      const first = Math.floor(Math.random() * 4) + 5;
      remaining -= 10 + Math.floor(Math.random() * 5);
      remaining = Math.max(0, remaining);
      frames.push({ roll1: String(first), roll2: "/", cumulative: totalScore - remaining });
    } else {
      const first = Math.min(9, Math.floor(Math.random() * 7) + 1);
      const second = Math.min(10 - first, Math.floor(Math.random() * (10 - first)));
      remaining -= (first + second);
      remaining = Math.max(0, remaining);
      if (isLast) {
        frames.push({ roll1: String(first), roll2: String(second), roll3: "-", cumulative: totalScore });
      } else {
        frames.push({ roll1: String(first), roll2: second === 0 ? "-" : String(second), cumulative: totalScore - remaining });
      }
    }
  }
  // Fix last frame cumulative
  if (frames.length === 10) {
    frames[9].cumulative = totalScore;
  }
  return frames;
};

const CRTScreen = ({ playerName, score, games }: { playerName: string; score: number; games: typeof mockGames }) => {
  const frames = parseScoreToFrames(score);

  return (
    <div className="bg-[#1a1a2e] border-[6px] border-[#6b6b7b] p-1 relative" style={{
      borderTopColor: '#8a8a9a',
      borderLeftColor: '#8a8a9a',
      borderRightColor: '#4a4a5a',
      borderBottomColor: '#4a4a5a',
      boxShadow: 'inset 0 0 30px rgba(0,100,255,0.15), 0 4px 12px rgba(0,0,0,0.5)',
    }}>
      {/* CRT Screen */}
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0000aa 0%, #0000cc 30%, #0000aa 100%)',
        boxShadow: 'inset 0 0 60px rgba(0,50,200,0.4)',
      }}>
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px)',
        }} />

        {/* CRT curvature glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,50,0.4) 100%)',
        }} />

        <div className="relative z-10 p-2">
          {/* Player Name Row */}
          <div className="flex items-center mb-1">
            <span className="font-pixel text-[9px] tracking-wider" style={{
              color: '#00ff00',
              textShadow: '0 0 6px rgba(0,255,0,0.6)',
            }}>
              {playerName}
            </span>
          </div>

          {/* Frame Headers */}
          <div className="grid grid-cols-[repeat(10,1fr)_auto] gap-0 border border-[#4488ff]/60">
            {/* Frame numbers */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="border-r border-[#4488ff]/40 text-center py-0.5" style={{
                background: 'rgba(0,50,150,0.5)',
              }}>
                <span className="font-pixel text-[7px]" style={{
                  color: '#88ccff',
                  textShadow: '0 0 4px rgba(100,180,255,0.5)',
                }}>{i + 1}</span>
              </div>
            ))}
            <div className="text-center py-0.5 px-1" style={{ background: 'rgba(0,50,150,0.5)' }}>
              <span className="font-pixel text-[6px]" style={{
                color: '#88ccff',
                textShadow: '0 0 4px rgba(100,180,255,0.5)',
              }}>HDP</span>
            </div>
          </div>

          {/* Score Cells */}
          <div className="grid grid-cols-[repeat(10,1fr)_auto] gap-0 border-x border-b border-[#4488ff]/60">
            {frames.map((frame, i) => (
              <div key={i} className="border-r border-[#4488ff]/40">
                {/* Roll boxes */}
                <div className="flex border-b border-[#4488ff]/30">
                  <div className="flex-1 text-center py-0.5 border-r border-[#4488ff]/20">
                    <span className="font-pixel text-[8px] font-bold" style={{
                      color: frame.roll1 === 'X' ? '#ffff00' : '#00ffaa',
                      textShadow: frame.roll1 === 'X'
                        ? '0 0 6px rgba(255,255,0,0.7)'
                        : '0 0 4px rgba(0,255,170,0.5)',
                    }}>{frame.roll1}</span>
                  </div>
                  <div className="flex-1 text-center py-0.5">
                    <span className="font-pixel text-[8px]" style={{
                      color: frame.roll2 === '/' ? '#ffff00' : '#00ffaa',
                      textShadow: frame.roll2 === '/'
                        ? '0 0 6px rgba(255,255,0,0.7)'
                        : '0 0 4px rgba(0,255,170,0.5)',
                    }}>{frame.roll2}</span>
                  </div>
                  {i === 9 && (
                    <div className="flex-1 text-center py-0.5 border-l border-[#4488ff]/20">
                      <span className="font-pixel text-[8px]" style={{
                        color: '#00ffaa',
                        textShadow: '0 0 4px rgba(0,255,170,0.5)',
                      }}>{frame.roll3 || ""}</span>
                    </div>
                  )}
                </div>
                {/* Cumulative */}
                <div className="text-center py-1">
                  <span className="font-pixel text-[9px] font-bold" style={{
                    color: '#ffffff',
                    textShadow: '0 0 6px rgba(255,255,255,0.5)',
                  }}>{frame.cumulative ?? ""}</span>
                </div>
              </div>
            ))}
            {/* Handicap column */}
            <div className="text-center py-1 px-1 flex items-end justify-center">
              <span className="font-pixel text-[8px]" style={{
                color: '#88ccff',
              }}>0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand label under screen */}
      <div className="text-center py-0.5" style={{ background: '#2a2a3a' }}>
        <span className="font-pixel text-[5px] tracking-[0.2em]" style={{ color: '#5a5a6a' }}>
          ALLEYCAT SCORING SYSTEMS
        </span>
      </div>
    </div>
  );
};

const ScoreLog = () => {
  const [games] = useState(mockGames);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState("");
  const [alleyId, setAlleyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [oil, setOil] = useState("House");
  const [notes, setNotes] = useState("");
  const [selectedGame, setSelectedGame] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    setScore("");
    setAlleyId("");
    setNotes("");
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-primary">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-pixel text-xs text-primary neon-text">SCORE LOG</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
            <input
              type="number"
              min="0"
              max="300"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="font-pixel text-[8px] text-secondary block mb-1">ALLEY</label>
            <select
              value={alleyId}
              onChange={(e) => setAlleyId(e.target.value)}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              required
            >
              <option value="">Select alley...</option>
              {mockAlleys.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-pixel text-[8px] text-secondary block mb-1">DATE</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              />
            </div>
            <div>
              <label className="font-pixel text-[8px] text-secondary block mb-1">OIL</label>
              <select
                value={oil}
                onChange={(e) => setOil(e.target.value)}
                className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none"
              >
                <option>House</option>
                <option>Fresh</option>
                <option>Dry</option>
                <option>Sport</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-pixel text-[8px] text-secondary block mb-1">NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none resize-none"
              placeholder="Ball choice, lane conditions..."
            />
          </div>
          <button
            type="submit"
            className="w-full border-2 border-primary bg-primary text-primary-foreground py-2 font-pixel text-[9px] hover:neon-border transition-all"
          >
            SAVE GAME (+50 PTS)
          </button>
        </form>
      )}

      {/* CRT Score Display */}
      <div className="p-4">
        <h2 className="font-pixel text-[10px] text-muted-foreground mb-3">RECENT GAMES</h2>
        
        {/* Game selector tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {games.map((game, i) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(i)}
              className={`font-pixel text-[7px] px-3 py-1.5 border-2 whitespace-nowrap transition-all ${
                selectedGame === i
                  ? "border-primary bg-primary text-primary-foreground neon-border"
                  : "border-muted bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {game.date.slice(5)} · {game.score}
            </button>
          ))}
        </div>

        {/* CRT Monitor */}
        {games[selectedGame] && (
          <div className="space-y-3">
            <CRTScreen
              playerName={`PLAYER 1 - ${games[selectedGame].alley_name.toUpperCase()}`}
              score={games[selectedGame].score}
              games={games}
            />

            {/* Game details below monitor */}
            <div className="border-2 border-muted bg-card p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Alley</span>
                <span className="text-foreground">{games[selectedGame].alley_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Oil</span>
                <span className="text-primary">{games[selectedGame].oil_condition}</span>
              </div>
              {games[selectedGame].notes && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  "{games[selectedGame].notes}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* All games list */}
      <div className="px-4 space-y-2">
        <h2 className="font-pixel text-[10px] text-secondary orange-text mb-2">ALL SCORES</h2>
        {games.map((game, i) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(i)}
            className="w-full border-2 border-muted bg-card p-3 flex items-center justify-between text-left hover:border-primary transition-all"
          >
            <div>
              <p className="text-sm font-bold text-foreground">{game.alley_name}</p>
              <p className="text-xs text-muted-foreground">{game.date} · {game.oil_condition}</p>
            </div>
            <p className="font-pixel text-lg text-primary neon-text">{game.score}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScoreLog;

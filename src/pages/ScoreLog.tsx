import { useState } from "react";
import { mockAlleys, mockGames } from "@/data/mockData";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const ScoreLog = () => {
  const [games] = useState(mockGames);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState("");
  const [alleyId, setAlleyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [oil, setOil] = useState("House");
  const [notes, setNotes] = useState("");

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

      <div className="p-4 space-y-2">
        <h2 className="font-pixel text-[10px] text-muted-foreground mb-3">RECENT GAMES</h2>
        {games.map((game) => (
          <div key={game.id} className="border-2 border-muted bg-card p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{game.alley_name}</p>
              <p className="text-xs text-muted-foreground">{game.date} · {game.oil_condition}</p>
              {game.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{game.notes}"</p>}
            </div>
            <div className="text-right">
              <p className="font-pixel text-lg text-primary neon-text">{game.score}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreLog;

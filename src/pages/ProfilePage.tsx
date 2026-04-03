import { mockProfiles, mockGames } from "@/data/mockData";
import { User, Target, Trophy, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ProfilePage = () => {
  const profile = mockProfiles[0]; // Current user
  const games = mockGames;
  const highScore = Math.max(...games.map((g) => g.score));
  const avgScore = Math.round(games.reduce((sum, g) => sum + g.score, 0) / games.length);

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/" className="text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-pixel text-xs text-primary neon-text">MY STATS</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="border-2 border-primary bg-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 border-2 border-secondary bg-muted flex items-center justify-center">
              <User size={24} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-pixel text-sm text-primary neon-text">{profile.username}</h2>
              <p className="text-xs text-muted-foreground">{profile.hometown}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="border-2 border-primary bg-muted/30 p-2 text-center">
              <Trophy size={16} className="text-secondary mx-auto mb-1" />
              <p className="font-pixel text-sm text-primary neon-text">{profile.total_points}</p>
              <p className="font-pixel text-[6px] text-muted-foreground mt-1">POINTS</p>
            </div>
            <div className="border-2 border-primary bg-muted/30 p-2 text-center">
              <Target size={16} className="text-primary mx-auto mb-1" />
              <p className="font-pixel text-sm text-foreground">{highScore}</p>
              <p className="font-pixel text-[6px] text-muted-foreground mt-1">HIGH</p>
            </div>
            <div className="border-2 border-primary bg-muted/30 p-2 text-center">
              <TrendingUp size={16} className="text-primary mx-auto mb-1" />
              <p className="font-pixel text-sm text-foreground">{avgScore}</p>
              <p className="font-pixel text-[6px] text-muted-foreground mt-1">AVG</p>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div>
          <h2 className="font-pixel text-[10px] text-secondary orange-text mb-3">
            GAME HISTORY
          </h2>
          <div className="border-2 border-primary">
            <div className="grid grid-cols-12 bg-muted border-b-2 border-primary px-3 py-2">
              <span className="col-span-5 font-pixel text-[7px] text-muted-foreground">ALLEY</span>
              <span className="col-span-3 font-pixel text-[7px] text-muted-foreground">DATE</span>
              <span className="col-span-2 font-pixel text-[7px] text-muted-foreground text-right">OIL</span>
              <span className="col-span-2 font-pixel text-[7px] text-muted-foreground text-right">SCR</span>
            </div>
            {games.map((game, i) => (
              <div
                key={game.id}
                className={`grid grid-cols-12 px-3 py-2 items-center ${
                  i % 2 === 0 ? "bg-card" : "bg-muted/30"
                }`}
              >
                <span className="col-span-5 text-xs text-foreground truncate">{game.alley_name}</span>
                <span className="col-span-3 text-[10px] text-muted-foreground">{game.date.slice(5)}</span>
                <span className="col-span-2 text-[10px] text-muted-foreground text-right">{game.oil_condition.slice(0, 3)}</span>
                <span className="col-span-2 text-xs text-primary text-right font-bold">{game.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

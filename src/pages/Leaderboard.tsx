import { mockProfiles } from "@/data/mockData";
import { Trophy, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Leaderboard = () => {
  const sorted = [...mockProfiles].sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/" className="text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-pixel text-xs text-secondary orange-text">
          GLOBAL TOP CATS
        </h1>
        <Trophy size={16} className="text-secondary" />
      </header>

      {/* Top 3 Podium */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-6">
          {sorted.slice(0, 3).map((p, i) => {
            const heights = ["h-28", "h-24", "h-20"];
            const colors = ["border-secondary", "border-primary", "border-muted-foreground"];
            const labels = ["1ST", "2ND", "3RD"];
            return (
              <div key={p.id} className="flex flex-col items-center">
                <p className="font-pixel text-[7px] text-foreground mb-1 truncate max-w-full">
                  {p.username}
                </p>
                <div
                  className={`w-full ${heights[i]} border-2 ${colors[i]} bg-card flex flex-col items-center justify-center`}
                >
                  <p className="font-pixel text-[10px] text-primary neon-text">{p.total_points}</p>
                  <p className="font-pixel text-[7px] text-muted-foreground">PTS</p>
                </div>
                <p className={`font-pixel text-[8px] mt-1 ${i === 0 ? "text-secondary orange-text" : "text-muted-foreground"}`}>
                  {labels[i]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Full Table */}
        <div className="border-2 border-primary">
          <div className="grid grid-cols-12 bg-muted border-b-2 border-primary px-3 py-2">
            <span className="col-span-1 font-pixel text-[7px] text-muted-foreground">#</span>
            <span className="col-span-5 font-pixel text-[7px] text-muted-foreground">NAME</span>
            <span className="col-span-3 font-pixel text-[7px] text-muted-foreground text-right">PTS</span>
            <span className="col-span-3 font-pixel text-[7px] text-muted-foreground text-right">AVG</span>
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={`grid grid-cols-12 px-3 py-2 items-center ${
                i % 2 === 0 ? "bg-card" : "bg-muted/30"
              } ${i < 3 ? "border-l-2 border-l-secondary" : ""}`}
            >
              <span className="col-span-1 text-xs text-muted-foreground">{i + 1}</span>
              <div className="col-span-5">
                <p className="text-xs text-foreground truncate">{p.username}</p>
                <p className="text-[10px] text-muted-foreground">{p.hometown}</p>
              </div>
              <span className="col-span-3 text-xs text-primary text-right font-bold">
                {p.total_points.toLocaleString()}
              </span>
              <span className="col-span-3 text-xs text-foreground text-right">
                {p.bowling_average}
              </span>
            </div>
          ))}
        </div>

        {/* Points Legend */}
        <div className="mt-4 border-2 border-muted bg-card p-3">
          <h3 className="font-pixel text-[8px] text-primary mb-2">ALLEYPOINTS</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target size={12} className="text-secondary" />
              <span>Log a game = <span className="text-secondary font-bold">+50 pts</span></span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-primary" />
              <span>Write a review = <span className="text-primary font-bold">+20 pts</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

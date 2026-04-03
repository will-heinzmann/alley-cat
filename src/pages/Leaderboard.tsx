import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Leaderboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(50);
      setProfiles(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-xs text-muted-foreground animate-pulse-neon">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/" className="text-primary"><ArrowLeft size={20} /></Link>
        <h1 className="font-pixel text-xs text-secondary orange-text">GLOBAL TOP CATS</h1>
        <Trophy size={16} className="text-secondary" />
      </header>

      <div className="p-4">
        {profiles.length === 0 ? (
          <div className="border-2 border-muted p-8 text-center">
            <p className="font-pixel text-xs text-muted-foreground">NO BOWLERS YET</p>
            <p className="text-xs text-muted-foreground mt-2">Sign up and log games to climb the board!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {profiles.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                {profiles.slice(0, 3).map((p, i) => {
                  const heights = ["h-28", "h-24", "h-20"];
                  const colors = ["border-secondary", "border-primary", "border-muted-foreground"];
                  const labels = ["1ST", "2ND", "3RD"];
                  return (
                    <Link to={`/bowler/${p.user_id}`} key={p.id} className="flex flex-col items-center">
                      <p className="font-pixel text-[7px] text-foreground mb-1 truncate max-w-full">{p.username}</p>
                      <div className={`w-full ${heights[i]} border-2 ${colors[i]} bg-card flex flex-col items-center justify-center`}>
                        <p className="font-pixel text-[10px] text-primary neon-text">{p.total_points}</p>
                        <p className="font-pixel text-[7px] text-muted-foreground">PTS</p>
                      </div>
                      <p className={`font-pixel text-[8px] mt-1 ${i === 0 ? "text-secondary orange-text" : "text-muted-foreground"}`}>{labels[i]}</p>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Full Table */}
            <div className="border-2 border-primary">
              <div className="grid grid-cols-12 bg-muted border-b-2 border-primary px-3 py-2">
                <span className="col-span-1 font-pixel text-[7px] text-muted-foreground">#</span>
                <span className="col-span-5 font-pixel text-[7px] text-muted-foreground">NAME</span>
                <span className="col-span-3 font-pixel text-[7px] text-muted-foreground text-right">PTS</span>
                <span className="col-span-3 font-pixel text-[7px] text-muted-foreground text-right">AVG</span>
              </div>
              {profiles.map((p, i) => (
                <Link
                  to={`/bowler/${p.user_id}`}
                  key={p.id}
                  className={`grid grid-cols-12 px-3 py-2 items-center ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} ${i < 3 ? "border-l-2 border-l-secondary" : ""} hover:bg-muted/50 transition-all`}
                >
                  <span className="col-span-1 text-xs text-muted-foreground">{i + 1}</span>
                  <div className="col-span-5">
                    <p className="text-xs text-foreground truncate">{p.username}</p>
                    <p className="text-[10px] text-muted-foreground">{p.hometown || ""}</p>
                  </div>
                  <span className="col-span-3 text-xs text-primary text-right font-bold">{p.total_points.toLocaleString()}</span>
                  <span className="col-span-3 text-xs text-foreground text-right">{Math.round(p.bowling_average)}</span>
                </Link>
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

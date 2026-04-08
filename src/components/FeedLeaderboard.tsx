import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const FeedLeaderboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(10);
      setProfiles(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="border border-border bg-card">
      <div className="bg-muted px-4 py-3 border-b border-border">
        <h3 className="text-xs text-primary font-bold">🏆 THE BOARD</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center p-4">Loading...</p>
        ) : profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center p-4">No bowlers yet.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left text-muted-foreground">Rank</th>
                <th className="border border-border p-2 text-left text-muted-foreground">Bowler</th>
                <th className="border border-border p-2 text-right text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="border border-border p-2 text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="border border-border p-2">
                    <Link to={`/bowler/${p.user_id}`} className="text-primary hover:underline">
                      {p.username}
                    </Link>
                  </td>
                  <td className="border border-border p-2 text-right text-primary font-bold">
                    {p.total_points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t border-border px-4 py-2">
        <Link to="/leaderboard" className="text-xs text-primary hover:underline">[View Full Leaderboard →]</Link>
      </div>
    </div>
  );
};

export default FeedLeaderboard;

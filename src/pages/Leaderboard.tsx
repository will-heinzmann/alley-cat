import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Leaderboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").order("total_points", { ascending: false }).limit(50);
      setProfiles(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4">
        <Link to="/" className="text-primary text-xs">← Back</Link>
        <h1 className="text-lg text-primary mt-1">🏆 GLOBAL TOP CATS</h1>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4">
        {profiles.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No bowlers yet. Sign up and log games!</p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left text-xs text-muted-foreground">#</th>
                  <th className="border border-border p-2 text-left text-xs text-muted-foreground">Bowler</th>
                  <th className="border border-border p-2 text-right text-xs text-muted-foreground">Points</th>
                  <th className="border border-border p-2 text-right text-xs text-muted-foreground">Avg</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <td className="border border-border p-2 text-muted-foreground">{i + 1}</td>
                    <td className="border border-border p-2">
                      <Link to={`/bowler/${p.user_id}`} className="text-primary hover:underline">{p.username}</Link>
                      {p.hometown && <span className="text-xs text-muted-foreground ml-2">({p.hometown})</span>}
                    </td>
                    <td className="border border-border p-2 text-right text-primary font-bold">{p.total_points.toLocaleString()}</td>
                    <td className="border border-border p-2 text-right text-foreground">{Math.round(p.bowling_average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border border-border bg-card p-3 mt-4">
              <p className="text-sm text-primary font-bold mb-1">AlleyPoints:</p>
              <p className="text-xs text-foreground">🎳 Log a game = <span className="text-secondary font-bold">+50 pts</span></p>
              <p className="text-xs text-foreground">📝 Write a review = <span className="text-primary font-bold">+20 pts</span></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Legend {
  user_id: string;
  username: string;
  avg_last10: number;
  games_count: number;
}

interface Props {
  alleyId: string;
  alleyName: string;
}

const LocalLegends = ({ alleyId, alleyName }: Props) => {
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Pull recent games at this alley, then group client-side and average last 10 per user
      const { data: games } = await supabase
        .from("games")
        .select("user_id, score, created_at")
        .eq("alley_id", alleyId)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (!games || games.length === 0) {
        setLegends([]);
        setLoading(false);
        return;
      }

      const byUser = new Map<string, number[]>();
      for (const g of games) {
        const arr = byUser.get(g.user_id) || [];
        if (arr.length < 10) arr.push(g.score);
        byUser.set(g.user_id, arr);
      }

      const candidates = [...byUser.entries()]
        .map(([uid, scores]) => ({
          user_id: uid,
          scores,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        }))
        .filter((c) => c.scores.length >= 3) // need a baseline
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      if (candidates.length === 0) {
        setLegends([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", candidates.map((c) => c.user_id));
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.username]));

      setLegends(
        candidates.map((c) => ({
          user_id: c.user_id,
          username: profileMap.get(c.user_id) || "Unknown",
          avg_last10: Math.round(c.avg),
          games_count: c.scores.length,
        }))
      );
      setLoading(false);
    };
    load();
  }, [alleyId]);

  return (
    <div className="border border-border bg-card">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <h3 className="text-xs text-primary font-bold">👑 LOCAL LEGENDS — {alleyName.toUpperCase()}</h3>
        <p className="text-[10px] text-muted-foreground">Top 5 averages over last 10 games at this alley</p>
      </div>
      <div className="p-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center p-4">Loading…</p>
        ) : legends.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center p-4">
            Not enough games yet. Bowl 3+ games here to claim the throne!
          </p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-1 text-left text-muted-foreground">#</th>
                <th className="border border-border p-1 text-left text-muted-foreground">Bowler</th>
                <th className="border border-border p-1 text-right text-muted-foreground">Avg</th>
                <th className="border border-border p-1 text-right text-muted-foreground">Games</th>
              </tr>
            </thead>
            <tbody>
              {legends.map((l, i) => (
                <tr key={l.user_id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="border border-border p-1 text-muted-foreground">
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="border border-border p-1">
                    <Link to={`/bowler/${l.user_id}`} className="text-primary hover:underline">{l.username}</Link>
                  </td>
                  <td className="border border-border p-1 text-right text-secondary font-bold">{l.avg_last10}</td>
                  <td className="border border-border p-1 text-right text-muted-foreground">{l.games_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LocalLegends;

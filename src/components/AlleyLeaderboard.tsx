import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  high_score: number;
  avg_score: number;
  games_count: number;
}

interface AlleyLeaderboardProps {
  alleyId: string;
  alleyName: string;
}

const AlleyLeaderboard = ({ alleyId, alleyName }: AlleyLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"weekly" | "alltime">("alltime");

  useEffect(() => {
    fetchLeaderboard();
  }, [alleyId, timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    let query = supabase
      .from("games")
      .select("user_id, score, date")
      .eq("alley_id", alleyId);

    if (timeframe === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("date", weekAgo.toISOString().split("T")[0]);
    }

    const { data: games } = await query;
    if (!games || games.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Group by user
    const userMap = new Map<string, { scores: number[] }>();
    games.forEach((g) => {
      const existing = userMap.get(g.user_id) || { scores: [] };
      existing.scores.push(g.score);
      userMap.set(g.user_id, existing);
    });

    // Fetch usernames
    const userIds = [...userMap.keys()];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.username]));

    const leaderboard: LeaderboardEntry[] = userIds.map((uid) => {
      const { scores } = userMap.get(uid)!;
      return {
        user_id: uid,
        username: profileMap.get(uid) || "Unknown",
        high_score: Math.max(...scores),
        avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        games_count: scores.length,
      };
    });

    leaderboard.sort((a, b) => b.high_score - a.high_score);
    setEntries(leaderboard.slice(0, 20));
    setLoading(false);
  };

  return (
    <div className="border border-border bg-card">
      <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs text-primary font-bold">🏆 {alleyName.toUpperCase()} LEADERBOARD</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setTimeframe("weekly")}
            className={`text-[10px] px-2 py-0.5 border ${timeframe === "weekly" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
          >
            [Week]
          </button>
          <button
            onClick={() => setTimeframe("alltime")}
            className={`text-[10px] px-2 py-0.5 border ${timeframe === "alltime" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
          >
            [All-Time]
          </button>
        </div>
      </div>
      <div className="p-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center p-4">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center p-4">
            No games logged {timeframe === "weekly" ? "this week" : "yet"}. Be the first!
          </p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-1 text-left text-muted-foreground">#</th>
                <th className="border border-border p-1 text-left text-muted-foreground">Bowler</th>
                <th className="border border-border p-1 text-right text-muted-foreground">High</th>
                <th className="border border-border p-1 text-right text-muted-foreground">Avg</th>
                <th className="border border-border p-1 text-right text-muted-foreground">Games</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.user_id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                  <td className="border border-border p-1 text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="border border-border p-1">
                    <Link to={`/bowler/${entry.user_id}`} className="text-primary hover:underline">
                      {entry.username}
                    </Link>
                  </td>
                  <td className="border border-border p-1 text-right text-secondary font-bold">{entry.high_score}</td>
                  <td className="border border-border p-1 text-right text-foreground">{entry.avg_score}</td>
                  <td className="border border-border p-1 text-right text-muted-foreground">{entry.games_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AlleyLeaderboard;

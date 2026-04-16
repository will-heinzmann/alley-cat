import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type TimePeriod = "last3" | "last10" | "all";

interface BoardEntry {
  user_id: string;
  username: string;
  average: number;
  games_count: number;
}

const FeedLeaderboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [allGames, setAllGames] = useState<{ user_id: string; score: number; created_at: string }[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all games (scores only)
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from("games")
          .select("user_id, score, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }
      setAllGames(all);

      // Fetch all profiles for username mapping
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username");
      const pMap = new Map((profilesData || []).map((p) => [p.user_id, p.username]));
      setProfiles(pMap);

      // Fetch follows for current user
      if (user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        setFollowingIds(new Set((follows || []).map((f) => f.following_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const computeBoard = useMemo(() => {
    // Group games by user
    const byUser = new Map<string, { score: number; created_at: string }[]>();
    for (const g of allGames) {
      if (!byUser.has(g.user_id)) byUser.set(g.user_id, []);
      byUser.get(g.user_id)!.push(g);
    }

    // Each user's games are already sorted desc by created_at
    const entries: BoardEntry[] = [];
    for (const [uid, games] of byUser) {
      const limit = period === "last3" ? 3 : period === "last10" ? 10 : games.length;
      const slice = games.slice(0, limit);
      if (slice.length === 0) continue;
      const totalPins = slice.reduce((s, g) => s + g.score, 0);
      entries.push({
        user_id: uid,
        username: profiles.get(uid) || "Unknown",
        average: totalPins / slice.length,
        games_count: slice.length,
      });
    }

    entries.sort((a, b) => b.average - a.average);
    return entries;
  }, [allGames, profiles, period]);

  const circleBoard = useMemo(() => {
    if (!user) return [];
    const circleIds = new Set([user.id, ...followingIds]);
    return computeBoard.filter((e) => circleIds.has(e.user_id)).slice(0, 10);
  }, [computeBoard, user, followingIds]);

  const globalBoard = useMemo(() => computeBoard.slice(0, 10), [computeBoard]);

  const periodLabel = period === "last3" ? "Last 3" : period === "last10" ? "Last 10" : "All-Time";

  const renderTable = (entries: BoardEntry[], title: string, emoji: string) => (
    <div>
      <div className="bg-muted px-3 py-2 border-b border-border">
        <h3 className="text-xs text-primary font-bold">{emoji} {title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center p-3">
          {title.includes("Circle") ? "Follow bowlers to see them here." : "No games logged yet."}
        </p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-1.5 text-left text-muted-foreground w-8">#</th>
              <th className="border border-border p-1.5 text-left text-muted-foreground">Bowler</th>
              <th className="border border-border p-1.5 text-right text-muted-foreground">AVG</th>
              <th className="border border-border p-1.5 text-right text-muted-foreground">G</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.user_id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                <td className="border border-border p-1.5 text-muted-foreground">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td className="border border-border p-1.5">
                  <Link to={`/bowler/${e.user_id}`} className="text-primary hover:underline font-bold tracking-wide" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px" }}>
                    {e.username}
                  </Link>
                </td>
                <td className="border border-border p-1.5 text-right text-primary font-bold text-sm">
                  {e.average.toFixed(1)}
                </td>
                <td className="border border-border p-1.5 text-right text-muted-foreground">
                  {e.games_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="border border-border bg-card">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <h3 className="text-xs text-primary font-bold">🏆 THE BOARDS</h3>
      </div>

      {/* Time Period Toggle */}
      <div className="flex border-b border-border">
        {(["last3", "last10", "all"] as TimePeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-xs py-1.5 border-r border-border last:border-r-0 transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "last3" ? "Last 3" : p === "last10" ? "Last 10" : "All-Time"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center p-4">Loading...</p>
      ) : (
        <div>
          {user && renderTable(circleBoard, "YOUR CIRCLE", "👥")}
          <div className={user ? "border-t-2 border-primary" : ""}>
            {renderTable(globalBoard, "GLOBAL ALLEY", "🌎")}
          </div>
        </div>
      )}

      <div className="border-t border-border px-3 py-2">
        <Link to="/leaderboard" className="text-xs text-primary hover:underline">[View Full Leaderboard →]</Link>
      </div>
    </div>
  );
};

export default FeedLeaderboard;

import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type TimePeriod = "last3" | "last10" | "all";

interface BoardEntry {
  user_id: string;
  username: string;
  hometown: string | null;
  average: number;
  games_count: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>("all");
  const [allGames, setAllGames] = useState<{ user_id: string; score: number; created_at: string }[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { username: string; hometown: string | null }>>(new Map());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

      const { data: profilesData } = await supabase.from("profiles").select("user_id, username, hometown");
      const pMap = new Map((profilesData || []).map((p) => [p.user_id, { username: p.username, hometown: p.hometown }]));
      setProfilesMap(pMap);

      if (user) {
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        setFollowingIds(new Set((follows || []).map((f) => f.following_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const computeBoard = useMemo(() => {
    const byUser = new Map<string, { score: number; created_at: string }[]>();
    for (const g of allGames) {
      if (!byUser.has(g.user_id)) byUser.set(g.user_id, []);
      byUser.get(g.user_id)!.push(g);
    }

    const entries: BoardEntry[] = [];
    for (const [uid, games] of byUser) {
      const limit = period === "last3" ? 3 : period === "last10" ? 10 : games.length;
      const slice = games.slice(0, limit);
      if (slice.length === 0) continue;
      const totalPins = slice.reduce((s, g) => s + g.score, 0);
      const profile = profilesMap.get(uid);
      entries.push({
        user_id: uid,
        username: profile?.username || "Unknown",
        hometown: profile?.hometown || null,
        average: totalPins / slice.length,
        games_count: slice.length,
      });
    }

    entries.sort((a, b) => b.average - a.average);
    return entries;
  }, [allGames, profilesMap, period]);

  const circleBoard = useMemo(() => {
    if (!user) return [];
    const circleIds = new Set([user.id, ...followingIds]);
    return computeBoard.filter((e) => circleIds.has(e.user_id));
  }, [computeBoard, user, followingIds]);

  const renderTable = (entries: BoardEntry[]) => (
    <table className="w-full border-collapse border border-border text-sm">
      <thead>
        <tr className="bg-muted">
          <th className="border border-border p-2 text-left text-xs text-muted-foreground w-10">#</th>
          <th className="border border-border p-2 text-left text-xs text-muted-foreground">Bowler</th>
          <th className="border border-border p-2 text-right text-xs text-muted-foreground">AVG</th>
          <th className="border border-border p-2 text-right text-xs text-muted-foreground">Games</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={e.user_id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
            <td className="border border-border p-2 text-muted-foreground">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </td>
            <td className="border border-border p-2">
              <Link to={`/bowler/${e.user_id}`} className="text-primary hover:underline font-bold">{e.username}</Link>
              {e.hometown && <span className="text-xs text-muted-foreground ml-2">({e.hometown})</span>}
            </td>
            <td className="border border-border p-2 text-right text-primary font-bold text-base">{e.average.toFixed(1)}</td>
            <td className="border border-border p-2 text-right text-foreground">{e.games_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;

  return (
    <>
      <Helmet>
        <title>Bowling Leaderboard — Top Averages | Alley Cat</title>
        <meta name="description" content="See the top-ranked bowlers on Alley Cat by bowling average. Filter by last 3 games, last 10 games, or all-time." />
        <link rel="canonical" href="https://alleycat-bowling.com/leaderboard" />
      </Helmet>
      <div className="min-h-screen pb-20">
        <header className="border-b border-border p-4">
          <Link to="/" className="text-primary text-xs">← Back</Link>
          <h1 className="text-lg text-primary mt-1">🏆 THE BOARDS</h1>
          <hr className="border-primary mt-2" />
        </header>

        <div className="p-4 space-y-4">
          {/* Time Period Toggle */}
          <div className="flex border border-border">
            {(["last3", "last10", "all"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 text-xs py-2 border-r border-border last:border-r-0 transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "last3" ? "Last 3 Games" : p === "last10" ? "Last 10 Games" : "All-Time"}
              </button>
            ))}
          </div>

          {/* Your Circle */}
          {user && (
            <div>
              <h2 className="text-sm text-primary font-bold border-b border-border pb-1 mb-2">👥 YOUR CIRCLE</h2>
              {circleBoard.length === 0 ? (
                <div className="border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Follow bowlers to see them here.</p>
                </div>
              ) : renderTable(circleBoard)}
            </div>
          )}

          {/* Global */}
          <div>
            <h2 className="text-sm text-primary font-bold border-b border-border pb-1 mb-2">🌎 GLOBAL ALLEY</h2>
            {computeBoard.length === 0 ? (
              <div className="border border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">No bowlers yet. Sign up and log games!</p>
              </div>
            ) : renderTable(computeBoard.slice(0, 50))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;

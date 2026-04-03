import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BowlerProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [yearStats, setYearStats] = useState({ games: 0, avgScore: 0, highScore: 0, totalPoints: 0 });

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, user]);

  const fetchData = async () => {
    const [profileRes, gamesRes, followersRes, followingRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId!).single(),
      supabase.from("games").select("*, alleys!games_alley_id_fkey(name, city, state)").eq("user_id", userId!).order("date", { ascending: false }).limit(20),
      supabase.from("follows").select("id").eq("following_id", userId!),
      supabase.from("follows").select("id").eq("follower_id", userId!),
    ]);
    setProfile(profileRes.data);
    const gamesData = gamesRes.data || [];
    setGames(gamesData);
    setFollowersCount(followersRes.data?.length || 0);
    setFollowingCount(followingRes.data?.length || 0);

    if (user && userId !== user.id) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId!);
      setIsFollowing((data?.length || 0) > 0);
    }

    const thisYear = new Date().getFullYear();
    const yearGames = gamesData.filter((g: any) => new Date(g.date).getFullYear() === thisYear);
    setYearStats({
      games: yearGames.length,
      avgScore: yearGames.length > 0 ? Math.round(yearGames.reduce((s: number, g: any) => s + g.score, 0) / yearGames.length) : 0,
      highScore: yearGames.length > 0 ? Math.max(...yearGames.map((g: any) => g.score)) : 0,
      totalPoints: profileRes.data?.total_points || 0,
    });
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    }
    setIsFollowing(!isFollowing);
    setFollowersCount((c) => isFollowing ? c - 1 : c + 1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Bowler not found.</p></div>;

  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4">
        <Link to="/" className="text-primary text-xs">← Back</Link>
        <h1 className="text-lg text-primary mt-1">
          {isOwnProfile ? "👤 My Stats" : `👤 ${profile.username}`}
        </h1>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Info */}
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-lg text-primary font-bold">{profile.username}</p>
              <p className="text-xs text-muted-foreground">{profile.hometown || "No hometown set"}</p>
            </div>
            {!isOwnProfile && user && (
              <button
                onClick={toggleFollow}
                className={`border border-border px-3 py-1 text-xs transition-colors ${
                  isFollowing ? "text-muted-foreground hover:text-destructive" : "bg-secondary text-secondary-foreground hover:opacity-80"
                }`}
              >
                {isFollowing ? "[Unfollow]" : "[Follow]"}
              </button>
            )}
          </div>
          <p className="text-xs text-foreground">
            <strong>{followersCount}</strong> followers · <strong>{followingCount}</strong> following · <strong>{profile.games_count}</strong> games
          </p>
          {profile.bio && <p className="text-xs text-muted-foreground italic mt-2">{profile.bio}</p>}
        </div>

        {/* Year Stats */}
        <div>
          <h2 className="text-sm text-secondary font-bold mb-2">📊 {new Date().getFullYear()} Season</h2>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-xs text-muted-foreground">Points</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">High</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">Avg</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">Games</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-card text-center">
                <td className="border border-border p-2 text-secondary font-bold">{yearStats.totalPoints}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.highScore || "-"}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.avgScore || "-"}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.games}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Game History */}
        <div>
          <h2 className="text-sm text-primary font-bold mb-2">🎳 Game History</h2>
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-border p-4 text-center">No games yet.</p>
          ) : (
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left text-xs text-muted-foreground">Alley</th>
                  <th className="border border-border p-2 text-xs text-muted-foreground">Date</th>
                  <th className="border border-border p-2 text-xs text-muted-foreground">Oil</th>
                  <th className="border border-border p-2 text-right text-xs text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, i) => {
                  const alley = Array.isArray(game.alleys) ? game.alleys[0] : game.alleys;
                  return (
                    <tr key={game.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                      <td className="border border-border p-2 text-foreground">{alley?.name || "Unknown"}</td>
                      <td className="border border-border p-2 text-center text-muted-foreground text-xs">{game.date?.slice(5)}</td>
                      <td className="border border-border p-2 text-center text-muted-foreground text-xs">{game.oil_condition?.slice(0, 3)}</td>
                      <td className="border border-border p-2 text-right text-primary font-bold">{game.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BowlerProfile;

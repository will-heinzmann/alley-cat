import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, User, Trophy, Target, TrendingUp, UserPlus, UserMinus } from "lucide-react";

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

    // Check if current user follows this bowler
    if (user && userId !== user.id) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId!);
      setIsFollowing((data?.length || 0) > 0);
    }

    // Year stats
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-xs text-muted-foreground animate-pulse-neon">LOADING...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-xs text-muted-foreground">BOWLER NOT FOUND</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/" className="text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-pixel text-xs text-primary neon-text">
          {isOwnProfile ? "MY STATS" : profile.username?.toUpperCase()}
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Header */}
        <div className="border-2 border-primary bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 border-2 border-secondary bg-muted flex items-center justify-center">
                <User size={24} className="text-secondary" />
              </div>
              <div>
                <h2 className="font-pixel text-sm text-primary neon-text">{profile.username}</h2>
                <p className="text-xs text-muted-foreground">{profile.hometown || "No hometown"}</p>
              </div>
            </div>
            {!isOwnProfile && user && (
              <button
                onClick={toggleFollow}
                className={`border-2 px-3 py-1.5 font-pixel text-[7px] flex items-center gap-1 transition-all ${
                  isFollowing
                    ? "border-muted text-muted-foreground hover:border-destructive hover:text-destructive"
                    : "border-secondary bg-secondary text-secondary-foreground hover:orange-border"
                }`}
              >
                {isFollowing ? <><UserMinus size={10} /> UNFOLLOW</> : <><UserPlus size={10} /> FOLLOW</>}
              </button>
            )}
          </div>

          {/* Follow counts */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="text-foreground"><strong>{followersCount}</strong> <span className="text-muted-foreground">followers</span></span>
            <span className="text-foreground"><strong>{followingCount}</strong> <span className="text-muted-foreground">following</span></span>
            <span className="text-foreground"><strong>{profile.games_count}</strong> <span className="text-muted-foreground">games</span></span>
          </div>

          {profile.bio && <p className="text-xs text-muted-foreground italic">{profile.bio}</p>}
        </div>

        {/* Year Stats */}
        <div>
          <h2 className="font-pixel text-[10px] text-secondary orange-text mb-2">
            {new Date().getFullYear()} SEASON
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Trophy, value: yearStats.totalPoints, label: "PTS", highlight: true },
              { icon: Target, value: yearStats.highScore || "-", label: "HIGH", highlight: false },
              { icon: TrendingUp, value: yearStats.avgScore || "-", label: "AVG", highlight: false },
              { icon: Target, value: yearStats.games, label: "GAMES", highlight: false },
            ].map((s, i) => (
              <div key={i} className="border-2 border-primary bg-muted/30 p-2 text-center">
                <s.icon size={14} className={s.highlight ? "text-secondary mx-auto mb-1" : "text-primary mx-auto mb-1"} />
                <p className={`font-pixel text-sm ${s.highlight ? "text-secondary" : "text-foreground"}`}>{s.value}</p>
                <p className="font-pixel text-[6px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Game History */}
        <div>
          <h2 className="font-pixel text-[10px] text-primary mb-2">GAME HISTORY</h2>
          {games.length === 0 ? (
            <div className="border-2 border-muted p-6 text-center">
              <p className="font-pixel text-[9px] text-muted-foreground">NO GAMES YET</p>
            </div>
          ) : (
            <div className="border-2 border-primary">
              <div className="grid grid-cols-12 bg-muted border-b-2 border-primary px-3 py-2">
                <span className="col-span-5 font-pixel text-[7px] text-muted-foreground">ALLEY</span>
                <span className="col-span-3 font-pixel text-[7px] text-muted-foreground">DATE</span>
                <span className="col-span-2 font-pixel text-[7px] text-muted-foreground text-right">OIL</span>
                <span className="col-span-2 font-pixel text-[7px] text-muted-foreground text-right">SCR</span>
              </div>
              {games.map((game, i) => {
                const alley = Array.isArray(game.alleys) ? game.alleys[0] : game.alleys;
                return (
                  <div
                    key={game.id}
                    className={`grid grid-cols-12 px-3 py-2 items-center ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}
                  >
                    <span className="col-span-5 text-xs text-foreground truncate">{alley?.name || "Unknown"}</span>
                    <span className="col-span-3 text-[10px] text-muted-foreground">{game.date?.slice(5)}</span>
                    <span className="col-span-2 text-[10px] text-muted-foreground text-right">{game.oil_condition?.slice(0, 3)}</span>
                    <span className="col-span-2 text-xs text-primary text-right font-bold">{game.score}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BowlerProfile;

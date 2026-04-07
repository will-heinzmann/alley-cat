import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface FeedGame {
  id: string;
  score: number;
  date: string;
  oil_condition: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
  alleys: { name: string; city: string; state: string } | null;
  likes_count: number;
  is_liked: boolean;
  is_own: boolean;
  is_following: boolean;
}

const Feed = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<FeedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    // Guard: no feed for guests
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    const followingIds = (follows || []).map((f) => f.following_id);
    const userAndFollowing = [...followingIds, user.id];

    const { data } = await supabase
      .from("games")
      .select(`id, score, date, oil_condition, notes, image_url, created_at, user_id,
        alleys!games_alley_id_fkey(name, city, state)`)
      .in("user_id", userAndFollowing)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map((g) => g.user_id))];
      const { data: profilesData } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

      const gameIds = data.map((g) => g.id);
      const { data: likesData } = gameIds.length > 0
        ? await supabase.from("game_likes").select("game_id, user_id").in("game_id", gameIds)
        : { data: [] };

      const followingSet = new Set(followingIds);

      const processed = data.map((g) => {
        const gameLikes = (likesData || []).filter((l) => l.game_id === g.id);
        const profile = profileMap.get(g.user_id);
        return {
          ...g,
          profiles: profile ? { username: profile.username, avatar_url: profile.avatar_url } : null,
          alleys: Array.isArray(g.alleys) ? g.alleys[0] : g.alleys,
          likes_count: gameLikes.length,
          is_liked: gameLikes.some((l) => l.user_id === user.id),
          is_own: g.user_id === user.id,
          is_following: followingSet.has(g.user_id),
        };
      });

      // Followed users first, then own, sorted by created_at within each group
      processed.sort((a, b) => {
        if (a.is_following !== b.is_following) return a.is_following ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setGames(processed);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, [user]);

  const toggleLike = async (gameId: string, isLiked: boolean) => {
    if (!user) return;
    if (isLiked) {
      await supabase.from("game_likes").delete().eq("user_id", user.id).eq("game_id", gameId);
    } else {
      await supabase.from("game_likes").insert({ user_id: user.id, game_id: gameId });
    }
    fetchFeed();
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4 text-center">
        <h1 className="text-2xl text-primary tracking-wide">🎳 ALLEY CAT 🎳</h1>
        <p className="text-sm text-secondary mt-1">Your Feed</p>
        <hr className="border-primary mt-3" />
      </header>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground p-8">Loading...</p>
      ) : !user ? (
        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Track your scores, follow friends, and find alleys.</p>
          <div className="flex flex-col items-center gap-2">
            <Link to="/auth" className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-80">
              🎳 Log Your First Game
            </Link>
            <Link to="/auth" className="text-primary text-xs hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      ) : games.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">No games in your feed yet.</p>
          <p className="text-sm text-foreground">
            Follow other bowlers or <Link to="/log" className="text-primary">log your first game</Link>!
          </p>
          <p className="mt-3">
            <Link to="/alleys" className="text-primary text-sm">[Browse Alleys]</Link>
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {games.map((game) => (
            <div key={game.id} className="border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <Link to={`/bowler/${game.user_id}`} className="text-primary text-sm font-bold hover:underline">
                  {game.profiles?.username || "Unknown"}
                </Link>
                <span className="text-xl text-primary font-bold">{game.score}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
              </p>
              {game.alleys && (
                <p className="text-xs text-muted-foreground">
                  📍 {game.alleys.name} — {game.alleys.city}, {game.alleys.state}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-foreground border border-border px-1">{game.oil_condition}</span>
                <span className="text-muted-foreground">{game.date}</span>
              </div>
              {game.image_url && (
                <img src={game.image_url} alt="Game photo" className="mt-2 max-h-48 border border-border w-full object-cover" />
              )}
              {game.notes && <p className="text-xs text-muted-foreground italic mt-2">"{game.notes}"</p>}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => toggleLike(game.id, game.is_liked)}
                  className={`text-xs transition-colors ${game.is_liked ? "text-secondary font-bold" : "text-muted-foreground hover:text-secondary"}`}
                >
                  {game.is_liked ? "♥" : "♡"} {game.likes_count} likes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center p-4">
        <hr className="border-border mb-3" />
        <p className="text-xs text-muted-foreground">⚡ Alley Cat © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default Feed;

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
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
  alleys: { name: string; city: string; state: string } | null;
  likes_count: number;
  is_liked: boolean;
}

const Feed = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<FeedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    let followingIds: string[] = [];
    if (user) {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      followingIds = (follows || []).map((f) => f.following_id);
      followingIds.push(user.id);
    }

    const query = supabase
      .from("games")
      .select(`id, score, date, oil_condition, notes, created_at, user_id,
        profiles!games_user_id_fkey(username, avatar_url),
        alleys!games_alley_id_fkey(name, city, state)`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (followingIds.length > 0) query.in("user_id", followingIds);

    const { data } = await query;
    if (data) {
      const gameIds = data.map((g) => g.id);
      const { data: likesData } = await supabase.from("game_likes").select("game_id, user_id").in("game_id", gameIds);
      const processed = data.map((g) => {
        const gameLikes = (likesData || []).filter((l) => l.game_id === g.id);
        return {
          ...g,
          profiles: Array.isArray(g.profiles) ? g.profiles[0] : g.profiles,
          alleys: Array.isArray(g.alleys) ? g.alleys[0] : g.alleys,
          likes_count: gameLikes.length,
          is_liked: user ? gameLikes.some((l) => l.user_id === user.id) : false,
        };
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

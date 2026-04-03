import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, MapPin } from "lucide-react";
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
    // Get games from people the user follows + own games
    let followingIds: string[] = [];

    if (user) {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      followingIds = (follows || []).map((f) => f.following_id);
      followingIds.push(user.id);
    }

    const query = supabase
      .from("games")
      .select(`
        id, score, date, oil_condition, notes, created_at, user_id,
        profiles!games_user_id_fkey(username, avatar_url),
        alleys!games_alley_id_fkey(name, city, state)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (followingIds.length > 0) {
      query.in("user_id", followingIds);
    }

    const { data } = await query;

    if (data) {
      // Get likes info
      const gameIds = data.map((g) => g.id);
      const { data: likesData } = await supabase
        .from("game_likes")
        .select("game_id, user_id")
        .in("game_id", gameIds);

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

  useEffect(() => {
    fetchFeed();
  }, [user]);

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
      <header className="border-b-2 border-primary p-4">
        <h1 className="font-pixel text-lg text-primary neon-text text-center animate-flicker">
          ALLEY CAT
        </h1>
        <p className="font-pixel text-[8px] text-secondary text-center mt-1 orange-text">
          YOUR FEED
        </p>
      </header>

      {loading ? (
        <div className="p-8 text-center">
          <p className="font-pixel text-xs text-muted-foreground animate-pulse-neon">LOADING...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="p-8 text-center space-y-3">
          <p className="font-pixel text-xs text-muted-foreground">NO GAMES IN YOUR FEED</p>
          <p className="text-sm text-muted-foreground">
            Follow other bowlers or <Link to="/log" className="text-primary neon-text">log your first game</Link>!
          </p>
          <Link
            to="/alleys"
            className="inline-block border-2 border-primary px-4 py-2 font-pixel text-[8px] text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            BROWSE ALLEYS
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {games.map((game) => (
            <div key={game.id} className="border-2 border-muted bg-card p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <Link
                  to={`/bowler/${game.user_id}`}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 border-2 border-secondary bg-muted flex items-center justify-center">
                    <span className="font-pixel text-[8px] text-secondary">
                      {game.profiles?.username?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {game.profiles?.username || "Unknown"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                <div className="text-right">
                  <p className="font-pixel text-2xl text-primary neon-text">{game.score}</p>
                </div>
              </div>

              {/* Alley info */}
              {game.alleys && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin size={10} />
                  <span>{game.alleys.name} · {game.alleys.city}, {game.alleys.state}</span>
                </div>
              )}

              {/* Oil + notes */}
              <div className="flex items-center gap-2 mb-3">
                <span className="border border-primary px-2 py-0.5 font-pixel text-[7px] text-primary">
                  {game.oil_condition}
                </span>
                <span className="text-[10px] text-muted-foreground">{game.date}</span>
              </div>

              {game.notes && (
                <p className="text-xs text-muted-foreground italic mb-3">"{game.notes}"</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 border-t border-muted pt-2">
                <button
                  onClick={() => toggleLike(game.id, game.is_liked)}
                  className={`flex items-center gap-1 text-xs transition-all ${
                    game.is_liked ? "text-secondary" : "text-muted-foreground hover:text-secondary"
                  }`}
                >
                  <Heart size={14} fill={game.is_liked ? "currentColor" : "none"} />
                  <span>{game.likes_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;

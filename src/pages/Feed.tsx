import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import FeedLeaderboard from "@/components/FeedLeaderboard";
import ImageLightbox from "@/components/ImageLightbox";

interface FeedGame {
  id: string;
  score: number;
  date: string;
  oil_condition: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null;
  alleys: { name: string; slug: string; city: string; state: string } | null;
  likes_count: number;
  is_liked: boolean;
  is_own: boolean;
  is_following: boolean;
}

const Feed = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<FeedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const fetchFeed = async () => {
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
        alleys!games_alley_id_fkey(name, slug, city, state)`)
      .in("user_id", userAndFollowing)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map((g) => g.user_id))];
      const { data: profilesData } = await supabase.from("profiles").select("user_id, username, full_name, avatar_url").in("user_id", userIds);
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
          profiles: profile ? { username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url } : null,
          alleys: Array.isArray(g.alleys) ? g.alleys[0] : g.alleys,
          likes_count: gameLikes.length,
          is_liked: gameLikes.some((l) => l.user_id === user.id),
          is_own: g.user_id === user.id,
          is_following: followingSet.has(g.user_id),
        };
      });

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
    <>
      <Helmet>
        <title>Alley Cat — Track Bowling Scores, Find Alleys & Compete</title>
        <meta name="description" content="Alley Cat is the ultimate bowling companion. Track your scores frame-by-frame, discover 1,600+ bowling alleys, compare stats with friends, and climb the leaderboard." />
        <link rel="canonical" href="https://alleycat-bowling.com/" />
      </Helmet>
    <div className="min-h-screen pb-20">
      {/* Dashboard grid: single column mobile, two columns on lg+ */}
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-b border-primary pb-2">
              <h2 className="text-lg text-primary font-bold">🏠 HOME FEED</h2>
            </div>

            {loading ? (
              <p className="text-center text-sm text-muted-foreground p-8">Loading...</p>
            ) : !user ? (
              <div className="border border-border bg-card p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">Track your scores, follow friends, and find alleys.</p>
                <div className="flex flex-col items-center gap-2">
                  <Link to="/auth?mode=signup" className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-80">
                    🎳 Create Account & Log Your First Game
                  </Link>
                  <Link to="/auth" className="text-primary text-xs hover:underline">
                    Already have an account? Sign in
                  </Link>
                </div>
              </div>
            ) : games.length === 0 ? (
              <div className="border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No games in your feed yet.</p>
                <p className="text-sm text-foreground">
                  Follow other bowlers or <Link to="/log" className="text-primary">log your first game</Link>!
                </p>
                <p className="mt-3">
                  <Link to="/alleys" className="text-primary text-sm">[Browse Alleys]</Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <div key={game.id} className="border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Link to={`/bowler/${game.user_id}`} className="text-primary text-sm font-bold hover:underline">
                          {game.profiles?.username || "Unknown"}
                        </Link>
                        {game.profiles?.full_name && (
                          <p className="text-[10px] text-muted-foreground leading-tight">{game.profiles.full_name}</p>
                        )}
                      </div>
                      <span className="text-xl text-primary font-bold">{game.score}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                    </p>
                    {game.alleys && (
                      <p className="text-xs text-muted-foreground">
                        📍 <Link to={`/alley/${game.alleys.slug}`} className="text-primary hover:underline">{game.alleys.name}</Link> — {game.alleys.city}, {game.alleys.state}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-foreground border border-border px-1">{game.oil_condition}</span>
                      <span className="text-muted-foreground">{game.date}</span>
                    </div>
                    {game.image_url && (
                      <img
                        src={game.image_url}
                        alt="Game photo"
                        className="mt-2 max-h-48 border border-border w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightbox({ images: [game.image_url!], index: 0 })}
                      />
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
          </div>

          {/* Sidebar Column - stacks below on mobile */}
          <div className="space-y-6">
            <FeedLeaderboard />

            {user && (
              <div className="border border-border bg-card p-4">
                <h3 className="text-xs text-primary font-bold mb-2">⚡ QUICK LINKS</h3>
                <div className="space-y-1">
                  <Link to="/log" className="block text-xs text-foreground hover:text-primary">[📝 Log a Game]</Link>
                  <Link to="/alleys" className="block text-xs text-foreground hover:text-primary">[🎳 Browse Alleys]</Link>
                  <Link to="/league" className="block text-xs text-foreground hover:text-primary">[👥 Group Play]</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEO Footer Section */}
      <div className="max-w-4xl mx-auto px-4 py-6 mt-4 bg-muted/40 border-t border-border">
        <h2 className="text-sm text-primary border-b border-border pb-1 mb-3">🎳 About Alley Cat</h2>
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            Alley Cat is the free bowling companion built for everyone — from casual weekend rollers to 
            die-hard league warriors chasing that elusive 300 game. Think of it as Strava, but for the lanes. 
            Log every frame, track your spare conversions, monitor your average over time, and see exactly 
            where your game is improving (or where that 7-10 split keeps haunting you).
          </p>
          <p>
            With a directory of over 1,600 bowling alleys across the United States, finding your next lane 
            is easier than picking up a single-pin spare. Search by city, state, or rating — and once you're 
            there, log your scores and leave a review so other bowlers know what to expect. Whether you're 
            searching for "bowling near me" or planning a road trip to the best-rated alleys in the country, 
            Alley Cat has you covered.
          </p>
          <p>
            Compete on the global leaderboard, follow your friends' games in the social feed, or organize 
            a group session with Group Play mode. Alley Cat tracks it all — your high games, your 200+ rate, 
            your series averages, and your all-time stats. It's the scorekeeping app your league notebook 
            wishes it could be. Lace up, grab your ball, and let Alley Cat handle the rest. 🐱
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/alleys" className="text-xs text-primary underline">Browse All Alleys</Link>
          <Link to="/leaderboard" className="text-xs text-primary underline">View Leaderboard</Link>
          <Link to="/blog" className="text-xs text-primary underline">Bowling Tips & Blog</Link>
          <Link to="/auth?mode=signup" className="text-xs text-primary underline">Create Free Account</Link>
        </div>
      </div>

      <div className="text-center p-4">
        <hr className="border-border mb-3" />
        <p className="text-xs text-muted-foreground">⚡ Alley Cat © {new Date().getFullYear()}</p>
      </div>
    </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          currentIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
        />
      )}
    </>
  );
};

export default Feed;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface PublicGame {
  id: string;
  score: number;
  created_at: string;
  user_id: string;
  username: string | null;
  alley_name: string | null;
  alley_slug: string | null;
  alley_city: string | null;
  alley_state: string | null;
}

const PublicActivityFeed = () => {
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("games")
        .select("id, score, created_at, user_id, alleys!games_alley_id_fkey(name, slug, city, state)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data) {
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.map((g) => g.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, username").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.username]));

      const processed: PublicGame[] = data.map((g) => {
        const alley = Array.isArray(g.alleys) ? g.alleys[0] : g.alleys;
        return {
          id: g.id,
          score: g.score,
          created_at: g.created_at,
          user_id: g.user_id,
          username: profileMap.get(g.user_id) || "Unknown",
          alley_name: alley?.name ?? null,
          alley_slug: alley?.slug ?? null,
          alley_city: alley?.city ?? null,
          alley_state: alley?.state ?? null,
        };
      });

      setGames(processed);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground p-4">Loading recent activity…</p>;
  }

  if (games.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground p-4">
        No games logged yet. <Link to="/auth?mode=signup" className="text-primary underline">Be the first!</Link>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {games.map((g) => (
        <li key={g.id} className="border border-border bg-card p-3">
          <p className="text-sm text-foreground">
            <Link to={`/bowler/${g.user_id}`} className="text-primary font-bold hover:underline">
              {g.username}
            </Link>{" "}
            just bowled a <span className="text-primary font-bold">{g.score}</span>
            {g.alley_name && g.alley_slug && (
              <>
                {" "}at{" "}
                <Link to={`/alley/${g.alley_slug}`} className="text-primary hover:underline">
                  {g.alley_name}
                </Link>
                {g.alley_city && (
                  <span className="text-muted-foreground"> — {g.alley_city}, {g.alley_state}</span>
                )}
              </>
            )}
            !
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(g.created_at), { addSuffix: true })}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default PublicActivityFeed;

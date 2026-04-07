import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavoriteAlleys = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return; }
    setLoading(true);
    supabase
      .from("favorite_alleys")
      .select("alley_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setFavoriteIds(new Set((data || []).map((f: any) => f.alley_id)));
        setLoading(false);
      });
  }, [user]);

  const toggleFavorite = useCallback(async (alleyId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(alleyId);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(alleyId) : next.add(alleyId);
      return next;
    });
    if (isFav) {
      await supabase.from("favorite_alleys").delete().eq("user_id", user.id).eq("alley_id", alleyId);
    } else {
      await supabase.from("favorite_alleys").insert({ user_id: user.id, alley_id: alleyId });
    }
  }, [user, favoriteIds]);

  return { favoriteIds, toggleFavorite, loading };
};

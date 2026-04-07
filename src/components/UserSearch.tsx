import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface SearchResult {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const getAvatarUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

const UserSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const searchTerm = `%${query.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
        .limit(10);
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <input
        type="text"
        placeholder="🔍 Search bowlers..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        className="w-full border border-border bg-input px-2 py-1 text-foreground text-xs outline-none placeholder:text-muted-foreground"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border border-border bg-card max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground p-2">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No bowlers found.</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.user_id}
                to={`/bowler/${r.user_id}`}
                onClick={() => { setOpen(false); setQuery(""); }}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors"
              >
                {r.avatar_url ? (
                  <img src={getAvatarUrl(r.avatar_url) || ""} alt="" className="w-6 h-6 border border-border object-cover" />
                ) : (
                  <div className="w-6 h-6 border border-border bg-muted flex items-center justify-center text-xs">🎳</div>
                )}
                <div>
                  <p className="text-xs text-primary font-bold">{r.username}</p>
                  {r.full_name && <p className="text-[10px] text-muted-foreground">{r.full_name}</p>}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;

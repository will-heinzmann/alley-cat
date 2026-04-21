import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username: string;
}

interface Props {
  gameId: string;
}

const GameComments = ({ gameId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("game_comments")
      .select("id, user_id, body, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (!data) {
      setComments([]);
      setLoading(false);
      return;
    }
    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, username").in("user_id", userIds)
      : { data: [] };
    const m = new Map((profiles || []).map((p) => [p.user_id, p.username]));
    setComments(data.map((c) => ({ ...c, username: m.get(c.user_id) || "Unknown" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [gameId]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase
      .from("game_comments")
      .insert({ game_id: gameId, user_id: user.id, body: body.trim().slice(0, 500) });
    setPosting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setBody("");
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("game_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  return (
    <div className="border-t border-border mt-2 pt-2 space-y-2">
      {loading ? (
        <p className="text-[11px] text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No comments yet.</p>
      ) : (
        <ul className="space-y-1">
          {comments.map((c) => (
            <li key={c.id} className="text-xs border-l-2 border-border pl-2">
              <div className="flex items-center justify-between">
                <Link to={`/bowler/${c.user_id}`} className="text-primary font-bold hover:underline">
                  {c.username}
                </Link>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  {user?.id === c.user_id && (
                    <button onClick={() => remove(c.id)} className="ml-2 text-destructive hover:underline">
                      [delete]
                    </button>
                  )}
                </span>
              </div>
              <p className="text-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={post} className="flex gap-1">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Leave a quick comment…"
            className="flex-1 border border-border bg-input px-2 py-1 text-foreground text-xs outline-none"
          />
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="border border-primary bg-primary text-primary-foreground px-2 py-1 text-xs hover:opacity-80 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to comment.
        </p>
      )}
    </div>
  );
};

export default GameComments;

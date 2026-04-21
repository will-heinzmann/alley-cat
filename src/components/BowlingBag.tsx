import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface BowlingBall {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  weight: number | null;
  color: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Props {
  ownerId: string;
}

const BowlingBag = ({ ownerId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.id === ownerId;
  const [balls, setBalls] = useState<BowlingBall[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; avg: number; high: number }>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", brand: "", weight: "", color: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const { data: ballsData } = await supabase
      .from("bowling_balls")
      .select("*")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true });
    const list = (ballsData || []) as BowlingBall[];
    setBalls(list);

    if (list.length > 0) {
      const { data: gamesData } = await supabase
        .from("games")
        .select("ball_id, score")
        .eq("user_id", ownerId)
        .not("ball_id", "is", null);

      const map: Record<string, number[]> = {};
      for (const g of gamesData || []) {
        if (!g.ball_id) continue;
        (map[g.ball_id] ||= []).push(g.score);
      }
      const newStats: Record<string, { count: number; avg: number; high: number }> = {};
      for (const [bid, scores] of Object.entries(map)) {
        newStats[bid] = {
          count: scores.length,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          high: Math.max(...scores),
        };
      }
      setStats(newStats);
    } else {
      setStats({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [ownerId]);

  const resetForm = () => {
    setForm({ name: "", brand: "", weight: "", color: "", notes: "" });
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (b: BowlingBall) => {
    setForm({
      name: b.name,
      brand: b.brand || "",
      weight: b.weight ? String(b.weight) : "",
      color: b.color || "",
      notes: b.notes || "",
    });
    setEditingId(b.id);
    setAdding(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      weight: form.weight ? Number(form.weight) : null,
      color: form.color.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("bowling_balls").update(payload).eq("id", editingId)
      : await supabase.from("bowling_balls").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Ball updated!" : "Ball added to your bag! 🎳" });
      resetForm();
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this ball from your bag? Your past games will be unaffected.")) return;
    const { error } = await supabase.from("bowling_balls").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="border border-border bg-card p-3">
      <div className="flex items-center justify-between border-b border-border pb-1 mb-2">
        <h2 className="text-sm text-primary font-bold">🎒 The Bag {balls.length > 0 && `(${balls.length})`}</h2>
        {isOwner && !adding && (
          <button onClick={() => setAdding(true)} className="text-primary text-xs hover:underline">
            [+ Add Ball]
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground p-2">Loading…</p>
      ) : balls.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground italic p-2">
          {isOwner ? "Your bag is empty. Add your first ball to start tracking which gear performs best!" : "No balls in this bowler's bag yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {balls.map((b) => {
            const s = stats[b.id];
            return (
              <div key={b.id} className="border border-border bg-muted/30 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary font-bold">🎳 {b.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[b.brand, b.weight ? `${b.weight} lbs` : null, b.color].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1 text-[10px]">
                      <button onClick={() => startEdit(b)} className="text-primary hover:underline">[edit]</button>
                      <button onClick={() => remove(b.id)} className="text-destructive hover:underline">[remove]</button>
                    </div>
                  )}
                </div>
                {b.notes && <p className="text-[11px] text-muted-foreground italic mt-1">{b.notes}</p>}
                <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[11px]">
                  <div className="border border-border bg-card p-1">
                    <p className="text-muted-foreground text-[10px]">AVG</p>
                    <p className="text-primary font-bold">{s?.avg ?? "—"}</p>
                  </div>
                  <div className="border border-border bg-card p-1">
                    <p className="text-muted-foreground text-[10px]">HIGH</p>
                    <p className="text-secondary font-bold">{s?.high ?? "—"}</p>
                  </div>
                  <div className="border border-border bg-card p-1">
                    <p className="text-muted-foreground text-[10px]">GAMES</p>
                    <p className="text-foreground font-bold">{s?.count ?? 0}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOwner && adding && (
        <form onSubmit={save} className="mt-2 border border-border bg-muted/30 p-2 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-muted-foreground">Name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Hammer Black Widow"
                className="w-full border border-border bg-input px-2 py-1 text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground">Brand</span>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Storm"
                className="w-full border border-border bg-input px-2 py-1 text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground">Weight (lbs)</span>
              <input
                type="number"
                min={6}
                max={16}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full border border-border bg-input px-2 py-1 text-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground">Color</span>
              <input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. Purple/Black"
                className="w-full border border-border bg-input px-2 py-1 text-foreground outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-muted-foreground">Notes</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Layout, surface, condition…"
              className="w-full border border-border bg-input px-2 py-1 text-foreground outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="border border-primary bg-primary text-primary-foreground px-3 py-1 hover:opacity-80">
              {editingId ? "Save changes" : "Add to bag"}
            </button>
            <button type="button" onClick={resetForm} className="border border-border bg-muted px-3 py-1 hover:opacity-80">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BowlingBag;

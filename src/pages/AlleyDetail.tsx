import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AlleyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [alley, setAlley] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [oilRating, setOilRating] = useState(3);
  const [beerRating, setBeerRating] = useState(3);

  // Inline editing state
  const [editingLanes, setEditingLanes] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editLaneCount, setEditLaneCount] = useState(0);
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => { if (id) fetchData(); }, [id]);

  const fetchData = async () => {
    const [alleyRes, reviewsRes] = await Promise.all([
      supabase.from("alleys").select("*").eq("id", id!).single(),
      supabase.from("reviews").select("*, profiles!reviews_user_id_fkey(username)").eq("alley_id", id!).order("created_at", { ascending: false }),
    ]);
    setAlley(alleyRes.data);
    if (alleyRes.data) {
      setEditLaneCount(alleyRes.data.lane_count);
      setEditPhone(alleyRes.data.phone || "");
    }
    setReviews(reviewsRes.data || []);
    setLoading(false);
  };

  const saveField = async (field: "lane_count" | "phone", value: any) => {
    const updateData = field === "lane_count" ? { lane_count: value as number } : { phone: value as string | null };
    const { error } = await supabase.from("alleys").update(updateData).eq("id", id!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated!", description: `${field === "lane_count" ? "Lane count" : "Phone number"} saved.` });
      setAlley((prev: any) => ({ ...prev, [field]: value }));
    }
    if (field === "lane_count") setEditingLanes(false);
    if (field === "phone") setEditingPhone(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id, alley_id: id!, rating, comment, oil_rating: oilRating, beer_rating: beerRating,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review posted!", description: "+20 AlleyPoints" });
      setShowReviewForm(false);
      setComment("");
      fetchData();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  if (!alley) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Alley not found.</p></div>;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4">
        <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
        <h1 className="text-lg text-primary mt-1">🎳 {alley.name.toUpperCase()}</h1>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-4">
        {/* Log Game Button */}
        <button
          onClick={() => user ? navigate(`/log?alley=${id}`) : navigate("/auth")}
          className="w-full border border-border bg-secondary text-secondary-foreground py-2 text-xs hover:opacity-80"
        >
          [🎳 Log Game at This Alley]
        </button>

        {/* Info Table */}
        <table className="w-full border-collapse border border-border text-sm">
          <tbody>
            <tr className="bg-muted">
              <td className="border border-border p-2 text-muted-foreground w-24">Address</td>
              <td className="border border-border p-2 text-foreground">{alley.address}, {alley.city}, {alley.state}</td>
            </tr>
            {/* Phone - editable */}
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Phone</td>
              <td className="border border-border p-2 text-foreground">
                {editingPhone ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="border border-border bg-input px-2 py-0.5 text-foreground text-xs outline-none flex-1"
                      placeholder="(555) 123-4567"
                    />
                    <button onClick={() => saveField("phone", editPhone.trim() || null)} className="text-primary text-xs hover:underline">Save</button>
                    <button onClick={() => { setEditingPhone(false); setEditPhone(alley.phone || ""); }} className="text-muted-foreground text-xs hover:underline">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>{alley.phone || <span className="text-muted-foreground italic">Not listed</span>}</span>
                    {user && (
                      <button onClick={() => setEditingPhone(true)} className="text-primary text-xs hover:underline ml-2">[Edit]</button>
                    )}
                  </div>
                )}
              </td>
            </tr>
            {alley.website && (
              <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Website</td><td className="border border-border p-2"><a href={alley.website} className="text-primary">{alley.website}</a></td></tr>
            )}
            {/* Lanes - editable */}
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Lanes</td>
              <td className="border border-border p-2">
                {editingLanes ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={editLaneCount}
                      onChange={(e) => setEditLaneCount(Number(e.target.value))}
                      className="border border-border bg-input px-2 py-0.5 text-foreground text-xs outline-none w-16"
                    />
                    <button onClick={() => saveField("lane_count", editLaneCount)} className="text-primary text-xs hover:underline">Save</button>
                    <button onClick={() => { setEditingLanes(false); setEditLaneCount(alley.lane_count); }} className="text-muted-foreground text-xs hover:underline">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">{alley.lane_count || "Unknown"}</span>
                    {user && (
                      <button onClick={() => setEditingLanes(true)} className="text-primary text-xs hover:underline ml-2">[Edit]</button>
                    )}
                  </div>
                )}
              </td>
            </tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Oil</td><td className="border border-border p-2 text-foreground">{alley.oil_pattern}</td></tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td><td className="border border-border p-2 text-primary">{"⭐".repeat(alley.alley_rating)} ({alley.alley_rating}/5)</td></tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">
                Beer Rating
                <span className="inline-block ml-1 cursor-help" title="Rate the beer selection, quality, and pricing at this alley. This score comes from user reviews — be the first to rate it!">ℹ️</span>
              </td>
              <td className="border border-border p-2 text-secondary">
                {alley.beer_rating === 0
                  ? <span className="text-muted-foreground italic">No Reviews — be the first!</span>
                  : <>{" 🍺".repeat(alley.beer_rating)} ({alley.beer_rating}/5)</>
                }
              </td>
            </tr>
          </tbody>
        </table>

        {/* Reviews */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-secondary font-bold">📝 Reviews ({reviews.length})</h2>
          {user && (
            <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-primary text-xs hover:underline">
              [+ Write Review]
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={submitReview} className="border border-border bg-card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Overall", val: rating, set: setRating }, { label: "Oil", val: oilRating, set: setOilRating }, { label: "Beer", val: beerRating, set: setBeerRating }].map((item) => (
                <div key={item.label}>
                  <label className="text-xs text-muted-foreground block mb-1">{item.label}:</label>
                  <select value={item.val} onChange={(e) => item.set(Number(e.target.value))}
                    className="w-full border border-border bg-input px-2 py-1 text-foreground text-xs outline-none">
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                  </select>
                </div>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none resize-none"
              placeholder="Your review..." required />
            <button type="submit" className="w-full border border-border bg-primary text-primary-foreground py-1.5 text-xs hover:opacity-80">
              Post Review (+20 pts)
            </button>
          </form>
        )}

        {reviews.map((review) => {
          const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
          return (
            <div key={review.id} className="border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-primary font-bold">{profile?.username || "Unknown"}</span>
                <span className="text-xs text-secondary">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              <p className="text-sm text-foreground mb-1">{review.comment}</p>
              <p className="text-xs text-muted-foreground">Oil: {review.oil_rating}/5 · Beer: {review.beer_rating}/5</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlleyDetail;

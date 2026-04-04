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

  useEffect(() => { if (id) fetchData(); }, [id]);

  const fetchData = async () => {
    const [alleyRes, reviewsRes] = await Promise.all([
      supabase.from("alleys").select("*").eq("id", id!).single(),
      supabase.from("reviews").select("*, profiles!reviews_user_id_fkey(username)").eq("alley_id", id!).order("created_at", { ascending: false }),
    ]);
    setAlley(alleyRes.data);
    setReviews(reviewsRes.data || []);
    setLoading(false);
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
            {alley.phone && (
              <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Phone</td><td className="border border-border p-2 text-foreground">{alley.phone}</td></tr>
            )}
            {alley.website && (
              <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Website</td><td className="border border-border p-2"><a href={alley.website} className="text-primary">{alley.website}</a></td></tr>
            )}
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Lanes</td><td className="border border-border p-2 text-primary font-bold">{alley.lane_count}</td></tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Oil</td><td className="border border-border p-2 text-foreground">{alley.oil_pattern}</td></tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td><td className="border border-border p-2 text-primary">{"⭐".repeat(alley.alley_rating)} ({alley.alley_rating}/5)</td></tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Beer</td><td className="border border-border p-2 text-secondary">{"🍺".repeat(alley.beer_rating)} ({alley.beer_rating}/5)</td></tr>
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

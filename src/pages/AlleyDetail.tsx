import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Phone, Globe, Droplets, Beer, Star } from "lucide-react";

const AlleyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [alley, setAlley] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [oilRating, setOilRating] = useState(3);
  const [beerRating, setBeerRating] = useState(3);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

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
      user_id: user.id,
      alley_id: id!,
      rating,
      comment,
      oil_rating: oilRating,
      beer_rating: beerRating,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="font-pixel text-xs text-muted-foreground animate-pulse-neon">LOADING...</p></div>;
  if (!alley) return <div className="min-h-screen flex items-center justify-center"><p className="font-pixel text-xs text-muted-foreground">ALLEY NOT FOUND</p></div>;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b-2 border-primary p-4 flex items-center gap-3">
        <Link to="/alleys" className="text-primary"><ArrowLeft size={20} /></Link>
        <h1 className="font-pixel text-xs text-primary neon-text">{alley.name.toUpperCase()}</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="border-2 border-primary bg-card p-4 space-y-3">
          <div className="flex items-start gap-2"><MapPin size={14} className="text-primary mt-0.5" /><div><p className="text-sm">{alley.address}</p><p className="text-sm text-muted-foreground">{alley.city}, {alley.state}</p></div></div>
          {alley.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-primary" /><span className="text-sm">{alley.phone}</span></div>}
          {alley.website && <div className="flex items-center gap-2"><Globe size={14} className="text-primary" /><span className="text-sm text-primary">{alley.website}</span></div>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border-2 border-primary bg-card p-3 text-center">
            <p className="font-pixel text-lg text-primary neon-text">{alley.lane_count}</p>
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">LANES</p>
          </div>
          <div className="border-2 border-secondary bg-card p-3 text-center">
            <Droplets size={20} className="text-primary mx-auto" />
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">{alley.oil_pattern.toUpperCase()}</p>
          </div>
          <div className="border-2 border-secondary bg-card p-3 text-center">
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: alley.beer_rating }).map((_, i) => <Beer key={i} size={12} className="text-secondary" />)}
            </div>
            <p className="font-pixel text-[7px] text-muted-foreground mt-1">BEER</p>
          </div>
        </div>

        {/* Reviews */}
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-secondary orange-text">REVIEWS [{reviews.length}]</h2>
          {user && (
            <button onClick={() => setShowReviewForm(!showReviewForm)}
              className="border-2 border-secondary px-2 py-1 font-pixel text-[7px] text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all">
              + REVIEW
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={submitReview} className="border-2 border-secondary bg-card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "OVERALL", val: rating, set: setRating }, { label: "OIL", val: oilRating, set: setOilRating }, { label: "BEER", val: beerRating, set: setBeerRating }].map((item) => (
                <div key={item.label}>
                  <label className="font-pixel text-[7px] text-secondary block mb-1">{item.label}</label>
                  <select value={item.val} onChange={(e) => item.set(Number(e.target.value))}
                    className="w-full border-2 border-primary bg-input px-2 py-1 text-foreground text-xs outline-none">
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              className="w-full border-2 border-primary bg-input px-3 py-2 text-foreground text-sm outline-none resize-none"
              placeholder="Your review..." required />
            <button type="submit"
              className="w-full border-2 border-primary bg-primary text-primary-foreground py-1.5 font-pixel text-[8px] hover:neon-border transition-all">
              POST REVIEW (+20 PTS)
            </button>
          </form>
        )}

        {reviews.map((review) => {
          const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
          return (
            <div key={review.id} className="border-2 border-muted bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[9px] text-primary">{profile?.username || "Unknown"}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < review.rating ? "text-secondary fill-secondary" : "text-muted"} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-foreground mb-2">{review.comment}</p>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>Oil: {review.oil_rating}/5</span>
                <span>Beer: {review.beer_rating}/5</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlleyDetail;

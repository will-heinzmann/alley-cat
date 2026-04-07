import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteAlleys } from "@/hooks/useFavoriteAlleys";
import AlleyLeaderboard from "@/components/AlleyLeaderboard";

const ADMIN_ID = "094958ab-cf6a-4ab2-a771-ff8697b4e65f";

const AlleyDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavoriteAlleys();
  const [alley, setAlley] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [oilRating, setOilRating] = useState(3);
  const [beerRating, setBeerRating] = useState(3);

  const [editingLanes, setEditingLanes] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editLaneCount, setEditLaneCount] = useState(0);
  const [editPhone, setEditPhone] = useState("");

  const isAdmin = user?.id === ADMIN_ID;
  const isFavorited = alley ? favoriteIds.has(alley.id) : false;

  useEffect(() => { if (slug) fetchData(); }, [slug]);

  const fetchData = async () => {
    const { data: alleyData } = await supabase
      .from("alleys")
      .select("*")
      .eq("slug", slug!)
      .single();

    if (!alleyData) {
      setLoading(false);
      return;
    }

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*")
      .eq("alley_id", alleyData.id)
      .order("created_at", { ascending: false });

    // Fetch reviewer profiles separately
    const userIds = [...new Set((reviewsData || []).map((r: any) => r.user_id))];
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.username]));
    }

    const reviewsWithUsernames = (reviewsData || []).map((r: any) => ({
      ...r,
      reviewer_username: profileMap.get(r.user_id) || "Unknown",
    }));

    setAlley(alleyData);
    setEditLaneCount(alleyData.lane_count);
    setEditPhone(alleyData.phone || "");
    setReviews(reviewsWithUsernames);
    setLoading(false);
  };

  const saveField = async (field: "lane_count" | "phone", value: any) => {
    if (isAdmin) {
      const updateData = field === "lane_count" ? { lane_count: value as number } : { phone: value as string | null };
      const { error } = await supabase.from("alleys").update(updateData).eq("id", alley.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Updated!", description: `${field === "lane_count" ? "Lane count" : "Phone number"} saved.` });
        setAlley((prev: any) => ({ ...prev, [field]: value }));
      }
    } else {
      // Submit as update request
      const newValue = String(value ?? "");
      const oldValue = String(alley[field] ?? "");
      const { error } = await supabase.from("alley_update_requests").insert({
        alley_id: alley.id,
        user_id: user!.id,
        field_name: field,
        old_value: oldValue,
        new_value: newValue,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Update submitted!", description: "Your change request has been sent for review." });
      }
    }
    if (field === "lane_count") setEditingLanes(false);
    if (field === "phone") setEditingPhone(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id, alley_id: alley.id, rating, comment, oil_rating: oilRating, beer_rating: beerRating,
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

  const canonicalUrl = `https://alley-cat.lovable.app/alley/${alley.slug}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${alley.name} ${alley.address} ${alley.city} ${alley.state}`)}`;
  const editLabel = isAdmin ? "[Edit]" : "[Suggest Edit]";

  return (
    <div className="min-h-screen pb-20">
      <Helmet>
        <title>{alley.name} in {alley.city}, {alley.state} | Lanes &amp; Leaderboard | Alley Cat</title>
        <meta name="description" content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${alley.name} in ${alley.city}, ${alley.state} | Alley Cat`} />
        <meta property="og:description" content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}.`} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border p-4">
        <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-lg text-primary">🎳 {alley.name.toUpperCase()}</h1>
          {user && (
            <button onClick={() => toggleFavorite(alley.id)} className="text-lg hover:opacity-80" title={isFavorited ? "Remove from favorites" : "Add to favorites"}>
              {isFavorited ? "❤️" : "🤍"}
            </button>
          )}
        </div>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-4">
        <button
          onClick={() => user ? navigate(`/log?alley=${alley.id}`) : navigate("/auth")}
          className="w-full border border-border bg-secondary text-secondary-foreground py-2 text-xs hover:opacity-80"
        >
          [🎳 Log Game at {alley.name}]
        </button>

        <table className="w-full border-collapse border border-border text-sm">
          <tbody>
            <tr className="bg-muted">
              <td className="border border-border p-2 text-muted-foreground w-24">Address</td>
              <td className="border border-border p-2 text-foreground">
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {alley.address}, {alley.city}, {alley.state} {alley.zip_code || ""}
                </a>
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Phone</td>
              <td className="border border-border p-2 text-foreground">
                {editingPhone ? (
                  <div className="flex items-center gap-1">
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                      className="border border-border bg-input px-2 py-0.5 text-foreground text-xs outline-none flex-1" placeholder="(555) 123-4567" />
                    <button onClick={() => saveField("phone", editPhone.trim() || null)} className="text-primary text-xs hover:underline">Save</button>
                    <button onClick={() => { setEditingPhone(false); setEditPhone(alley.phone || ""); }} className="text-muted-foreground text-xs hover:underline">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>{alley.phone || <span className="text-muted-foreground italic">Not listed</span>}</span>
                    {user && <button onClick={() => setEditingPhone(true)} className="text-primary text-xs hover:underline ml-2">{editLabel}</button>}
                  </div>
                )}
              </td>
            </tr>
            {alley.website && (
              <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Website</td><td className="border border-border p-2"><a href={alley.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{alley.website}</a></td></tr>
            )}
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Lanes</td>
              <td className="border border-border p-2">
                {editingLanes ? (
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} value={editLaneCount} onChange={(e) => setEditLaneCount(Number(e.target.value))}
                      className="border border-border bg-input px-2 py-0.5 text-foreground text-xs outline-none w-16" />
                    <button onClick={() => saveField("lane_count", editLaneCount)} className="text-primary text-xs hover:underline">Save</button>
                    <button onClick={() => { setEditingLanes(false); setEditLaneCount(alley.lane_count); }} className="text-muted-foreground text-xs hover:underline">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">{alley.lane_count || "Unknown"}</span>
                    {user && <button onClick={() => setEditingLanes(true)} className="text-primary text-xs hover:underline ml-2">{editLabel}</button>}
                  </div>
                )}
              </td>
            </tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Oil</td><td className="border border-border p-2 text-foreground">{alley.oil_pattern}</td></tr>
            <tr><td className="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td><td className="border border-border p-2 text-primary">
              {alley.alley_rating === 0 ? <span className="text-muted-foreground italic">No Reviews</span> : <>{"⭐".repeat(alley.alley_rating)} ({alley.alley_rating}/5)</>}
            </td></tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">
                Beer Rating <span className="inline-block ml-1 cursor-help" title="Rate the beer selection, quality, and pricing at this alley.">ℹ️</span>
              </td>
              <td className="border border-border p-2 text-secondary">
                {alley.beer_rating === 0
                  ? <span className="text-muted-foreground italic">No Reviews — be the first!</span>
                  : <>{" 🍺".repeat(alley.beer_rating)} ({alley.beer_rating}/5)</>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Alley Leaderboard */}
        <AlleyLeaderboard alleyId={alley.id} alleyName={alley.name} />

        <div className="flex items-center justify-between">
          <h2 className="text-sm text-secondary font-bold">📝 Reviews ({reviews.length})</h2>
          {user && (
            <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-primary text-xs hover:underline">[+ Write Review]</button>
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

        {reviews.map((review) => (
            <div key={review.id} className="border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-primary font-bold">{review.reviewer_username}</span>
                <span className="text-xs text-secondary">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              <p className="text-sm text-foreground mb-1">{review.comment}</p>
              <p className="text-xs text-muted-foreground">Oil: {review.oil_rating}/5 · Beer: {review.beer_rating}/5</p>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AlleyDetail;

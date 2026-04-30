import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteAlleys } from "@/hooks/useFavoriteAlleys";
import AlleyLeaderboard from "@/components/AlleyLeaderboard";
import AlleySeoSection from "@/components/AlleySeoSection";
import AlleyMap from "@/components/AlleyMap";
import AmenityEditor from "@/components/AmenityEditor";
import LocalLegends from "@/components/LocalLegends";
import { generateAlleyDescription } from "@/lib/alleyDescription";

type RelatedAlley = {
  name: string;
  slug: string;
  city: string;
};

const AlleyDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavoriteAlleys();
  const [alley, setAlley] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedAlleys, setRelatedAlleys] = useState<RelatedAlley[]>([]);
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

  const { isAdmin } = useIsAdmin();
  const isFavorited = alley ? favoriteIds.has(alley.id) : false;

  useEffect(() => {
    if (!slug) return;
    void fetchData();
  }, [slug]);

  useEffect(() => {
    if (!loading) {
      document.dispatchEvent(new Event("alleycat:prerender-ready"));
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);

    const { data: alleyData } = await supabase
      .from("alleys")
      .select("*")
      .eq("slug", slug!)
      .single();

    if (!alleyData) {
      setAlley(null);
      setReviews([]);
      setRelatedAlleys([]);
      setLoading(false);
      return;
    }

    const [{ data: reviewsData }, { data: relatedAlleysData }] = await Promise.all([
      supabase
        .from("reviews")
        .select("*")
        .eq("alley_id", alleyData.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("alleys")
        .select("name, slug, city")
        .eq("state", alleyData.state)
        .neq("id", alleyData.id)
        .not("name", "ilike", "%test%")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const userIds = [...new Set((reviewsData || []).map((review: any) => review.user_id))];
    let profileMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile.username]));
    }

    const reviewsWithUsernames = (reviewsData || []).map((review: any) => ({
      ...review,
      reviewer_username: profileMap.get(review.user_id) || "Unknown",
    }));

    setAlley(alleyData);
    setEditLaneCount(alleyData.lane_count);
    setEditPhone(alleyData.phone || "");
    setReviews(reviewsWithUsernames);
    setRelatedAlleys(relatedAlleysData || []);
    setLoading(false);
  };

  const saveField = async (field: "lane_count" | "phone", value: number | string | null) => {
    if (isAdmin) {
      const updateData = field === "lane_count"
        ? { lane_count: value as number }
        : { phone: value as string | null };

      const { error } = await supabase.from("alleys").update(updateData).eq("id", alley.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Updated!", description: `${field === "lane_count" ? "Lane count" : "Phone number"} saved.` });
        setAlley((prev: any) => ({ ...prev, [field]: value }));
      }
    } else {
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
      user_id: user.id,
      alley_id: alley.id,
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
      void fetchData();
    }
  };

  // Derive a friendly fallback name from the slug so crawlers (and humans on
  // slow connections) see meaningful, unique content immediately on first
  // paint — before the Supabase query resolves.
  const slugFallbackName = (slug || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Bowling Alley";

  if (loading || !alley) {
    const fallbackTitle = `${slugFallbackName} | Bowling Alley | Alley Cat`;
    const fallbackDescription = `Find lanes, reviews, and top scores for ${slugFallbackName}. Track your bowling stats and compete on the leaderboard at Alley Cat.`;
    const fallbackCanonical = `https://alleycat-bowling.com/alley/${slug ?? ""}`;
    return (
      <div className="min-h-screen pb-20">
        <Helmet>
          <title>{fallbackTitle}</title>
          <meta name="description" content={fallbackDescription} />
          <link rel="canonical" href={fallbackCanonical} />
          <meta name="robots" content="index,follow" />
          <meta property="og:title" content={fallbackTitle} />
          <meta property="og:description" content={fallbackDescription} />
          <meta property="og:url" content={fallbackCanonical} />
          <meta property="og:type" content="website" />
        </Helmet>
        <header className="border-b border-border p-4">
          <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
          <h1 className="text-lg text-primary mt-1">🎳 {slugFallbackName.toUpperCase()}</h1>
          <hr className="border-primary mt-2" />
        </header>
        <article className="p-4 space-y-3">
          <h2 className="text-sm text-secondary font-bold">About {slugFallbackName}</h2>
          <p className="text-sm text-foreground">
            {slugFallbackName} is a bowling alley listed in the Alley Cat directory.
            View lanes, oil patterns, ratings, reviews, and the local leaderboard.
            Log your games at {slugFallbackName} to track your average and climb the rankings.
          </p>
          {!alley && !loading ? (
            <p className="text-sm text-muted-foreground italic">Alley details could not be found.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Loading the latest alley details…</p>
          )}
          <p>
            <Link to="/alleys" className="text-primary text-xs hover:underline">[Browse all bowling alleys]</Link>
          </p>
        </article>
      </div>
    );
  }

  const canonicalUrl = `https://alleycat-bowling.com/alley/${alley.slug}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${alley.name} ${alley.address} ${alley.city} ${alley.state}`)}`;
  const editLabel = isAdmin ? "[Edit]" : "[Suggest Edit]";

  return (
    <div className="min-h-screen pb-20">
      <Helmet>
        <title>{alley.name} in {alley.city}, {alley.state} | Lanes &amp; Leaderboard | Alley Cat</title>
        <meta
          name="description"
          content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}. Track your bowling stats and join the ${alley.city} leaderboard on Alley Cat.`}
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${alley.name} in ${alley.city}, ${alley.state} | Alley Cat`} />
        <meta property="og:description" content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}.`} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Alley Cat" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${alley.name} in ${alley.city}, ${alley.state} | Alley Cat`} />
        <meta name="twitter:description" content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}.`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BowlingAlley",
            name: alley.name,
            address: {
              "@type": "PostalAddress",
              streetAddress: alley.address,
              addressLocality: alley.city,
              addressRegion: alley.state,
              ...(alley.zip_code && { postalCode: alley.zip_code }),
            },
            ...(alley.phone && { telephone: alley.phone }),
            ...(alley.website && { url: alley.website }),
            ...(alley.alley_rating > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: alley.alley_rating,
                bestRating: 5,
                reviewCount: reviews.length || 1,
              },
            }),
          })}
        </script>
      </Helmet>

      <header className="border-b border-border p-4">
        <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-lg text-primary">🎳 {alley.name.toUpperCase()}</h1>
          {user && (
            <button
              onClick={() => toggleFavorite(alley.id)}
              className="text-lg hover:opacity-80"
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorited ? "❤️" : "🤍"}
            </button>
          )}
        </div>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-4">
        {/* Highlight Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-primary bg-muted p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Lanes</p>
            <p className="text-2xl text-primary font-bold">{alley.lane_count || "—"}</p>
          </div>
          <div className="border-2 border-primary bg-muted p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Pinsetter</p>
            <p className="text-2xl text-primary font-bold">{(alley as any).pinsetter_type || "Unknown"}</p>
          </div>
        </div>

        <button
          onClick={() => (user ? navigate(`/log?alley=${alley.id}`) : navigate("/auth"))}
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
                    {user && <button onClick={() => setEditingPhone(true)} className="text-primary text-xs hover:underline ml-2">{editLabel}</button>}
                  </div>
                )}
              </td>
            </tr>
            {alley.website && (
              <tr>
                <td className="border border-border p-2 text-muted-foreground bg-muted">Website</td>
                <td className="border border-border p-2">
                  <a href={alley.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {alley.website}
                  </a>
                </td>
              </tr>
            )}
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
                    {user && <button onClick={() => setEditingLanes(true)} className="text-primary text-xs hover:underline ml-2">{editLabel}</button>}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Oil</td>
              <td className="border border-border p-2 text-foreground">{alley.oil_pattern}</td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">Alley Rating</td>
              <td className="border border-border p-2 text-primary">
                {alley.alley_rating === 0 ? (
                  <span className="text-muted-foreground italic">No Reviews</span>
                ) : (
                  <>{"⭐".repeat(alley.alley_rating)} ({alley.alley_rating}/5)</>
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2 text-muted-foreground bg-muted">
                Beer Rating <span className="inline-block ml-1 cursor-help" title="Rate the beer selection, quality, and pricing at this alley.">ℹ️</span>
              </td>
              <td className="border border-border p-2 text-secondary">
                {alley.beer_rating === 0 ? (
                  <span className="text-muted-foreground italic">No Reviews — be the first!</span>
                ) : (
                  <>{" 🍺".repeat(alley.beer_rating)} ({alley.beer_rating}/5)</>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <AmenityEditor alley={alley} onUpdated={fetchData} />

        <AlleySeoSection alley={alley} relatedAlleys={relatedAlleys} />

        <LocalLegends alleyId={alley.id} alleyName={alley.name} />

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
              {[
                { label: "Overall", val: rating, set: setRating },
                { label: "Oil", val: oilRating, set: setOilRating },
                { label: "Beer", val: beerRating, set: setBeerRating },
              ].map((item) => (
                <div key={item.label}>
                  <label className="text-xs text-muted-foreground block mb-1">{item.label}:</label>
                  <select
                    value={item.val}
                    onChange={(e) => item.set(Number(e.target.value))}
                    className="w-full border border-border bg-input px-2 py-1 text-foreground text-xs outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none resize-none"
              placeholder="Your review..."
              required
            />
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

        {alley.lat !== 0 && alley.lng !== 0 && (
          <AlleyMap name={alley.name} lat={alley.lat} lng={alley.lng} />
        )}
      </div>

      {/*
        SEO content block — kept in the rendered DOM (NOT wrapped in <noscript>)
        so JS-enabled crawlers like Googlebot, Bingbot, and Ubersuggest can
        index unique alley text immediately. Visually hidden but accessible
        to screen readers and crawlers.
      */}
      <section
        aria-label={`About ${alley.name}`}
        className="sr-only"
      >
        <h2>{alley.name} – {alley.city}, {alley.state}</h2>
        <p>{generateAlleyDescription(alley)}</p>
        <p>Address: {alley.address}, {alley.city}, {alley.state} {alley.zip_code || ""}</p>
        {alley.phone && <p>Phone: {alley.phone}</p>}
        <p>Lanes: {alley.lane_count || "Unknown"}. Oil pattern: {alley.oil_pattern}. Pinsetter: {(alley as any).pinsetter_type || "Unknown"}.</p>
        {relatedAlleys.length > 0 && (
          <>
            <h3>Other bowling alleys in {alley.state}</h3>
            <ul>
              {relatedAlleys.map((a) => (
                <li key={a.slug}>{a.name} — {a.city}, {alley.state}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default AlleyDetail;

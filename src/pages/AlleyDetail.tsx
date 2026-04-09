import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteAlleys } from "@/hooks/useFavoriteAlleys";
import AlleyLeaderboard from "@/components/AlleyLeaderboard";
import AlleySeoSection from "@/components/AlleySeoSection";

const ADMIN_ID = "094958ab-cf6a-4ab2-a771-ff8697b4e65f";

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

  const isAdmin = user?.id === ADMIN_ID;
  const isFavorited = alley ? favoriteIds.has(alley.id) : false;

  useEffect(() => {
    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    if (!loading && alley) {
      document.dispatchEvent(new Event("alleycat:prerender-ready"));
    }
  }, [loading, alley, relatedAlleys]);

  const fetchData = async () => {
    setLoading(true);

    const { data: alleyData } = await supabase
      .from("alleys")
      .select("*")
      .eq("slug", slug!)
      .single();

    if (!alleyData) {
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
    setRelatedAlleys(relatedAlleysData || []);
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
      fetchData();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

  if (!alley) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Alley not found.</p></div>;
  }

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
        <meta property="og:site_name" content="Alley Cat" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${alley.name} in ${alley.city}, ${alley.state} | Alley Cat`} />
        <meta name="twitter:description" content={`Find lanes, reviews, and top scores for ${alley.name} in ${alley.city}.`} />
        <script type="application/ld+json">{JSON.stringify({
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
        })}</script>
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
                  <a href={alley.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{alley.website}</a>
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
                {alley.alley_rating === 0 ? <span className="text-muted-foreground italic">No Reviews</span> : <>{
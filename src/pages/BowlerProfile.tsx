import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const getAvatarUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

const BowlerProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [yearStats, setYearStats] = useState({ games: 0, avgScore: 0, highScore: 0, totalPoints: 0 });
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, user]);

  const fetchData = async () => {
    const [profileRes, gamesRes, followersRes, followingRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId!).single(),
      supabase.from("games").select("*, alleys!games_alley_id_fkey(name, city, state)").eq("user_id", userId!).order("date", { ascending: false }).limit(20),
      supabase.from("follows").select("id").eq("following_id", userId!),
      supabase.from("follows").select("id").eq("follower_id", userId!),
    ]);
    setProfile(profileRes.data);
    const gamesData = gamesRes.data || [];
    setGames(gamesData);
    setFollowersCount(followersRes.data?.length || 0);
    setFollowingCount(followingRes.data?.length || 0);

    if (user && userId !== user.id) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId!);
      setIsFollowing((data?.length || 0) > 0);
    }

    const thisYear = new Date().getFullYear();
    const yearGames = gamesData.filter((g: any) => new Date(g.date).getFullYear() === thisYear);
    setYearStats({
      games: yearGames.length,
      avgScore: yearGames.length > 0 ? Math.round(yearGames.reduce((s: number, g: any) => s + g.score, 0) / yearGames.length) : 0,
      highScore: yearGames.length > 0 ? Math.max(...yearGames.map((g: any) => g.score)) : 0,
      totalPoints: profileRes.data?.total_points || 0,
    });
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    }
    setIsFollowing(!isFollowing);
    setFollowersCount((c) => isFollowing ? c - 1 : c + 1);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: filePath }).eq("user_id", user.id);
    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Profile picture updated!" });
      fetchData();
    }
    setUploadingAvatar(false);
  };

  const startEditing = () => {
    setEditUsername(profile?.username || "");
    setEditHometown(profile?.hometown || "");
    setEditBio(profile?.bio || "");
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!user || !editUsername.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      username: editUsername.trim(),
      hometown: editHometown.trim() || null,
      bio: editBio.trim() || null,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      setEditing(false);
      fetchData();
    }
    setSavingProfile(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Bowler not found.</p></div>;

  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4">
        <Link to="/" className="text-primary text-xs">← Back</Link>
        <h1 className="text-lg text-primary mt-1">
          {isOwnProfile ? "👤 My Stats" : `👤 ${profile.username}`}
        </h1>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4 space-y-4">
        {/* Profile Info */}
        <div className="border border-border bg-card p-4">
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img src={getAvatarUrl(profile.avatar_url) || ""} alt="avatar"
                      className="w-14 h-14 border-2 border-border object-cover" />
                  ) : (
                    <div className="w-14 h-14 border-2 border-border bg-muted flex items-center justify-center text-2xl">🎳</div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 border border-border bg-card px-1 text-[10px] text-muted-foreground hover:text-primary"
                    disabled={uploadingAvatar}>
                    {uploadingAvatar ? "..." : "📷"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <p className="text-xs text-muted-foreground">Tap 📷 to change photo</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Username:</label>
                <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Hometown:</label>
                <input value={editHometown} onChange={e => setEditHometown(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" placeholder="e.g. Brooklyn, NY" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bio:</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={2}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none resize-none" placeholder="Tell us about your game..." />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={savingProfile}
                  className="border border-border bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 disabled:opacity-50">
                  {savingProfile ? "Saving..." : "[Save]"}
                </button>
                <button onClick={() => setEditing(false)}
                  className="border border-border px-3 py-1 text-xs text-muted-foreground hover:opacity-80">
                  [Cancel]
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img src={getAvatarUrl(profile.avatar_url) || ""} alt="avatar"
                      className="w-14 h-14 border-2 border-border object-cover" />
                  ) : (
                    <div className="w-14 h-14 border-2 border-border bg-muted flex items-center justify-center text-2xl">🎳</div>
                  )}
                  {isOwnProfile && (
                    <>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 border border-border bg-card px-1 text-[10px] text-muted-foreground hover:text-primary"
                        disabled={uploadingAvatar}>
                        {uploadingAvatar ? "..." : "📷"}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg text-primary font-bold">{profile.username}</p>
                      <p className="text-xs text-muted-foreground">{profile.hometown || "No hometown set"}</p>
                    </div>
                    <div className="flex gap-1">
                      {isOwnProfile && (
                        <button onClick={startEditing}
                          className="border border-border px-3 py-1 text-xs text-muted-foreground hover:text-primary">
                          [Edit]
                        </button>
                      )}
                      {!isOwnProfile && user && (
                        <button onClick={toggleFollow}
                          className={`border border-border px-3 py-1 text-xs transition-colors ${
                            isFollowing ? "text-muted-foreground hover:text-destructive" : "bg-secondary text-secondary-foreground hover:opacity-80"
                          }`}>
                          {isFollowing ? "[Unfollow]" : "[Follow]"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground">
                <strong>{followersCount}</strong> followers · <strong>{followingCount}</strong> following · <strong>{profile.games_count}</strong> games
              </p>
              {profile.bio && <p className="text-xs text-muted-foreground italic mt-2">{profile.bio}</p>}
            </>
          )}
        </div>

        {/* Year Stats */}
        <div>
          <h2 className="text-sm text-secondary font-bold mb-2">📊 {new Date().getFullYear()} Season</h2>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-xs text-muted-foreground">Points</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">High</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">Avg</th>
                <th className="border border-border p-2 text-xs text-muted-foreground">Games</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-card text-center">
                <td className="border border-border p-2 text-secondary font-bold">{yearStats.totalPoints}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.highScore || "-"}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.avgScore || "-"}</td>
                <td className="border border-border p-2 text-foreground">{yearStats.games}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Game History */}
        <div>
          <h2 className="text-sm text-primary font-bold mb-2">🎳 Game History</h2>
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-border p-4 text-center">No games yet.</p>
          ) : (
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left text-xs text-muted-foreground">Alley</th>
                  <th className="border border-border p-2 text-xs text-muted-foreground">Date</th>
                  <th className="border border-border p-2 text-xs text-muted-foreground">Oil</th>
                  <th className="border border-border p-2 text-right text-xs text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, i) => {
                  const alley = Array.isArray(game.alleys) ? game.alleys[0] : game.alleys;
                  return (
                    <tr key={game.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                      <td className="border border-border p-2 text-foreground">{alley?.name || "Unknown"}</td>
                      <td className="border border-border p-2 text-center text-muted-foreground text-xs">{game.date?.slice(5)}</td>
                      <td className="border border-border p-2 text-center text-muted-foreground text-xs">{game.oil_condition?.slice(0, 3)}</td>
                      <td className="border border-border p-2 text-right text-primary font-bold">{game.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BowlerProfile;

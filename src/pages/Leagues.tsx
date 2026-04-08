import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface League {
  id: string;
  name: string;
  description: string | null;
  day_of_week: string | null;
  games_per_session: number;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  alley_id: string | null;
  alley_name?: string;
  member_count?: number;
}

const Leagues = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [allLeagues, setAllLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"my" | "browse">("my");

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [gamesPerSession, setGamesPerSession] = useState("3");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alleyId, setAlleyId] = useState("");
  const [alleySearch, setAlleySearch] = useState("");
  const [alleys, setAlleys] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLeagues();
    fetchAlleys();
  }, [user]);

  const fetchAlleys = async () => {
    let all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase.from("alleys").select("id, name, city, state").order("name").range(from, from + 999);
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < 1000) break;
      from += 1000;
    }
    setAlleys(all);
  };

  const fetchLeagues = async () => {
    setLoading(true);
    
    // Fetch all leagues with their alleys
    const { data: leagues } = await supabase
      .from("leagues")
      .select("*, alleys(name)")
      .order("created_at", { ascending: false });

    // Fetch all members to get counts
    const { data: members } = await supabase
      .from("league_members")
      .select("league_id, user_id");

    const leagueList: League[] = (leagues || []).map((l: any) => ({
      ...l,
      alley_name: l.alleys?.name ?? null,
      member_count: (members || []).filter((m: any) => m.league_id === l.id).length,
    }));

    if (user) {
      const myIds = new Set((members || []).filter((m: any) => m.user_id === user.id).map((m: any) => m.league_id));
      // Also include leagues the user created
      setMyLeagues(leagueList.filter(l => myIds.has(l.id) || l.created_by === user.id));
      setAllLeagues(leagueList.filter(l => !myIds.has(l.id) && l.created_by !== user.id));
    } else {
      setMyLeagues([]);
      setAllLeagues(leagueList);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!name.trim()) return;
    setCreating(true);

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        day_of_week: dayOfWeek || null,
        games_per_session: parseInt(gamesPerSession) || 3,
        start_date: startDate || null,
        end_date: endDate || null,
        alley_id: alleyId || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error creating league", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    // Auto-join as admin
    await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: user.id,
      role: "admin",
    });

    toast({ title: "League created! 🎳" });
    setShowCreate(false);
    setName(""); setDescription(""); setDayOfWeek(""); setAlleyId(""); setAlleySearch("");
    setCreating(false);
    fetchLeagues();
  };

  const handleJoin = async (leagueId: string) => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("league_members").insert({
      league_id: leagueId,
      user_id: user.id,
      role: "member",
    });
    if (error) {
      toast({ title: "Error joining league", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Joined league! 🎳" });
      fetchLeagues();
    }
  };

  const filteredAlleys = alleySearch.length >= 2
    ? alleys.filter(a => `${a.name} ${a.city} ${a.state}`.toLowerCase().includes(alleySearch.toLowerCase())).slice(0, 8)
    : [];

  const LeagueCard = ({ league, showJoin }: { league: League; showJoin?: boolean }) => (
    <div className="border border-border bg-card p-3 space-y-1">
      <div className="flex justify-between items-start">
        <Link to={`/leagues/${league.id}`} className="text-primary font-bold text-sm hover:underline">
          🎳 {league.name}
        </Link>
        {showJoin && (
          <button onClick={() => handleJoin(league.id)}
            className="border border-primary text-primary px-2 py-0.5 text-[10px] hover:bg-primary/10">
            [Join]
          </button>
        )}
      </div>
      {league.description && <p className="text-xs text-muted-foreground">{league.description}</p>}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        {league.day_of_week && <span>📅 {league.day_of_week}s</span>}
        {league.alley_name && <span>📍 {league.alley_name}</span>}
        <span>👥 {league.member_count ?? 0} members</span>
        <span>🎳 {league.games_per_session} games/session</span>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Bowling Leagues — Join or Create | Alley Cat</title>
        <meta name="description" content="Join or create bowling leagues on Alley Cat. Track weekly scores, standings, and compete with your league members." />
        <link rel="canonical" href="https://alleycat-bowling.com/leagues" />
      </Helmet>
      <div className="min-h-screen pb-20">
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="text-primary text-xs">← Back</Link>
              <h1 className="text-lg text-primary mt-1">🏆 Leagues</h1>
            </div>
            <button
              onClick={() => user ? setShowCreate(!showCreate) : navigate("/auth")}
              className="border border-border bg-secondary text-secondary-foreground px-3 py-1 text-xs hover:opacity-80"
            >
              [+ Create League]
            </button>
          </div>
        </header>

        {showCreate && (
          <form onSubmit={handleCreate} className="p-4 border-b border-border bg-card space-y-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">League Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">League Night</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none">
                  <option value="">Select day...</option>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Games/Session</label>
                <input type="number" min="1" max="10" value={gamesPerSession}
                  onChange={e => setGamesPerSession(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
              </div>
            </div>
            <div className="relative">
              <label className="text-xs text-muted-foreground block mb-1">Home Alley</label>
              <input type="text" placeholder="Search alleys..." value={alleySearch}
                onChange={e => { setAlleySearch(e.target.value); setAlleyId(""); }}
                className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
              {alleyId && (
                <p className="text-[10px] text-primary mt-0.5">
                  ✓ {alleys.find(a => a.id === alleyId)?.name}
                </p>
              )}
              {filteredAlleys.length > 0 && !alleyId && (
                <div className="absolute z-10 w-full border border-border bg-card max-h-32 overflow-y-auto">
                  {filteredAlleys.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => { setAlleyId(a.id); setAlleySearch(a.name); }}
                      className="block w-full text-left px-2 py-1 text-xs hover:bg-muted border-b border-border last:border-0">
                      {a.name} — {a.city}, {a.state}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={creating}
              className="border border-primary bg-primary text-primary-foreground px-4 py-1.5 text-xs hover:opacity-80 w-full">
              {creating ? "Creating..." : "[Create League]"}
            </button>
          </form>
        )}

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setTab("my")}
              className={`text-xs px-3 py-1 border ${tab === "my" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [My Leagues]
            </button>
            <button onClick={() => setTab("browse")}
              className={`text-xs px-3 py-1 border ${tab === "browse" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [Browse]
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Loading leagues...</p>
          ) : tab === "my" ? (
            myLeagues.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground text-sm">You haven't joined any leagues yet.</p>
                <button onClick={() => setTab("browse")}
                  className="text-xs text-primary hover:underline">[Browse Leagues]</button>
                <span className="text-muted-foreground text-xs mx-2">or</span>
                <button onClick={() => setShowCreate(true)}
                  className="text-xs text-primary hover:underline">[Create One]</button>
              </div>
            ) : (
              <div className="space-y-2">
                {myLeagues.map(l => <LeagueCard key={l.id} league={l} />)}
              </div>
            )
          ) : (
            allLeagues.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No other leagues to browse.</p>
            ) : (
              <div className="space-y-2">
                {allLeagues.map(l => <LeagueCard key={l.id} league={l} showJoin />)}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default Leagues;

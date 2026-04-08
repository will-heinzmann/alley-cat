import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  user_id: string;
  role: string;
  username: string;
  full_name: string | null;
  bowling_average: number;
}

interface Session {
  id: string;
  week_number: number;
  session_date: string;
  games: { user_id: string; username: string; score: number; game_id: string }[];
}

const LeagueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [league, setLeague] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"standings" | "sessions" | "members">("standings");

  // Add session form
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionWeek, setSessionWeek] = useState("1");

  // Add game to session
  const [addingGameSession, setAddingGameSession] = useState<string | null>(null);
  const [myGames, setMyGames] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, user]);

  const fetchAll = async () => {
    setLoading(true);

    // Fetch league
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*, alleys(name, city, state)")
      .eq("id", id!)
      .single();

    if (!leagueData) { setLoading(false); return; }
    setLeague(leagueData);

    // Fetch members with profiles
    const { data: memberRows } = await supabase
      .from("league_members")
      .select("id, user_id, role")
      .eq("league_id", id!);

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, bowling_average")
        .in("user_id", userIds);

      const mapped: Member[] = memberRows.map(m => {
        const p = profiles?.find(p => p.user_id === m.user_id);
        return {
          ...m,
          username: p?.username ?? "unknown",
          full_name: p?.full_name ?? null,
          bowling_average: p?.bowling_average ?? 0,
        };
      });
      setMembers(mapped.sort((a, b) => b.bowling_average - a.bowling_average));

      if (user) {
        const myMembership = memberRows.find(m => m.user_id === user.id);
        setIsMember(!!myMembership);
        setIsAdmin(myMembership?.role === "admin" || leagueData.created_by === user.id);
      }
    }

    // Fetch sessions with games
    const { data: sessionRows } = await supabase
      .from("league_sessions")
      .select("id, week_number, session_date")
      .eq("league_id", id!)
      .order("week_number", { ascending: true });

    if (sessionRows && sessionRows.length > 0) {
      const sessionIds = sessionRows.map(s => s.id);
      const { data: leagueGames } = await supabase
        .from("league_games")
        .select("league_session_id, game_id, user_id")
        .in("league_session_id", sessionIds);

      // Get game scores
      const gameIds = (leagueGames || []).map(g => g.game_id);
      let gameScores: any[] = [];
      if (gameIds.length > 0) {
        const { data } = await supabase.from("games").select("id, score").in("id", gameIds);
        gameScores = data || [];
      }

      // Get usernames
      const gameUserIds = [...new Set((leagueGames || []).map(g => g.user_id))];
      let userProfiles: any[] = [];
      if (gameUserIds.length > 0) {
        const { data } = await supabase.from("profiles").select("user_id, username").in("user_id", gameUserIds);
        userProfiles = data || [];
      }

      const mapped: Session[] = sessionRows.map(s => ({
        ...s,
        games: (leagueGames || [])
          .filter(g => g.league_session_id === s.id)
          .map(g => ({
            user_id: g.user_id,
            username: userProfiles.find(p => p.user_id === g.user_id)?.username ?? "unknown",
            score: gameScores.find(gs => gs.id === g.game_id)?.score ?? 0,
            game_id: g.game_id,
          }))
          .sort((a, b) => b.score - a.score),
      }));
      setSessions(mapped);

      // Auto-set next week number
      const maxWeek = Math.max(...sessionRows.map(s => s.week_number), 0);
      setSessionWeek(String(maxWeek + 1));
    }

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("league_members").insert({
      league_id: id!,
      user_id: user.id,
      role: "member",
    });
    if (error) {
      toast({ title: "Error joining", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Joined! 🎳" });
      fetchAll();
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    await supabase.from("league_members").delete().eq("league_id", id!).eq("user_id", user.id);
    toast({ title: "Left league" });
    fetchAll();
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("league_sessions").insert({
      league_id: id!,
      week_number: parseInt(sessionWeek),
      session_date: sessionDate,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Session added!" });
      setShowAddSession(false);
      fetchAll();
    }
  };

  const openAddGame = async (sessionId: string) => {
    if (!user) return;
    setAddingGameSession(sessionId);
    // Fetch user's recent games not already in a league session
    const { data } = await supabase
      .from("games")
      .select("id, score, date, alleys!games_alley_id_fkey(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setMyGames(data || []);
  };

  const handleAddGame = async (gameId: string, sessionId: string) => {
    if (!user) return;
    const { error } = await supabase.from("league_games").insert({
      league_session_id: sessionId,
      game_id: gameId,
      user_id: user.id,
    });
    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "Game already added to this session" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Game linked to session! 🎳" });
      setAddingGameSession(null);
      fetchAll();
    }
  };

  // Calculate standings from session games
  const standings = (() => {
    const stats: Record<string, { username: string; totalScore: number; gameCount: number; highGame: number }> = {};
    for (const session of sessions) {
      for (const game of session.games) {
        if (!stats[game.user_id]) {
          stats[game.user_id] = { username: game.username, totalScore: 0, gameCount: 0, highGame: 0 };
        }
        stats[game.user_id].totalScore += game.score;
        stats[game.user_id].gameCount += 1;
        if (game.score > stats[game.user_id].highGame) stats[game.user_id].highGame = game.score;
      }
    }
    return Object.entries(stats)
      .map(([userId, s]) => ({
        userId,
        ...s,
        average: s.gameCount > 0 ? Math.round(s.totalScore / s.gameCount) : 0,
      }))
      .sort((a, b) => b.average - a.average);
  })();

  if (loading) return <div className="min-h-screen pb-20 p-4"><p className="text-xs text-muted-foreground">Loading...</p></div>;
  if (!league) return <div className="min-h-screen pb-20 p-4"><p className="text-xs text-muted-foreground">League not found.</p></div>;

  const alleyInfo = league.alleys as any;

  return (
    <>
      <Helmet>
        <title>{league.name} — Bowling League | Alley Cat</title>
        <meta name="description" content={`${league.name} bowling league on Alley Cat. View standings, weekly sessions, and member stats.`} />
      </Helmet>
      <div className="min-h-screen pb-20">
        <header className="border-b border-border p-4">
          <Link to="/leagues" className="text-primary text-xs">← All Leagues</Link>
          <h1 className="text-lg text-primary mt-1">🏆 {league.name}</h1>
          {league.description && <p className="text-xs text-muted-foreground mt-1">{league.description}</p>}
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
            {league.day_of_week && <span>📅 {league.day_of_week}s</span>}
            {alleyInfo?.name && <span>📍 {alleyInfo.name}</span>}
            <span>👥 {members.length} members</span>
          </div>
          <div className="mt-2">
            {!isMember ? (
              <button onClick={handleJoin}
                className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80">
                [Join League]
              </button>
            ) : !isAdmin ? (
              <button onClick={handleLeave}
                className="border border-border text-muted-foreground px-3 py-1 text-xs hover:opacity-80">
                [Leave League]
              </button>
            ) : (
              <span className="text-[10px] text-secondary">⭐ League Admin</span>
            )}
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            {(["standings", "sessions", "members"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1 border ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                [{t.charAt(0).toUpperCase() + t.slice(1)}]
              </button>
            ))}
          </div>

          {tab === "standings" && (
            <div>
              <h2 className="text-sm text-primary font-bold mb-2">📊 League Standings</h2>
              {standings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No games logged yet. Add sessions and link games to see standings.</p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-1.5 text-left text-muted-foreground">#</th>
                      <th className="border border-border p-1.5 text-left text-muted-foreground">Bowler</th>
                      <th className="border border-border p-1.5 text-muted-foreground">AVG</th>
                      <th className="border border-border p-1.5 text-muted-foreground">Games</th>
                      <th className="border border-border p-1.5 text-muted-foreground">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.userId} className={i === 0 ? "bg-primary/5" : ""}>
                        <td className="border border-border p-1.5 text-primary font-bold">{i + 1}</td>
                        <td className="border border-border p-1.5">
                          <Link to={`/bowler/${s.userId}`} className="text-primary hover:underline">{s.username}</Link>
                        </td>
                        <td className="border border-border p-1.5 text-center text-secondary font-bold">{s.average}</td>
                        <td className="border border-border p-1.5 text-center text-muted-foreground">{s.gameCount}</td>
                        <td className="border border-border p-1.5 text-center text-muted-foreground">{s.highGame}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "sessions" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm text-primary font-bold">📅 Weekly Sessions</h2>
                {isAdmin && (
                  <button onClick={() => setShowAddSession(!showAddSession)}
                    className="border border-border text-xs px-2 py-0.5 text-muted-foreground hover:text-foreground">
                    [+ Add Session]
                  </button>
                )}
              </div>

              {showAddSession && (
                <form onSubmit={handleAddSession} className="border border-border bg-card p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Week #</label>
                      <input type="number" min="1" value={sessionWeek} onChange={e => setSessionWeek(e.target.value)}
                        className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Date</label>
                      <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                        className="w-full border border-border bg-input px-2 py-1 text-foreground text-sm outline-none" />
                    </div>
                  </div>
                  <button type="submit" className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs w-full">
                    [Add Session]
                  </button>
                </form>
              )}

              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions yet.{isAdmin ? " Add one to get started." : ""}</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="border border-border bg-card p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-primary font-bold">Week {s.week_number} — {s.session_date}</span>
                      {isMember && (
                        <button onClick={() => openAddGame(s.id)}
                          className="text-[10px] border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground">
                          [+ Add My Game]
                        </button>
                      )}
                    </div>
                    {s.games.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No games logged for this session.</p>
                    ) : (
                      <div className="space-y-1">
                        {s.games.map((g, i) => (
                          <div key={g.game_id} className="flex justify-between text-xs">
                            <span>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                              <Link to={`/bowler/${g.user_id}`} className="text-primary hover:underline">{g.username}</Link>
                            </span>
                            <span className="text-secondary font-bold">{g.score}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {addingGameSession === s.id && (
                      <div className="mt-2 border-t border-border pt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground">Select a game to add:</p>
                        {myGames.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No recent games found. <Link to="/log" className="text-primary hover:underline">Log one first.</Link></p>
                        ) : (
                          myGames.map(g => (
                            <button key={g.id} onClick={() => handleAddGame(g.id, s.id)}
                              className="block w-full text-left text-xs border border-border p-1.5 hover:bg-muted">
                              {g.date} — Score: <span className="text-secondary font-bold">{g.score}</span>
                              {g.alleys?.name && <span className="text-muted-foreground"> @ {g.alleys.name}</span>}
                            </button>
                          ))
                        )}
                        <button onClick={() => setAddingGameSession(null)}
                          className="text-[10px] text-muted-foreground hover:text-foreground">[cancel]</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "members" && (
            <div>
              <h2 className="text-sm text-primary font-bold mb-2">👥 Members</h2>
              <div className="space-y-1">
                {members.map(m => (
                  <div key={m.id} className="flex justify-between items-center border border-border p-2">
                    <div>
                      <Link to={`/bowler/${m.user_id}`} className="text-xs text-primary hover:underline font-bold">
                        {m.username}
                      </Link>
                      {m.full_name && <span className="text-[10px] text-muted-foreground ml-1">{m.full_name}</span>}
                      {m.role === "admin" && <span className="text-[10px] text-secondary ml-1">⭐ Admin</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">AVG: {Math.round(m.bowling_average)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeagueDetail;

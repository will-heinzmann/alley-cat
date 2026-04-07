import { useMemo, useRef, useState } from "react";

interface Game {
  id: string;
  score: number;
  date: string;
  oil_condition: string;
  alleys?: any;
}

interface SeriesSummaryProps {
  games: Game[];
}

type TimeRange = "3" | "10" | "all";

const SeriesSummary = ({ games }: SeriesSummaryProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<TimeRange>("3");

  const slicedGames = useMemo(() => {
    if (range === "all") return games;
    return games.slice(0, Number(range));
  }, [games, range]);

  const stats = useMemo(() => {
    if (slicedGames.length === 0) return null;
    const scores = slicedGames.map((g) => g.score);
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / scores.length);
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const cleanGames = scores.filter((s) => s >= 200).length;
    const cleanPct = Math.round((cleanGames / scores.length) * 100);
    const strikes = scores.filter((s) => s === 300).length;
    const trend = scores.length >= 2
      ? scores[0] - scores[scores.length - 1]
      : 0;

    // Session = games on the same day
    const dates = [...new Set(slicedGames.map((g) => g.date))];
    const sessionCounts = dates.map((d) => ({
      date: d,
      games: slicedGames.filter((g) => g.date === d),
      total: slicedGames.filter((g) => g.date === d).reduce((a, g) => a + g.score, 0),
    }));
    const bestSession = sessionCounts.length > 0
      ? sessionCounts.reduce((best, s) => s.total > best.total ? s : best)
      : null;

    return { total, avg, high, low, cleanPct, strikes, trend, gamesCount: scores.length, bestSession };
  }, [slicedGames]);

  const handleShare = async () => {
    if (!stats) return;
    const text = `🎳 My Alley Cat Stats\n` +
      `📊 ${stats.gamesCount} Games Logged\n` +
      `🏆 High: ${stats.high} | Avg: ${stats.avg}\n` +
      `🔥 200+ Rate: ${stats.cleanPct}%\n` +
      `📌 Total Pins: ${stats.total.toLocaleString()}\n\n` +
      `Track your bowling at alley-cat.lovable.app`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My Alley Cat Stats", text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Stats copied to clipboard!");
    }
  };

  if (!stats) return null;

  return (
    <div ref={cardRef} className="border border-border bg-card">
      <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-1">
          <h3 className="text-xs text-primary font-bold">📊 SERIES SUMMARY</h3>
          <span className="inline-block cursor-help" title="Your bowling stats summary — toggle between your last 3 games (series), last 10, or all-time.">ℹ️</span>
        </div>
        <div className="flex items-center gap-1">
          {(["3", "10", "all"] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[10px] px-2 py-0.5 border ${range === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              [{r === "all" ? "All" : `Last ${r}`}]
            </button>
          ))}
          <button onClick={handleShare} className="text-xs text-secondary hover:underline">[Share 📤]</button>
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">Games</p>
            <p className="text-primary font-bold text-lg">{stats.gamesCount}</p>
          </div>
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">Total Pins</p>
            <p className="text-primary font-bold text-lg">{stats.total.toLocaleString()}</p>
          </div>
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">Average</p>
            <p className="text-secondary font-bold text-lg">{stats.avg}</p>
          </div>
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">High Game</p>
            <p className="text-secondary font-bold text-lg">{stats.high}</p>
          </div>
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">Low Game</p>
            <p className="text-foreground font-bold text-lg">{stats.low}</p>
          </div>
          <div className="border border-border p-2 bg-muted text-center">
            <p className="text-muted-foreground">
              200+ Rate <span className="inline-block cursor-help" title="The percentage of your games where you scored 200 or higher — a measure of consistency at a high level.">ℹ️</span>
            </p>
            <p className="text-primary font-bold text-lg">{stats.cleanPct}%</p>
          </div>
        </div>
        {stats.strikes > 0 && (
          <p className="text-xs text-secondary mt-2 text-center">🎯 Perfect 300s: {stats.strikes}</p>
        )}
        {stats.trend !== 0 && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Recent trend: {stats.trend > 0 ? `↗ +${stats.trend}` : `↘ ${stats.trend}`} from first to latest
          </p>
        )}
        {stats.bestSession && stats.bestSession.games.length > 1 && (
          <p className="text-xs text-primary mt-1 text-center">
            🔥 Best session: {stats.bestSession.total} pins on {stats.bestSession.date} ({stats.bestSession.games.length} games)
          </p>
        )}
      </div>
    </div>
  );
};

export default SeriesSummary;

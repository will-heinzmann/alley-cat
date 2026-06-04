import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  bowlers: number | null;
  games: number | null;
  alleys: number | null;
}

const formatCount = (n: number | null) => {
  if (n === null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
};

const TrustHero = () => {
  const [stats, setStats] = useState<Stats>({ bowlers: null, games: null, alleys: null });

  useEffect(() => {
    const load = async () => {
      const [bowlers, games, alleys] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("games").select("*", { count: "exact", head: true }),
        supabase.from("alleys").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        bowlers: bowlers.count ?? null,
        games: games.count ?? null,
        alleys: alleys.count ?? null,
      });
    };
    load();
  }, []);

  const statItems = [
    { label: "Bowlers", value: formatCount(stats.bowlers) },
    { label: "Games logged", value: formatCount(stats.games) },
    { label: "Alleys mapped", value: formatCount(stats.alleys) },
  ];

  return (
    <section className="bg-gradient-hero border border-border rounded-lg shadow-elevated overflow-hidden">
      <div className="p-6 md:p-10">
        <span className="inline-block text-[11px] font-semibold tracking-wide uppercase text-secondary border border-secondary/50 rounded-full px-3 py-1 mb-4">
          🎳 Your bowling stats, finally in one place
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight max-w-2xl">
          Track every game, follow your friends, and{" "}
          <span className="text-primary">climb the leaderboard</span>.
        </h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
          Alley Cat is the free bowling companion built for league night and casual rollers alike.
          Log scores frame-by-frame, discover top-rated alleys near you, and watch your average climb over time.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold text-sm px-5 py-3 rounded-md shadow-card hover:opacity-90 transition-opacity no-underline"
          >
            Create your free account →
          </Link>
          <Link
            to="/alleys"
            className="inline-flex items-center gap-2 border border-border text-foreground font-medium text-sm px-5 py-3 rounded-md hover:bg-muted transition-colors no-underline"
          >
            Browse alleys
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
          {statItems.map((s) => (
            <div key={s.label} className="bg-card/60 border border-border rounded-md px-3 py-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Free forever · No credit card · Your data stays yours
        </p>
      </div>
    </section>
  );
};

export default TrustHero;

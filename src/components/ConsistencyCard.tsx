import { consistencyLabel, consistencyScoreFromStdDev, standardDeviation } from "@/lib/stats";

interface Props {
  scores: number[]; // last games (any order); we'll use up to 10
}

const ConsistencyCard = ({ scores }: Props) => {
  const last10 = scores.slice(0, 10);
  const sd = standardDeviation(last10);
  const score = consistencyScoreFromStdDev(sd);
  const label = consistencyLabel(score);
  const enough = last10.length >= 3;

  return (
    <div className="border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm text-secondary font-bold">📈 Consistency Score</h3>
        <span
          className="text-[10px] text-muted-foreground cursor-help"
          title="Lower variation between games = higher consistency. Based on standard deviation of your last 10 games."
        >
          ℹ️
        </span>
      </div>
      {!enough ? (
        <p className="text-xs text-muted-foreground italic">
          Bowl at least 3 games to unlock your consistency score.
        </p>
      ) : (
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-3xl text-primary font-bold leading-none">{score}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-xs text-secondary mt-1">{label}</p>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            ±{sd.toFixed(1)} pins<br />
            <span className="text-[10px]">over last {last10.length} games</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsistencyCard;

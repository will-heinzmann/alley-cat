// Bowling Score Calculator — SEO landing tool
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import FrameByFrameInput from "@/components/FrameByFrameInput";

const BowlingScoreCalculator = () => {
  const [score, setScore] = useState(0);

  return (
    <>
      <Helmet>
        <title>Bowling Score Calculator — Free Frame-by-Frame Tool | Alley Cat</title>
        <meta
          name="description"
          content="Free bowling score calculator. Enter strikes, spares, and pin counts frame by frame and watch your score update in real time. Learn how to keep score in bowling."
        />
        <link rel="canonical" href="https://alleycat-bowling.com/tools/bowling-score-calculator" />
        <meta property="og:title" content="Bowling Score Calculator — Free Frame-by-Frame Tool" />
        <meta
          property="og:description"
          content="Free bowling score calculator. Enter strikes, spares, and pin counts frame by frame and watch your score update in real time."
        />
        <meta property="og:url" content="https://alleycat-bowling.com/tools/bowling-score-calculator" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Bowling Score Calculator",
          url: "https://alleycat-bowling.com/tools/bowling-score-calculator",
          applicationCategory: "UtilityApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Free interactive bowling score calculator. Track strikes, spares, and pin counts frame by frame.",
        })}</script>
      </Helmet>

      <main className="min-h-screen bg-background pb-24">
        <div className="max-w-3xl mx-auto px-3 py-4">
          <header className="border-b border-border pb-3 mb-4">
            <h1 className="text-2xl sm:text-3xl text-primary font-bold">
              🎳 Bowling Score Calculator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tap any frame and enter pin counts. Strikes (X) and spares (/) are scored automatically.
            </p>
          </header>

          <section className="border border-border bg-card p-3 mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg text-secondary font-bold">Your Score</h2>
              <div className="text-3xl font-bold text-primary tabular-nums">{score}</div>
            </div>
            <FrameByFrameInput onScoreChange={(total) => setScore(total)} />
          </section>

          <section className="prose prose-invert max-w-none border-t border-border pt-4">
            <h2 className="text-xl text-secondary font-bold mb-3">How Bowling Scoring Works</h2>

            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              If you've ever stared at a scoreboard wondering why a single strike suddenly
              jumped your total by 25 pins, you're not alone. Bowling scoring looks simple
              at a glance — knock down pins, add them up — but the bonus rules for strikes
              and spares trip up new and returning bowlers all the time. This free{" "}
              <strong>bowling score calculator</strong> handles the math for you, so you
              can focus on the next shot. Below is a complete guide to{" "}
              <strong>how to keep score in bowling</strong>, the same logic our calculator
              uses behind the scenes.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">The Basics: 10 Frames, 2 Rolls</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              A standard game of ten-pin bowling consists of 10 frames. In frames 1 through
              9, you get up to two rolls to knock down all 10 pins. If you knock down all
              10 with your first ball, that's a <strong>strike</strong> and the frame ends
              immediately. If it takes both balls to clear the rack, that's a{" "}
              <strong>spare</strong>. If pins are still standing after two rolls, that's an
              <strong> open frame</strong>, and you simply score the number of pins you knocked down.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Open Frames: The Easy Part</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Open frames are the simplest case. Roll a 6 followed by a 2 and your frame
              score is 8. Add that to your running total and move on. No bonus, no
              lookahead. If every frame in your game were open, the maximum possible score
              would be just 90 — which is exactly why strikes and spares matter so much.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Spares: 10 Plus Your Next Roll</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              When you pick up a spare, the frame is worth 10 pins{" "}
              <em>plus the pin count of your very next roll</em>. That means a spare frame
              isn't finalized until you throw the first ball of the following frame. Roll a
              spare in frame 3 and then a 7 to start frame 4, and frame 3 scores 17. This
              "lookahead" is exactly why our <strong>bowling score calculator</strong> waits
              to fill in cumulative totals — it can't know your spare bonus until you take
              the next shot.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Strikes: 10 Plus Your Next Two Rolls</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Strikes are even more rewarding. A strike scores 10 pins{" "}
              <em>plus the total of your next two rolls</em>. String two strikes together
              (a "double") and your first strike frame is worth 20 plus your third roll.
              String three strikes (a "turkey") and that first frame is worth a full 30.
              This compounding bonus is why a perfect game — 12 strikes in a row — totals
              the famous score of 300, even though only 120 pins were physically knocked down.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">The 10th Frame: Special Rules</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              The 10th frame is where new bowlers get confused, because it can include up
              to <strong>three rolls</strong> instead of two. The reason is fairness: if
              you throw a strike or spare in your final frame, you still need to "deliver"
              the bonus pins that those shots would normally pull from future frames. Roll
              a strike in the 10th and you earn two more rolls. Roll a spare and you earn
              one more. Open the 10th and the game ends after two balls. Our calculator
              automatically opens the third box only when you've earned it.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Reading the Symbols</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Every <strong>bowling score calculator</strong>, paper scorecard, and
              automatic scoring monitor uses the same shorthand. An <strong>X</strong>{" "}
              means a strike. A <strong>/</strong> means a spare. A <strong>-</strong>{" "}
              (or sometimes a "0") means a gutter ball or missed pin. An{" "}
              <strong>F</strong> stands for a foul, where the bowler crossed the foul line
              — the roll counts as zero pins for that delivery. Knowing these symbols makes
              it easy to read any scoresheet at a glance.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">A Quick Worked Example</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Imagine you bowl a strike in frame 1, then a 7 and a spare in frame 2,
              followed by a 9 and a miss in frame 3. Frame 1 scores 10 + 7 + 3 = 20. Frame
              2 scores 10 + 9 = 19, for a running total of 39. Frame 3 adds 9, bringing you
              to 48 after three frames. Try it in the calculator above — you'll see the
              same numbers populate as you enter each roll.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Why Use a Bowling Score Calculator?</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Most bowling centers have automatic scoring, so why bother learning the math?
              Three reasons. First, knowing <strong>how to keep score in bowling</strong>{" "}
              helps you understand <em>why</em> a single strike or spare matters so much,
              which changes how you approach each shot. Second, scoring monitors break,
              freeze, or get reset by accident — being able to verify the score yourself
              keeps your league night moving. Third, if you're practicing at home, in a
              backyard set, or scoring an old game from memory, this tool gives you the
              right answer instantly without paper or pen.
            </p>

            <h3 className="text-lg text-primary font-bold mt-4 mb-2">Take Your Game Further</h3>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Once you're comfortable keeping score, the next step is tracking your games
              over time. Alley Cat lets you log every frame, monitor your rolling average,
              measure your spare conversion rate, and see how you stack up against bowlers
              at your local center. Use this calculator for one-off games, then{" "}
              <a href="/auth" className="text-primary underline">create a free account</a>{" "}
              to start building a real bowling history. Whether you're a casual weekend
              roller or chasing your first 200 game, understanding the scoring system is
              the foundation everything else is built on.
            </p>
          </section>
        </div>
      </main>
    </>
  );
};

export default BowlingScoreCalculator;

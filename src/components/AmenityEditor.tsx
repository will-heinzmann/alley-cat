import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const PINSETTER_OPTIONS = ["Unknown", "String Pinsetters", "Traditional Pinsetters"] as const;
const SURFACE_OPTIONS = ["Unknown", "Synthetic Lanes", "Real Wood", "Mixed"] as const;
const AMENITY_OPTIONS = [
  "Bar / Lounge",
  "Full Restaurant",
  "Arcade",
  "Pro Shop",
  "Glow / Cosmic Bowling",
  "Leagues",
  "Birthday Parties",
  "Bumpers Available",
  "Lessons / Coaching",
  "Pool Tables",
];

interface AmenityEditorProps {
  alley: {
    id: string;
    pinsetter_type: string;
    lane_surface?: string | null;
    amenities?: string[] | null;
  };
  onUpdated: () => void;
}

const AmenityEditor = ({ alley, onUpdated }: AmenityEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [pinsetter, setPinsetter] = useState(alley.pinsetter_type || "Unknown");
  const [surface, setSurface] = useState(alley.lane_surface || "Unknown");
  const [amenities, setAmenities] = useState<string[]>(alley.amenities || []);
  const [saving, setSaving] = useState(false);

  const currentAmenities = alley.amenities || [];
  const currentSurface = alley.lane_surface || "Unknown";

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("alleys")
      .update({ pinsetter_type: pinsetter, lane_surface: surface, amenities })
      .eq("id", alley.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated!", description: "Amenities saved." });
      setEditing(false);
      onUpdated();
    }
  };

  return (
    <section className="border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <h3 className="text-sm text-secondary font-bold">🏷️ Amenities & Features</h3>
        {user && !editing && (
          <button onClick={() => setEditing(true)} className="text-primary text-xs hover:underline">
            [Edit]
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-1 text-xs">
          <p>
            <span className="text-muted-foreground">Pinsetter:</span>{" "}
            <span className="text-foreground font-bold">{alley.pinsetter_type || "Unknown"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Lane Surface:</span>{" "}
            <span className="text-foreground font-bold">{currentSurface}</span>
          </p>
          {currentAmenities.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {currentAmenities.map((a) => (
                <span key={a} className="border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground">
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              No amenities listed yet. {user ? "Click [Edit] to add some!" : "Sign in to contribute."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <label className="block">
            <span className="text-muted-foreground">Pinsetter Type:</span>
            <select
              value={pinsetter}
              onChange={(e) => setPinsetter(e.target.value)}
              className="block w-full border border-border bg-input px-2 py-1 text-foreground mt-1 outline-none"
            >
              {PINSETTER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground">Lane Surface:</span>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="block w-full border border-border bg-input px-2 py-1 text-foreground mt-1 outline-none"
            >
              {SURFACE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <div>
            <p className="text-muted-foreground mb-1">Amenities (toggle):</p>
            <div className="flex flex-wrap gap-1">
              {AMENITY_OPTIONS.map((a) => {
                const on = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`border px-2 py-0.5 text-[10px] ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground"}`}
                  >
                    {on ? "✓ " : "+ "}{a}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="border border-primary bg-primary text-primary-foreground px-3 py-1 text-xs hover:opacity-80 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setPinsetter(alley.pinsetter_type || "Unknown");
                setSurface(alley.lane_surface || "Unknown");
                setAmenities(alley.amenities || []);
              }}
              className="border border-border bg-muted text-foreground px-3 py-1 text-xs hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AmenityEditor;

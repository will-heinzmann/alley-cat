import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSlug } from "@/lib/slug";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

interface AddAlleyDialogProps {
  onAlleyAdded: () => void;
}

const AddAlleyDialog = ({ onAlleyAdded }: AddAlleyDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    lane_count: "",
    phone: "",
    website: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in to add an alley.");
      return;
    }

    const { name, address, city, state, lane_count } = form;
    if (!name.trim() || !address.trim() || !city.trim() || !state || !lane_count) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const lanes = parseInt(lane_count);
    if (isNaN(lanes) || lanes < 1) {
      toast.error("Lane count must be at least 1.");
      return;
    }

    setSubmitting(true);

    // Check for duplicate by name + city + state
    const { data: existing } = await supabase
      .from("alleys")
      .select("id, name")
      .ilike("name", name.trim())
      .ilike("city", city.trim())
      .eq("state", state)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error(`"${existing[0].name}" in ${city.trim()}, ${state} already exists in our database!`);
      setSubmitting(false);
      return;
    }

    const slug = generateSlug(name.trim(), city.trim());

    const { error } = await supabase.from("alleys").insert({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      lane_count: lanes,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      alley_rating: 0,
      beer_rating: 0,
      slug,
    });

    setSubmitting(false);

    if (error) {
      console.error("Add alley error:", error);
      toast.error(error.message || "Failed to add alley. Please try again.");
      return;
    }

    toast.success("Alley added successfully! 🎳");
    setForm({ name: "", address: "", city: "", state: "", lane_count: "", phone: "", website: "" });
    setOpen(false);
    onAlleyAdded();
  };

  if (!user) return null;

  const inputClass = "w-full bg-input border border-border px-2 py-1 text-foreground text-sm outline-none";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs px-2 py-0.5 border border-border text-muted-foreground hover:border-primary hover:text-primary">
          [+ Add Alley]
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-primary text-sm">🎳 ADD NEW BOWLING ALLEY</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <table className="w-full border border-border text-sm">
            <tbody>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs w-28">Name *</td>
                <td className="border border-border p-1">
                  <input value={form.name} onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Lucky Strike Lanes" className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">Address *</td>
                <td className="border border-border p-1">
                  <input value={form.address} onChange={(e) => update("address", e.target.value)}
                    placeholder="e.g. 123 Main St" className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">City *</td>
                <td className="border border-border p-1">
                  <input value={form.city} onChange={(e) => update("city", e.target.value)}
                    placeholder="e.g. Chicago" className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">State *</td>
                <td className="border border-border p-1">
                  <select value={form.state} onChange={(e) => update("state", e.target.value)} className={inputClass}>
                    <option value="">Select state...</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">Lanes *</td>
                <td className="border border-border p-1">
                  <input type="number" min="1" value={form.lane_count}
                    onChange={(e) => update("lane_count", e.target.value)}
                    placeholder="e.g. 24" className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">Phone</td>
                <td className="border border-border p-1">
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                    placeholder="e.g. (555) 123-4567" className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="border border-border p-2 bg-muted text-xs">Website</td>
                <td className="border border-border p-1">
                  <input value={form.website} onChange={(e) => update("website", e.target.value)}
                    placeholder="e.g. https://example.com" className={inputClass} />
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">* Required fields</p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full border border-primary bg-primary text-primary-foreground py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Checking & Submitting..." : "Submit New Alley"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlleyDialog;

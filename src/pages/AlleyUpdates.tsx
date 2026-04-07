import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ADMIN_ID = "094958ab-cf6a-4ab2-a771-ff8697b4e65f";

const AlleyUpdates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.id === ADMIN_ID;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("alley_update_requests")
      .select("*, alleys(name, slug)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch usernames for submitters
    const items = data || [];
    if (items.length > 0) {
      const userIds = [...new Set(items.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.username]));
      items.forEach((r: any) => { r._username = profileMap.get(r.user_id) || "Unknown"; });
    }
    setRequests(items);
    setLoading(false);
  };

  const handleReview = async (id: string, action: "approved" | "rejected", request: any) => {
    if (action === "approved") {
      // Apply the update to the alley
      const updateData: any = {};
      if (request.field_name === "lane_count") {
        updateData.lane_count = parseInt(request.new_value);
      } else if (request.field_name === "phone") {
        updateData.phone = request.new_value || null;
      } else {
        updateData[request.field_name] = request.new_value;
      }

      const { error: updateError } = await supabase
        .from("alleys")
        .update(updateData)
        .eq("id", request.alley_id);

      if (updateError) {
        toast({ title: "Error applying update", description: updateError.message, variant: "destructive" });
        return;
      }
    }

    const { error } = await supabase
      .from("alley_update_requests")
      .update({ status: action, reviewed_by: user!.id })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: action === "approved" ? "Approved ✅" : "Rejected ❌", description: `Update request ${action}.` });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sign in to view this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">🔒 This page is restricted to administrators.</p>
          <Link to="/alleys" className="text-primary text-xs hover:underline mt-2 block">← Back to Alleys</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4">
        <Link to="/alleys" className="text-primary text-xs">← Back to Directory</Link>
        <h1 className="text-lg text-primary mt-1">📋 ALLEY UPDATE REQUESTS</h1>
        <hr className="border-primary mt-2" />
      </header>

      <div className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No pending update requests. 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const profile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
              const alley = Array.isArray(req.alleys) ? req.alleys[0] : req.alleys;
              return (
                <div key={req.id} className="border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      By <span className="text-primary">{profile?.username || "Unknown"}</span> · {new Date(req.created_at).toLocaleDateString()}
                    </span>
                    {alley && (
                      <Link to={`/alley/${alley.slug}`} className="text-xs text-primary hover:underline">
                        {alley.name}
                      </Link>
                    )}
                  </div>
                  <table className="w-full border border-border text-xs mb-2">
                    <tbody>
                      <tr>
                        <td className="border border-border p-1 bg-muted w-20">Field</td>
                        <td className="border border-border p-1 text-foreground">{req.field_name}</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-1 bg-muted">Old Value</td>
                        <td className="border border-border p-1 text-muted-foreground">{req.old_value || "—"}</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-1 bg-muted">New Value</td>
                        <td className="border border-border p-1 text-primary font-bold">{req.new_value}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, "approved", req)}
                      className="flex-1 border border-primary bg-primary text-primary-foreground py-1 text-xs hover:opacity-80"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "rejected", req)}
                      className="flex-1 border border-border bg-muted text-muted-foreground py-1 text-xs hover:opacity-80"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlleyUpdates;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { toast } = useToast();
  const [pixelId, setPixelId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "facebook_pixel_id").maybeSingle();
      if (data) setPixelId(data.value);
      setLoading(false);
    };
    fetch();
  }, []);

  const savePixel = async () => {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "facebook_pixel_id").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: pixelId }).eq("key", "facebook_pixel_id");
    } else {
      await supabase.from("site_settings").insert({ key: "facebook_pixel_id", value: pixelId });
    }
    toast({ title: "Pixel ID saved" });
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="mt-8 max-w-lg space-y-8">
        {/* Facebook Pixel */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">Facebook Pixel</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your Facebook Pixel ID for tracking.</p>
          <div className="mt-4">
            <Label htmlFor="pixel">Pixel ID</Label>
            <Input id="pixel" value={pixelId} onChange={(e) => setPixelId(e.target.value)} className="mt-1" placeholder="Enter Pixel ID" />
          </div>
          <Button onClick={savePixel} className="mt-4">Save</Button>
        </div>

        {/* Courier Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">Courier Integration</h3>
          <p className="mt-1 text-sm text-muted-foreground">Courier API integration placeholder. Configure your preferred courier service here.</p>
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Coming soon — Steadfast, Pathao, RedX integration support.
          </div>
        </div>

        {/* SMTP Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">Email Notifications (SMTP)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Configure SMTP for order notification emails.</p>
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            SMTP configuration can be set up via backend secrets. Contact support for setup.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

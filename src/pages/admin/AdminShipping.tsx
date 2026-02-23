import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Save, Trash2, Package } from "lucide-react";

interface ShippingZone {
  id: string;
  zone_name: string;
  zone_label: string;
  shipping_rate: number;
  free_shipping_minimum: number | null;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_time_unit: string;
  is_active: boolean;
  sort_order: number;
}

const AdminShipping = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchZones = async () => {
    const { data } = await supabase
      .from("shipping_zones")
      .select("*")
      .order("sort_order");
    setZones((data as ShippingZone[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const updateZone = (id: string, field: keyof ShippingZone, value: any) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [field]: value } : z))
    );
  };

  const addZone = () => {
    const newZone: ShippingZone = {
      id: `new-${Date.now()}`,
      zone_name: "",
      zone_label: "",
      shipping_rate: 0,
      free_shipping_minimum: null,
      delivery_time_min: 1,
      delivery_time_max: 3,
      delivery_time_unit: "days",
      is_active: true,
      sort_order: zones.length + 1,
    };
    setZones((prev) => [...prev, newZone]);
  };

  const deleteZone = async (id: string) => {
    if (id.startsWith("new-")) {
      setZones((prev) => prev.filter((z) => z.id !== id));
      return;
    }
    const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
    if (error) {
      toast({ title: "ডিলিট ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      setZones((prev) => prev.filter((z) => z.id !== id));
      toast({ title: "জোন ডিলিট হয়েছে" });
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const zone of zones) {
        const payload = {
          zone_name: zone.zone_name,
          zone_label: zone.zone_label,
          shipping_rate: zone.shipping_rate,
          free_shipping_minimum: zone.free_shipping_minimum,
          delivery_time_min: zone.delivery_time_min,
          delivery_time_max: zone.delivery_time_max,
          delivery_time_unit: zone.delivery_time_unit,
          is_active: zone.is_active,
          sort_order: zone.sort_order,
        };
        if (zone.id.startsWith("new-")) {
          const { data, error } = await supabase.from("shipping_zones").insert(payload).select("id").single();
          if (error) throw error;
          zone.id = data.id;
        } else {
          const { error } = await supabase.from("shipping_zones").update(payload).eq("id", zone.id);
          if (error) throw error;
        }
      }
      toast({ title: "শিপিং সেটিংস সেভ হয়েছে ✅" });
      fetchZones();
    } catch (err: any) {
      toast({ title: "সেভ ব্যর্থ", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Shipping Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">শিপিং জোন, রেট এবং ডেলিভারি টাইম ম্যানেজ করুন।</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addZone} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন জোন
          </Button>
          <Button onClick={saveAll} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {zones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">কোনো শিপিং জোন নেই। নতুন জোন যোগ করুন।</p>
          </div>
        ) : (
          zones.map((zone, idx) => (
            <div key={zone.id} className="rounded-xl glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  {zone.zone_label || "নতুন জোন"}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${zone.id}`} className="text-xs text-muted-foreground">সক্রিয়</Label>
                    <Switch
                      id={`active-${zone.id}`}
                      checked={zone.is_active}
                      onCheckedChange={(v) => updateZone(zone.id, "is_active", v)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteZone(zone.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>জোন আইডি (ইংরেজি)</Label>
                  <Input
                    value={zone.zone_name}
                    onChange={(e) => updateZone(zone.id, "zone_name", e.target.value)}
                    className="mt-1"
                    placeholder="e.g. inside_dhaka"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">ইউনিক আইডেন্টিফায়ার</p>
                </div>
                <div>
                  <Label>জোনের নাম (বাংলা)</Label>
                  <Input
                    value={zone.zone_label}
                    onChange={(e) => updateZone(zone.id, "zone_label", e.target.value)}
                    className="mt-1"
                    placeholder="e.g. ঢাকার ভিতরে"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">ইউজারকে দেখানো হবে</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>শিপিং রেট (৳)</Label>
                  <Input
                    type="number"
                    value={zone.shipping_rate}
                    onChange={(e) => updateZone(zone.id, "shipping_rate", parseInt(e.target.value) || 0)}
                    className="mt-1"
                    min={0}
                  />
                </div>
                <div>
                  <Label>ফ্রি শিপিং মিনিমাম (৳)</Label>
                  <Input
                    type="number"
                    value={zone.free_shipping_minimum ?? ""}
                    onChange={(e) => updateZone(zone.id, "free_shipping_minimum", e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1"
                    placeholder="খালি রাখলে ফ্রি শিপিং নেই"
                    min={0}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">এই পরিমাণের উপরে অর্ডারে ফ্রি শিপিং</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>ডেলিভারি (সর্বনিম্ন)</Label>
                  <Input
                    type="number"
                    value={zone.delivery_time_min}
                    onChange={(e) => updateZone(zone.id, "delivery_time_min", parseInt(e.target.value) || 1)}
                    className="mt-1"
                    min={1}
                  />
                </div>
                <div>
                  <Label>ডেলিভারি (সর্বোচ্চ)</Label>
                  <Input
                    type="number"
                    value={zone.delivery_time_max}
                    onChange={(e) => updateZone(zone.id, "delivery_time_max", parseInt(e.target.value) || 1)}
                    className="mt-1"
                    min={1}
                  />
                </div>
                <div>
                  <Label>সময়ের একক</Label>
                  <select
                    value={zone.delivery_time_unit}
                    onChange={(e) => updateZone(zone.id, "delivery_time_unit", e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="days">দিন</option>
                    <option value="hours">ঘণ্টা</option>
                    <option value="weeks">সপ্তাহ</option>
                  </select>
                </div>
              </div>

              {/* Preview summary */}
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{zone.zone_label || "—"}</span>
                {" — "}
                শিপিং: <span className="font-semibold text-foreground">৳{zone.shipping_rate}</span>
                {zone.free_shipping_minimum && (
                  <> | ৳{zone.free_shipping_minimum}+ অর্ডারে <span className="text-green-600 font-medium">ফ্রি</span></>
                )}
                {" | "}
                ডেলিভারি: <span className="font-semibold text-foreground">{zone.delivery_time_min}-{zone.delivery_time_max} {zone.delivery_time_unit === "days" ? "দিন" : zone.delivery_time_unit === "hours" ? "ঘণ্টা" : "সপ্তাহ"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminShipping;

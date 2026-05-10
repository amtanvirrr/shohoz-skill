import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Copy, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  product_id: string | null;
  product_type: string | null;
  created_at: string;
}

const AdminCoupons = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const emptyForm = {
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 0,
    max_uses: null as number | null,
    is_active: true,
    expires_at: null as string | null,
    product_id: null as string | null,
    product_type: null as string | null,
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as any[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({ title: "কুপন কোড আবশ্যক", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
    };

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload as any).eq("id", editing.id);
      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "কুপন আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("coupons").insert(payload as any);
      if (error) { toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "কুপন তৈরি হয়েছে" });
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("মুছে ফেলতে চান?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    fetchCoupons();
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_amount: c.min_order_amount,
      max_uses: c.max_uses,
      is_active: c.is_active,
      expires_at: c.expires_at,
      product_id: c.product_id,
      product_type: c.product_type,
    });
    setDialogOpen(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "কোড কপি হয়েছে" });
  };

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date();
  const isMaxed = (c: Coupon) => c.max_uses !== null && c.used_count >= c.max_uses;

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">কুপন ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground">ডিসকাউন্ট কুপন কোড তৈরি ও পরিচালনা করুন</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> নতুন কুপন
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">এখনো কোনো কুপন তৈরি করা হয়নি</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map(c => (
            <Card key={c.id} className={!c.is_active || isExpired(c) || isMaxed(c) ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg font-mono">{c.code}</CardTitle>
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {!c.is_active && <Badge variant="secondary">নিষ্ক্রিয়</Badge>}
                    {isExpired(c) && <Badge variant="destructive">মেয়াদ শেষ</Badge>}
                    {isMaxed(c) && <Badge variant="secondary">সীমা পূর্ণ</Badge>}
                    {c.is_active && !isExpired(c) && !isMaxed(c) && <Badge className="bg-success/15 text-success">সক্রিয়</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-sm text-foreground font-medium">
                  {c.discount_type === "percentage" ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ছাড়`}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {c.min_order_amount > 0 && <p>সর্বনিম্ন অর্ডার: ৳{c.min_order_amount}</p>}
                  <p>ব্যবহৃত: {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""} বার</p>
                  {c.expires_at && <p>মেয়াদ: {new Date(c.expires_at).toLocaleDateString("bn-BD")}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5 mr-1" /> এডিট</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "কুপন এডিট করুন" : "নতুন কুপন তৈরি করুন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>কুপন কোড *</Label>
              <Input className="mt-1 font-mono uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DISCOUNT20" />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label>ডিসকাউন্ট ধরন</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                    <SelectItem value="fixed">নির্দিষ্ট টাকা (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ডিসকাউন্ট পরিমাণ</Label>
                <Input type="number" className="mt-1" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label>সর্বনিম্ন অর্ডার (৳)</Label>
                <Input type="number" className="mt-1" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>সর্বোচ্চ ব্যবহার (খালি = সীমাহীন)</Label>
                <Input type="number" className="mt-1" value={form.max_uses ?? ""} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? Number(e.target.value) : null }))} placeholder="সীমাহীন" />
              </div>
            </div>
            <div>
              <Label>মেয়াদ শেষের তারিখ (ঐচ্ছিক)</Label>
              <Input type="datetime-local" className="mt-1" value={form.expires_at?.slice(0, 16) || ""} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>সক্রিয়</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
              <Button onClick={handleSave}>{editing ? "আপডেট করুন" : "তৈরি করুন"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;

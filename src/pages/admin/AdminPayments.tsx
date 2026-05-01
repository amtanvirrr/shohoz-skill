import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Smartphone, QrCode, Save, X, Globe, Copy, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  provider: string;
  display_name: string;
  phone_number: string;
  qr_code_url: string | null;
  mfs_type: string;
  payment_instruction: string;
  process_message: string;
  is_active: boolean;
  sort_order: number;
}

const providerOptions = [
  { value: "bkash", label: "বিকাশ (bKash)" },
  { value: "nagad", label: "নগদ (Nagad)" },
  { value: "rocket", label: "রকেট (Rocket)" },
  { value: "upay", label: "উপায় (Upay)" },
];

const mfsTypeOptions = [
  { value: "personal", label: "পার্সোনাল" },
  { value: "agent", label: "এজেন্ট" },
  { value: "merchant", label: "মার্চেন্ট" },
];

const emptyForm: Omit<PaymentMethod, "id"> = {
  provider: "bkash",
  display_name: "",
  phone_number: "",
  qr_code_url: null,
  mfs_type: "personal",
  payment_instruction: "",
  process_message: "",
  is_active: true,
  sort_order: 0,
};

const AdminPayments = () => {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // SSLCOMMERZ state
  const [sslcz, setSslcz] = useState({
    sslcz_store_id: "",
    sslcz_store_password: "",
    sslcz_mode: "sandbox",
    sslcz_enabled: "false",
    sslcz_display_name: "অনলাইন পেমেন্ট (কার্ড / মোবাইল ব্যাংকিং)",
    sslcz_min_amount: "10",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [savingSslcz, setSavingSslcz] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const ipnUrl = `${supabaseUrl}/functions/v1/sslcz-ipn`;
  const successUrl = `${supabaseUrl}/functions/v1/sslcz-redirect?status=success`;
  const failUrl = `${supabaseUrl}/functions/v1/sslcz-redirect?status=fail`;
  const cancelUrl = `${supabaseUrl}/functions/v1/sslcz-redirect?status=cancel`;

  const fetchMethods = async () => {
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort_order");
    setMethods((data as PaymentMethod[]) || []);
    setLoading(false);
  };

  const fetchSslcz = async () => {
    const keys = ["sslcz_store_id", "sslcz_store_password", "sslcz_mode", "sslcz_enabled", "sslcz_display_name", "sslcz_min_amount"];
    const { data } = await supabase.from("site_settings").select("key, value").in("key", keys);
    if (data) {
      const next = { ...sslcz };
      data.forEach((row: any) => {
        if (row.key in next) (next as any)[row.key] = row.value;
      });
      setSslcz(next);
    }
  };

  useEffect(() => { fetchMethods(); fetchSslcz(); }, []);

  const saveSslcz = async () => {
    if (sslcz.sslcz_enabled === "true" && (!sslcz.sslcz_store_id.trim() || !sslcz.sslcz_store_password.trim())) {
      toast({ title: "Store ID এবং Password দিন", variant: "destructive" });
      return;
    }
    setSavingSslcz(true);
    // Sensitive keys go to admin-only site_settings; public flags also mirror to public_site_settings
    const publicKeys = new Set(["sslcz_enabled", "sslcz_display_name", "sslcz_min_amount"]);
    const ops: any[] = [];
    Object.entries(sslcz).forEach(([key, value]) => {
      ops.push(supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" }).then((r) => r));
      if (publicKeys.has(key)) {
        ops.push((supabase as any).from("public_site_settings").upsert({ key, value }, { onConflict: "key" }).then((r: any) => r));
      }
    });
    const results: any[] = await Promise.all(ops);
    setSavingSslcz(false);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast({ title: "Error", description: err.error.message, variant: "destructive" });
    } else {
      toast({ title: "SSLCOMMERZ সেটিংস সেভ হয়েছে" });
    }
  };

  const testConnection = async () => {
    if (!sslcz.sslcz_store_id.trim() || !sslcz.sslcz_store_password.trim()) {
      toast({ title: "আগে Store ID ও Password দিন", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const baseUrl = sslcz.sslcz_mode === "live"
        ? "https://securepay.sslcommerz.com"
        : "https://sandbox.sslcommerz.com";
      const params = new URLSearchParams({
        store_id: sslcz.sslcz_store_id,
        store_passwd: sslcz.sslcz_store_password,
        total_amount: "10",
        currency: "BDT",
        tran_id: `TEST-${Date.now()}`,
        success_url: successUrl,
        fail_url: failUrl,
        cancel_url: cancelUrl,
        cus_name: "Test",
        cus_email: "test@test.com",
        cus_phone: "01700000000",
        cus_add1: "Dhaka",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: "Connection Test",
        product_category: "test",
        product_profile: "non-physical-goods",
        num_of_item: "1",
      });
      const resp = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await resp.json();
      if (data.status === "SUCCESS") {
        setTestResult({ ok: true, msg: "✅ কানেকশন সফল! ক্রেডেনশিয়াল সঠিক।" });
      } else {
        setTestResult({ ok: false, msg: `❌ ব্যর্থ: ${data.failedreason || data.status || "Unknown"}` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ ত্রুটি: ${(e as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} কপি হয়েছে` });
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: methods.length });
    setDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setForm({
      provider: m.provider,
      display_name: m.display_name,
      phone_number: m.phone_number,
      qr_code_url: m.qr_code_url,
      mfs_type: m.mfs_type,
      payment_instruction: m.payment_instruction,
      process_message: m.process_message,
      is_active: m.is_active,
      sort_order: m.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.phone_number.trim()) {
      toast({ title: "ফোন নাম্বার দিন", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      provider: form.provider,
      display_name: form.display_name || providerOptions.find(p => p.value === form.provider)?.label || form.provider,
      phone_number: form.phone_number,
      qr_code_url: form.qr_code_url || null,
      mfs_type: form.mfs_type,
      payment_instruction: form.payment_instruction,
      process_message: form.process_message,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("payment_methods").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("payment_methods").insert(payload));
    }
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "আপডেট হয়েছে" : "যোগ হয়েছে" });
      setDialogOpen(false);
      fetchMethods();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই পেমেন্ট মেথড মুছতে চান?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    fetchMethods();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("payment_methods").update({ is_active: !current }).eq("id", id);
    fetchMethods();
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "bkash": return "bg-pink-500/10 text-pink-600";
      case "nagad": return "bg-orange-500/10 text-orange-600";
      case "rocket": return "bg-purple-500/10 text-purple-600";
      case "upay": return "bg-green-500/10 text-green-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পেমেন্ট মেথড</h1>
          <p className="mt-1 text-sm text-muted-foreground">পেমেন্ট গেটওয়ে ও ম্যানুয়াল MFS অপশন ম্যানেজ করুন</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> নতুন যোগ করুন</Button>
      </div>

      {/* SSLCOMMERZ Gateway Section */}
      <div className="mt-6 rounded-xl glass-card p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">SSLCOMMERZ গেটওয়ে</h2>
              <p className="text-sm text-muted-foreground">কার্ড, bKash, Nagad, Rocket — সব একসাথে স্বয়ংক্রিয় ভেরিফিকেশন সহ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">সক্রিয়</Label>
            <Switch
              checked={sslcz.sslcz_enabled === "true"}
              onCheckedChange={(v) => setSslcz({ ...sslcz, sslcz_enabled: v ? "true" : "false" })}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Store ID *</Label>
            <Input
              className="mt-1"
              value={sslcz.sslcz_store_id}
              onChange={(e) => setSslcz({ ...sslcz, sslcz_store_id: e.target.value })}
              placeholder="yourstore"
            />
          </div>
          <div>
            <Label>Store Password *</Label>
            <div className="relative mt-1">
              <Input
                type={showPwd ? "text" : "password"}
                value={sslcz.sslcz_store_password}
                onChange={(e) => setSslcz({ ...sslcz, sslcz_store_password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Mode *</Label>
            <Select value={sslcz.sslcz_mode} onValueChange={(v) => setSslcz({ ...sslcz, sslcz_mode: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (টেস্টিং)</SelectItem>
                <SelectItem value="live">Live (প্রোডাকশন)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ডিসপ্লে নাম</Label>
            <Input
              className="mt-1"
              value={sslcz.sslcz_display_name}
              onChange={(e) => setSslcz({ ...sslcz, sslcz_display_name: e.target.value })}
              placeholder="অনলাইন পেমেন্ট (কার্ড/MFS)"
            />
          </div>
          <div>
            <Label>ন্যূনতম পেমেন্ট পরিমাণ (৳)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              className="mt-1"
              value={sslcz.sslcz_min_amount}
              onChange={(e) => setSslcz({ ...sslcz, sslcz_min_amount: e.target.value })}
              placeholder="10"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              SSLCOMMERZ অ্যাডমিন কনফিগারেশনের ন্যূনতম ট্রানজেকশন সীমা। এই মূল্যের নিচে অনলাইন পেমেন্ট বাটন নিষ্ক্রিয় থাকবে এবং ব্যবহারকারীকে বার্তা দেখানো হবে।
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveSslcz} disabled={savingSslcz}>
            <Save className="mr-2 h-4 w-4" /> {savingSslcz ? "সেভ হচ্ছে..." : "সেটিংস সেভ করুন"}
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {testing ? "টেস্ট হচ্ছে..." : "Test Connection"}
          </Button>
        </div>

        {testResult && (
          <div className={`mt-3 rounded-lg border p-3 text-sm ${testResult.ok ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
            {testResult.msg}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">SSLCOMMERZ মার্চেন্ট প্যানেলে এই URL গুলো সেট করুন:</p>
          <div className="mt-3 space-y-2">
            {[
              { label: "IPN URL", url: ipnUrl },
              { label: "Success URL", url: successUrl },
              { label: "Fail URL", url: failUrl },
              { label: "Cancel URL", url: cancelUrl },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 p-2">
                <span className="text-xs font-semibold text-muted-foreground min-w-[80px]">{item.label}:</span>
                <code className="flex-1 truncate text-xs text-foreground">{item.url}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(item.url, item.label)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            💡 প্রোডাকশনে যাওয়ার আগে SSLCOMMERZ থেকে Live store credentials নিন এবং Mode "Live" করে দিন।
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">ম্যানুয়াল MFS অপশন</h2>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : methods.length === 0 ? (
        <div className="mt-12 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">কোনো পেমেন্ট মেথড যোগ করা হয়নি।</p>
          <Button className="mt-4" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> পেমেন্ট মেথড যোগ করুন</Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {methods.map((m) => (
            <div key={m.id} className={`rounded-xl glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 ${!m.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${getProviderColor(m.provider)}`}>
                    {m.provider}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{m.display_name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{m.mfs_type}</p>
                  </div>
                </div>
                <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m.id, m.is_active)} />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <Smartphone className="h-4 w-4 text-muted-foreground" /> {m.phone_number}
                </div>
                {m.qr_code_url && (
                  <div className="flex items-center gap-2 text-foreground">
                    <QrCode className="h-4 w-4 text-muted-foreground" /> QR Code সেট করা আছে
                  </div>
                )}
                {m.payment_instruction && (
                  <p className="text-muted-foreground line-clamp-2">{m.payment_instruction}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "পেমেন্ট মেথড এডিট করুন" : "নতুন পেমেন্ট মেথড"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label>প্রোভাইডার *</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ডিসপ্লে নাম</Label>
              <Input className="mt-1" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="যেমন: বিকাশ পার্সোনাল" />
            </div>

            <div>
              <Label>ফোন নাম্বার *</Label>
              <Input className="mt-1" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="01XXXXXXXXX" />
            </div>

            <div>
              <Label>QR Code URL</Label>
              <Input className="mt-1" value={form.qr_code_url || ""} onChange={(e) => setForm({ ...form, qr_code_url: e.target.value })} placeholder="QR Code ইমেজ URL" />
              {form.qr_code_url && (
                <img src={form.qr_code_url} alt="QR Preview" className="mt-2 h-32 w-32 rounded-lg border border-border object-contain" />
              )}
            </div>

            <div>
              <Label>MFS টাইপ *</Label>
              <Select value={form.mfs_type} onValueChange={(v) => setForm({ ...form, mfs_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mfsTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>পেমেন্ট ইন্সট্রাকশন</Label>
              <Textarea className="mt-1" rows={3} value={form.payment_instruction} onChange={(e) => setForm({ ...form, payment_instruction: e.target.value })} placeholder="যেমন: Send Money করে এই নাম্বারে টাকা পাঠান..." />
            </div>

            <div>
              <Label>প্রসেস মেসেজ / নোট</Label>
              <Textarea className="mt-1" rows={3} value={form.process_message} onChange={(e) => setForm({ ...form, process_message: e.target.value })} placeholder="যেমন: পেমেন্ট করার পর Transaction ID সহ অর্ডার করুন..." />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>সক্রিয়</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                <X className="mr-2 h-4 w-4" /> বাতিল
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Download, Trash2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

const AdminNewsletter = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    setSubscribers((data as Subscriber[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const filtered = subscribers.filter(
    (s) => s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.is_active).length;

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে");
    } else {
      toast.success("সাবস্ক্রাইবার মুছে ফেলা হয়েছে");
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (error) {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } else {
      setSubscribers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s))
      );
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Email", "Status", "Subscribed Date"],
      ...filtered.map((s) => [
        s.email,
        s.is_active ? "Active" : "Inactive",
        new Date(s.created_at).toLocaleDateString("en-US"),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হচ্ছে");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{subscribers.length}</p>
              <p className="text-sm text-muted-foreground">মোট সাবস্ক্রাইবার</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">অ্যাক্টিভ</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{subscribers.length - activeCount}</p>
              <p className="text-sm text-muted-foreground">ইনঅ্যাক্টিভ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ইমেইল খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> CSV এক্সপোর্ট ({filtered.length})
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">কোনো সাবস্ক্রাইবার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl glass-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ইমেইল</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">তারিখ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(s.id, s.is_active)}>
                      <Badge variant={s.is_active ? "default" : "secondary"} className="cursor-pointer">
                        {s.is_active ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminNewsletter;

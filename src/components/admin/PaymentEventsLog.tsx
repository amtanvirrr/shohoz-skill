import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RefreshCcw, Search, AlertTriangle, CheckCircle2, ArrowRightCircle, Loader2 } from "lucide-react";

interface PaymentEvent {
  id: string;
  user_id: string | null;
  product_type: string | null;
  product_id: string | null;
  product_title: string | null;
  price: number | null;
  payment_method: string | null;
  event_type: string;
  message: string | null;
  metadata: any;
  user_agent: string | null;
  created_at: string;
}

const EVENT_FILTERS = [
  { value: "all", label: "সব ইভেন্ট" },
  { value: "errors", label: "শুধু ত্রুটি" },
  { value: "ssl_init_start", label: "SSL শুরু" },
  { value: "ssl_redirect", label: "SSL রিডিরেক্ট" },
  { value: "ssl_init_error", label: "SSL ত্রুটি" },
  { value: "mfs_submit_start", label: "MFS সাবমিট" },
  { value: "mfs_submit_success", label: "MFS সফল" },
  { value: "mfs_submit_error", label: "MFS ত্রুটি" },
  { value: "validation_error", label: "ভ্যালিডেশন ত্রুটি" },
];

const ERROR_TYPES = new Set([
  "ssl_init_error",
  "ssl_init_exception",
  "mfs_submit_error",
  "validation_error",
  "auth_required",
]);

const eventStyle = (type: string) => {
  if (ERROR_TYPES.has(type)) return { color: "text-destructive", bg: "bg-destructive/10", Icon: AlertTriangle };
  if (type === "ssl_redirect") return { color: "text-primary", bg: "bg-primary/10", Icon: ArrowRightCircle };
  if (type === "mfs_submit_success") return { color: "text-success", bg: "bg-success/10", Icon: CheckCircle2 };
  return { color: "text-muted-foreground", bg: "bg-muted", Icon: Activity };
};

const formatDate = (s: string) =>
  new Date(s).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" });

export const PaymentEventsLog = () => {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("payment_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "errors") q = q.in("event_type", Array.from(ERROR_TYPES));
    else if (filter !== "all") q = q.eq("event_type", filter);
    const { data } = await q;
    setEvents((data as PaymentEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = events.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return [e.event_type, e.message, e.payment_method, e.product_title]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(s));
  });

  return (
    <div className="mt-6 rounded-xl glass-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">পেমেন্ট ইভেন্ট লগ</h2>
            <p className="text-sm text-muted-foreground">
              সাম্প্রতিক ২০০টি ইভেন্ট — কেন পেমেন্ট ব্যর্থ হচ্ছে দ্রুত খুঁজে বের করুন
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          রিফ্রেশ
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="মেসেজ / পদ্ধতি / প্রোডাক্ট খুঁজুন"
            className="pl-8"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 max-h-[500px] overflow-auto rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">কোনো ইভেন্ট পাওয়া যায়নি</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const { color, bg, Icon } = eventStyle(e.event_type);
              return (
                <li key={e.id} className="p-3 hover:bg-muted/40">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-md ${bg} p-1.5 shrink-0`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-mono text-xs font-semibold ${color}`}>{e.event_type}</span>
                        {e.payment_method && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                            {e.payment_method}
                          </span>
                        )}
                        {e.product_type && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary uppercase">
                            {e.product_type}
                          </span>
                        )}
                        {typeof e.price === "number" && e.price > 0 && (
                          <span className="text-[11px] text-muted-foreground">৳{e.price}</span>
                        )}
                        <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(e.created_at)}</span>
                      </div>
                      {e.product_title && (
                        <p className="mt-0.5 truncate text-xs text-foreground">{e.product_title}</p>
                      )}
                      {e.message && (
                        <p className={`mt-1 text-xs ${ERROR_TYPES.has(e.event_type) ? "text-destructive" : "text-muted-foreground"} break-words`}>
                          {e.message}
                        </p>
                      )}
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <pre className="mt-1 overflow-auto rounded bg-muted/50 p-1.5 text-[10px] text-muted-foreground">
                          {JSON.stringify(e.metadata, null, 0)}
                        </pre>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentEventsLog;
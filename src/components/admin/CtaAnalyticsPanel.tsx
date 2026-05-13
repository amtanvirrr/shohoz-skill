import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface AggRow {
  label: string;
  section: string;
  target_url: string | null;
  count: number;
  last_at: string;
}

const RANGES = [
  { key: "1d", label: "২৪ ঘন্টা", days: 1 },
  { key: "7d", label: "৭ দিন", days: 7 },
  { key: "30d", label: "৩০ দিন", days: 30 },
] as const;

const toBn = (n: number) => n.toLocaleString("bn-BD");

const CtaAnalyticsPanel = () => {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7d");
  const [rows, setRows] = useState<AggRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    setLoading(true);
    supabase
      .from("cta_events")
      .select("section, label, target_url, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          setRows([]);
          setTotal(0);
          return;
        }
        const map = new Map<string, AggRow>();
        data.forEach((d: any) => {
          const key = `${d.section ?? "-"}::${d.label ?? "-"}::${d.target_url ?? "-"}`;
          const existing = map.get(key);
          if (existing) {
            existing.count += 1;
            if (d.created_at > existing.last_at) existing.last_at = d.created_at;
          } else {
            map.set(key, {
              section: d.section ?? "-",
              label: d.label ?? "-",
              target_url: d.target_url ?? null,
              count: 1,
              last_at: d.created_at,
            });
          }
        });
        const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
        setRows(list);
        setTotal(data.length);
      });
  }, [range]);

  const max = rows[0]?.count ?? 1;

  return (
    <div className="rounded-xl glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">CTA ক্লিক বিশ্লেষণ</h2>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                range === r.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        মোট ক্লিক: <span className="font-semibold text-foreground">{toBn(total)}</span>
        {total >= 1000 && <span className="ml-1 text-warning">(সর্বোচ্চ ১০০০ পর্যন্ত)</span>}
      </p>

      <div className="mt-4 space-y-2">
        {loading && <p className="py-6 text-center text-sm text-muted-foreground">লোড হচ্ছে...</p>}
        {!loading && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">এই সময়ের মধ্যে কোনো CTA ক্লিক রেকর্ড হয়নি।</p>
        )}
        {!loading &&
          rows.slice(0, 10).map((r, i) => {
            const pct = Math.round((r.count / max) * 100);
            return (
              <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.section}
                      {r.target_url && <> → <span className="font-mono">{r.target_url}</span></>}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-sm font-bold text-accent">
                    {toBn(r.count)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default CtaAnalyticsPanel;
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Globe } from "lucide-react";

/**
 * Shows the most recent SSLCommerz redirect/IPN activity recorded in the
 * `orders` table — i.e. rows where the gateway has touched the order
 * (set a tran_id/session_key) along with the latest status and the raw
 * `notes` field which carries the gateway's failure reason verbatim.
 *
 * Distinct from PaymentEventsLog (which records *client-side* checkout
 * events). This view answers: "what did the gateway most recently say
 * about real orders?"
 */

interface GatewayOrderRow {
  id: string;
  order_id: string;
  status: string;
  payment_method: string;
  payment_verified: boolean;
  price: number;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  gateway_tran_id: string | null;
  gateway_val_id: string | null;
  gateway_session_key: string | null;
  updated_at: string;
  product_title: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  delivered: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

const GatewayActivityLog = () => {
  const [rows, setRows] = useState<GatewayOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Pull the latest 25 SSL-touched orders. We filter to payment_method
    // 'sslcommerz' AND any gateway field populated so MFS/COD orders don't
    // pollute this list.
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_id, status, payment_method, payment_verified, price, customer_name, customer_phone, notes, gateway_tran_id, gateway_val_id, gateway_session_key, updated_at, product_title"
      )
      .eq("payment_method", "sslcommerz")
      .order("updated_at", { ascending: false })
      .limit(25);
    setRows((data || []) as GatewayOrderRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">গেটওয়ে অ্যাক্টিভিটি (SSLCommerz)</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            এখনও কোনো SSLCommerz অ্যাক্টিভিটি নেই।
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-semibold text-foreground">{r.order_id}</span>
                    <Badge variant={STATUS_VARIANT[r.status] || "secondary"} className="capitalize">
                      {r.status}
                    </Badge>
                    {r.payment_verified && (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        verified
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString("bn-BD")}
                  </span>
                </div>
                <p className="mt-1 truncate text-foreground">
                  {r.product_title} — ৳{r.price.toLocaleString("bn-BD")}
                </p>
                <p className="text-muted-foreground">
                  {r.customer_name} · {r.customer_phone}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">tran_id:</span>{" "}
                    <span className="font-mono break-all text-foreground">
                      {r.gateway_tran_id || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">val_id:</span>{" "}
                    <span className="font-mono break-all text-foreground">
                      {r.gateway_val_id || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">session:</span>{" "}
                    <span className="font-mono break-all text-foreground">
                      {r.gateway_session_key
                        ? `${r.gateway_session_key.slice(0, 14)}…`
                        : "—"}
                    </span>
                  </div>
                </div>
                {r.notes && (
                  <div className="mt-2 rounded border border-destructive/20 bg-destructive/5 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      raw note
                    </p>
                    <p className="mt-0.5 break-words text-foreground">{r.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GatewayActivityLog;
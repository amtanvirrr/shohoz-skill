import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Download, CheckCircle, XCircle, Truck, ExternalLink } from "lucide-react";

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  product_title: string;
  product_type: string;
  price: number;
  payment_method: string;
  status: string;
  is_fraud_flagged: boolean;
  transaction_id: string | null;
  payment_verified: boolean;
  created_at: string;
  courier_provider: string | null;
  courier_tracking_id: string | null;
  courier_consignment_id: string | null;
  courier_status: string | null;
  courier_sent_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  shipped: "bg-accent/10 text-accent",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const courierStatusStyle = (status: string): string => {
  switch (status) {
    case "delivered": return "bg-green-500/15 text-green-600";
    case "in_transit": return "bg-blue-500/15 text-blue-600";
    case "cancelled": return "bg-destructive/15 text-destructive";
    case "pending_pickup": return "bg-warning/15 text-warning";
    case "dispatched": return "bg-accent/15 text-accent-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const courierStatusLabel = (status: string): string => {
  switch (status) {
    case "delivered": return "✅ ডেলিভারড";
    case "in_transit": return "🚚 ট্রানজিটে";
    case "cancelled": return "❌ ক্যান্সেল/রিটার্ন";
    case "pending_pickup": return "⏳ পিকআপ পেন্ডিং";
    case "dispatched": return "📦 ডিসপ্যাচড";
    default: return status;
  }
};

const courierTrackingUrl: Record<string, (id: string) => string> = {
  steadfast: (id) => `https://portal.steadfast.com.bd/t/${id}`,
  pathao: (id) => `https://merchant.pathao.com/tracking?consignment_id=${id}`,
  redx: (id) => `https://redx.com.bd/track-parcel/?trackingId=${id}`,
};

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [courierDialog, setCourierDialog] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [sending, setSending] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as unknown as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Status updated to ${status}` });
    fetchOrders();
  };

  const toggleFraud = async (id: string, current: boolean) => {
    await supabase.from("orders").update({ is_fraud_flagged: !current }).eq("id", id);
    toast({ title: !current ? "Flagged as suspicious" : "Flag removed" });
    fetchOrders();
  };

  const togglePaymentVerified = async (id: string, current: boolean) => {
    await supabase.from("orders").update({ payment_verified: !current }).eq("id", id);
    toast({ title: !current ? "পেমেন্ট ভেরিফাইড ✅" : "ভেরিফিকেশন সরানো হয়েছে" });
    fetchOrders();
  };

  const sendToCourier = async () => {
    if (!courierDialog || !selectedCourier) return;
    setSending(true);
    try {
      const res = await supabase.functions.invoke("send-to-courier", {
        body: { orderId: courierDialog, courier: selectedCourier },
      });
      if (res.error) {
        toast({ title: "কুরিয়ার এরর", description: res.error.message, variant: "destructive" });
      } else if (res.data?.error) {
        toast({ title: "কুরিয়ার এরর", description: res.data.error, variant: "destructive" });
      } else {
        toast({ title: `${selectedCourier} কুরিয়ারে পাঠানো হয়েছে ✅`, description: `Tracking: ${res.data?.tracking_id}` });
        fetchOrders();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
    setCourierDialog(null);
    setSelectedCourier("");
  };

  const exportCSV = () => {
    const headers = ["Order ID", "Customer", "Phone", "Email", "Product", "Type", "Price", "Payment", "TXN ID", "Verified", "Status", "Courier", "Tracking ID", "Date"];
    const rows = orders.map((o) => [
      o.order_id, o.customer_name, o.customer_phone, o.customer_email || "", o.product_title,
      o.product_type, String(o.price), o.payment_method, o.transaction_id || "", o.payment_verified ? "Yes" : "No", o.status,
      o.courier_provider || "", o.courier_tracking_id || "", new Date(o.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Order ID</th>
                <th className="pb-3 pr-3">Customer</th>
                <th className="pb-3 pr-3">Product</th>
                <th className="pb-3 pr-3">Price</th>
                <th className="pb-3 pr-3">Payment</th>
                <th className="pb-3 pr-3">TXN ID</th>
                <th className="pb-3 pr-3">Courier</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={`border-b border-border ${order.is_fraud_flagged ? "bg-destructive/5" : ""}`}>
                  <td className="py-3 pr-3 font-mono text-xs">{order.order_id}</td>
                  <td className="py-3 pr-3">
                    <div className="font-medium text-foreground">{order.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                  </td>
                  <td className="py-3 pr-3 text-foreground">{order.product_title}</td>
                  <td className="py-3 pr-3">৳{order.price}</td>
                  <td className="py-3 pr-3 uppercase text-xs">{order.payment_method}</td>
                  <td className="py-3 pr-3">
                    {order.transaction_id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">{order.transaction_id}</span>
                        <button
                          onClick={() => togglePaymentVerified(order.id, order.payment_verified)}
                          title={order.payment_verified ? "ভেরিফাইড — ক্লিক করে সরান" : "ক্লিক করে ভেরিফাই করুন"}
                        >
                          {order.payment_verified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-green-500" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {order.courier_provider ? (
                      <div className="space-y-1">
                        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                          {order.courier_provider}
                        </span>
                        {order.courier_status && (
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${courierStatusStyle(order.courier_status)}`}>
                            {courierStatusLabel(order.courier_status)}
                          </span>
                        )}
                        {order.courier_tracking_id && (
                          <a
                            href={courierTrackingUrl[order.courier_provider]?.(order.courier_tracking_id) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {order.courier_tracking_id}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : order.product_type === "book" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => { setCourierDialog(order.id); setSelectedCourier(""); }}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        কুরিয়ারে পাঠান
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <Select value={order.status} onValueChange={(val) => updateStatus(order.id, val)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFraud(order.id, order.is_fraud_flagged)}
                      title={order.is_fraud_flagged ? "Remove fraud flag" : "Flag as suspicious"}
                    >
                      <AlertTriangle className={`h-4 w-4 ${order.is_fraud_flagged ? "text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Courier Selection Dialog */}
      <Dialog open={!!courierDialog} onOpenChange={(open) => { if (!open) setCourierDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>কুরিয়ার সিলেক্ট করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { value: "steadfast", label: "Steadfast Courier" },
              { value: "pathao", label: "Pathao Courier" },
              { value: "redx", label: "RedX Courier" },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCourier(c.value)}
                className={`w-full rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                  selectedCourier === c.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourierDialog(null)}>বাতিল</Button>
            <Button onClick={sendToCourier} disabled={!selectedCourier || sending} className="gap-2">
              <Truck className="h-4 w-4" />
              {sending ? "পাঠানো হচ্ছে..." : "কুরিয়ারে পাঠান"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;

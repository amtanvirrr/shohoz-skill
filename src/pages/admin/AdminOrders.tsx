import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download } from "lucide-react";

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  product_title: string;
  product_type: string;
  price: number;
  payment_method: string;
  status: string;
  is_fraud_flagged: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  shipped: "bg-accent/10 text-accent",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
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

  const exportCSV = () => {
    const headers = ["Order ID", "Customer", "Phone", "Email", "Product", "Type", "Price", "Payment", "Status", "Date"];
    const rows = orders.map((o) => [
      o.order_id, o.customer_name, o.customer_phone, o.customer_email || "", o.product_title,
      o.product_type, String(o.price), o.payment_method, o.status, new Date(o.created_at).toLocaleDateString()
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
    </div>
  );
};

export default AdminOrders;

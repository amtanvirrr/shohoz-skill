import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Download, CheckCircle, XCircle, Truck, ExternalLink, Trash2, Search, X, CalendarIcon, CheckSquare, Eye, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

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
  notes: string | null;
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as unknown as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (filterStatus !== "all") {
      result = result.filter((o) => o.status === filterStatus);
    }
    if (filterPayment !== "all") {
      result = result.filter((o) => o.payment_method === filterPayment);
    }
    if (dateFrom) {
      const fromStart = new Date(dateFrom);
      fromStart.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.created_at) >= fromStart);
    }
    if (dateTo) {
      const toEnd = new Date(dateTo);
      toEnd.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.created_at) <= toEnd);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) =>
        o.order_id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q) ||
        (o.customer_address || "").toLowerCase().includes(q) ||
        o.product_title.toLowerCase().includes(q) ||
        (o.transaction_id || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, searchQuery, filterStatus, filterPayment, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || filterStatus !== "all" || filterPayment !== "all" || dateFrom || dateTo;
  const clearFilters = () => { setSearchQuery(""); setFilterStatus("all"); setFilterPayment("all"); setDateFrom(undefined); setDateTo(undefined); setCurrentPage(1); };

  // Pagination computed
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, filterPayment, dateFrom, dateTo]);

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

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "অর্ডার ডিলিট করা হয়েছে 🗑️" });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    fetchOrders();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${ids.length}টি অর্ডার ডিলিট করা হয়েছে 🗑️` });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    fetchOrders();
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("orders").update({ status: status as any }).in("id", ids);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${ids.length}টি অর্ডারের স্ট্যাটাস "${status}" করা হয়েছে ✅` });
    setSelectedIds(new Set());
    setBulkStatusValue("");
    fetchOrders();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Orders</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      {/* Search & Filters */}
      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="সার্চ করুন (Order ID, Name, Phone, Email, Address, Product, TXN ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="পেমেন্ট" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব পেমেন্ট</SelectItem>
              {["cod", "bkash", "nagad", "rocket", "upay"].map((p) => (
                <SelectItem key={p} value={p} className="uppercase">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-left text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "তারিখ থেকে"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-left text-xs font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "তারিখ পর্যন্ত"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs">
              <X className="h-3.5 w-3.5" /> ফিল্টার মুছুন
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredOrders.length}/{orders.length} অর্ডার
          </span>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">{orders.length === 0 ? "No orders yet." : "কোনো অর্ডার পাওয়া যায়নি।"}</p>
      ) : (
        <>
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{selectedIds.size}টি সিলেক্টেড</span>
              <Select value={bulkStatusValue} onValueChange={(val) => bulkUpdateStatus(val)}>
                <SelectTrigger className="h-8 w-40"><SelectValue placeholder="স্ট্যাটাস পরিবর্তন" /></SelectTrigger>
                <SelectContent>
                  {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-8 gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> বাল্ক ডিলিট
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{selectedIds.size}টি অর্ডার ডিলিট করুন?</AlertDialogTitle>
                    <AlertDialogDescription>সিলেক্ট করা সব অর্ডার স্থায়ীভাবে মুছে ফেলা হবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                    <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট করুন</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="mr-1 h-3.5 w-3.5" /> সিলেকশন বাতিল
              </Button>
            </div>
          )}

          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3 w-10">
                    <Checkbox
                      checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="pb-3 pr-3">Order ID</th>
                  <th className="pb-3 pr-3">Customer</th>
                  <th className="pb-3 pr-3">Product</th>
                  <th className="pb-3 pr-3">Price</th>
                  <th className="pb-3 pr-3">Payment</th>
                  <th className="pb-3 pr-3">TXN ID</th>
                  <th className="pb-3 pr-3">Courier</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3 w-10 text-center">📝</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className={`border-b border-border ${order.is_fraud_flagged ? "bg-destructive/5" : ""} ${selectedIds.has(order.id) ? "bg-primary/5" : ""}`}>
                    <td className="py-3 pr-3">
                      <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                    </td>
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
                          <button onClick={() => togglePaymentVerified(order.id, order.payment_verified)} title={order.payment_verified ? "ভেরিফাইড" : "ভেরিফাই করুন"}>
                            {order.payment_verified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground hover:text-green-500" />}
                          </button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 pr-3">
                      {order.courier_provider ? (
                        <div className="space-y-1">
                          <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{order.courier_provider}</span>
                          {order.courier_status && <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${courierStatusStyle(order.courier_status)}`}>{courierStatusLabel(order.courier_status)}</span>}
                          {order.courier_tracking_id && (
                            <a href={courierTrackingUrl[order.courier_provider]?.(order.courier_tracking_id) || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                              {order.courier_tracking_id} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : order.product_type === "book" ? (
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setCourierDialog(order.id); setSelectedCourier(""); }}>
                          <Truck className="h-3.5 w-3.5" /> কুরিয়ারে পাঠান
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 pr-3">
                      <Select value={order.status} onValueChange={(val) => updateStatus(order.id, val)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {order.notes ? (
                        <button onClick={() => { setDetailOrder(order); setEditNotes(order.notes || ""); }} title={order.notes} className="cursor-pointer">
                          <StickyNote className="h-4 w-4 text-primary mx-auto hover:text-primary/70 transition-colors" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setDetailOrder(order); setEditNotes(order.notes || ""); }} title="বিস্তারিত দেখুন">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleFraud(order.id, order.is_fraud_flagged)} title={order.is_fraud_flagged ? "Remove fraud flag" : "Flag as suspicious"}>
                          <AlertTriangle className={`h-4 w-4 ${order.is_fraud_flagged ? "text-destructive" : "text-muted-foreground"}`} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="ডিলিট করুন">
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>অর্ডার ডিলিট করুন?</AlertDialogTitle>
                              <AlertDialogDescription>এই অর্ডারটি ({order.order_id}) স্থায়ীভাবে মুছে ফেলা হবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>বাতিল</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 lg:hidden">
            {paginatedOrders.map((order) => (
              <div key={order.id} className={`rounded-xl border border-border bg-card p-4 space-y-3 ${order.is_fraud_flagged ? "border-destructive/30 bg-destructive/5" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="mt-1" />
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{order.order_id}</span>
                      <h4 className="mt-0.5 font-medium text-foreground text-sm">{order.customer_name}</h4>
                      <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setDetailOrder(order); setEditNotes(order.notes || ""); }} title="বিস্তারিত দেখুন">
                      <Eye className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleFraud(order.id, order.is_fraud_flagged)}>
                      <AlertTriangle className={`h-4 w-4 ${order.is_fraud_flagged ? "text-destructive" : "text-muted-foreground"}`} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="ডিলিট করুন">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>অর্ডার ডিলিট করুন?</AlertDialogTitle>
                          <AlertDialogDescription>এই অর্ডারটি ({order.order_id}) স্থায়ীভাবে মুছে ফেলা হবে।</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <div className="text-sm text-foreground">{order.product_title}</div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">৳{order.price}</span>
                  <span className="uppercase text-muted-foreground">{order.payment_method}</span>
                  {order.transaction_id && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-muted-foreground">{order.transaction_id}</span>
                      <button onClick={() => togglePaymentVerified(order.id, order.payment_verified)}>
                        {order.payment_verified ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Courier */}
                {order.courier_provider ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{order.courier_provider}</span>
                    {order.courier_status && <span className={`rounded px-2 py-0.5 text-xs font-medium ${courierStatusStyle(order.courier_status)}`}>{courierStatusLabel(order.courier_status)}</span>}
                    {order.courier_tracking_id && (
                      <a href={courierTrackingUrl[order.courier_provider]?.(order.courier_tracking_id) || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {order.courier_tracking_id} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : order.product_type === "book" ? (
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs w-full" onClick={() => { setCourierDialog(order.id); setSelectedCourier(""); }}>
                    <Truck className="h-3.5 w-3.5" /> কুরিয়ারে পাঠান
                  </Button>
                ) : null}

                {/* Status */}
                <Select value={order.status} onValueChange={(val) => updateStatus(order.id, val)}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="h-8 text-xs">
                প্রথম
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-8 text-xs">
                ← আগের
              </Button>
              <span className="text-sm text-muted-foreground">
                পৃষ্ঠা {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-8 text-xs">
                পরের →
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 text-xs">
                শেষ
              </Button>
            </div>
          )}
        </>
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
      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              অর্ডার ডিটেইলস
              {detailOrder && <Badge variant="outline" className="font-mono text-xs">{detailOrder.order_id}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              {/* Status & Flags */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusColors[detailOrder.status] || "bg-muted text-muted-foreground"}>{detailOrder.status}</Badge>
                {detailOrder.is_fraud_flagged && <Badge variant="destructive">⚠️ সন্দেহজনক</Badge>}
                {detailOrder.payment_verified && <Badge className="bg-green-500/15 text-green-600">✅ পেমেন্ট ভেরিফাইড</Badge>}
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">কাস্টমার তথ্য</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">নাম:</span> <span className="text-foreground font-medium">{detailOrder.customer_name}</span></div>
                  <div><span className="text-muted-foreground">ফোন:</span> <span className="text-foreground font-medium">{detailOrder.customer_phone}</span></div>
                  {detailOrder.customer_email && <div className="col-span-2"><span className="text-muted-foreground">ইমেইল:</span> <span className="text-foreground">{detailOrder.customer_email}</span></div>}
                  {detailOrder.customer_address && <div className="col-span-2"><span className="text-muted-foreground">ঠিকানা:</span> <span className="text-foreground">{detailOrder.customer_address}</span></div>}
                </div>
              </div>

              <Separator />

              {/* Product Info */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">প্রোডাক্ট তথ্য</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2"><span className="text-muted-foreground">প্রোডাক্ট:</span> <span className="text-foreground font-medium">{detailOrder.product_title}</span></div>
                  <div><span className="text-muted-foreground">ধরন:</span> <span className="text-foreground capitalize">{detailOrder.product_type}</span></div>
                  <div><span className="text-muted-foreground">মূল্য:</span> <span className="text-foreground font-semibold">৳{detailOrder.price}</span></div>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">পেমেন্ট তথ্য</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">পদ্ধতি:</span> <span className="text-foreground uppercase font-medium">{detailOrder.payment_method}</span></div>
                  <div><span className="text-muted-foreground">ভেরিফাইড:</span> <span className="text-foreground">{detailOrder.payment_verified ? "✅ হ্যাঁ" : "❌ না"}</span></div>
                  {detailOrder.transaction_id && <div className="col-span-2"><span className="text-muted-foreground">TXN ID:</span> <span className="font-mono text-foreground">{detailOrder.transaction_id}</span></div>}
                </div>
              </div>

              {/* Courier Info */}
              {detailOrder.courier_provider && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">কুরিয়ার তথ্য</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">কুরিয়ার:</span> <span className="text-foreground capitalize font-medium">{detailOrder.courier_provider}</span></div>
                      {detailOrder.courier_status && <div><span className="text-muted-foreground">স্ট্যাটাস:</span> <span className={`rounded px-2 py-0.5 text-xs font-medium ${courierStatusStyle(detailOrder.courier_status)}`}>{courierStatusLabel(detailOrder.courier_status)}</span></div>}
                      {detailOrder.courier_tracking_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">ট্র্যাকিং:</span>{" "}
                          <a href={courierTrackingUrl[detailOrder.courier_provider]?.(detailOrder.courier_tracking_id) || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            {detailOrder.courier_tracking_id} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {detailOrder.courier_consignment_id && <div className="col-span-2"><span className="text-muted-foreground">Consignment:</span> <span className="font-mono text-foreground text-xs">{detailOrder.courier_consignment_id}</span></div>}
                      {detailOrder.courier_sent_at && <div className="col-span-2"><span className="text-muted-foreground">পাঠানো:</span> <span className="text-foreground">{format(new Date(detailOrder.courier_sent_at), "dd/MM/yyyy hh:mm a")}</span></div>}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Notes */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">নোটস / মন্তব্য</h4>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
                  placeholder="এখানে নোট লিখুন..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={savingNotes || editNotes === (detailOrder.notes || "")}
                  onClick={async () => {
                    setSavingNotes(true);
                    const { error } = await supabase.from("orders").update({ notes: editNotes || null }).eq("id", detailOrder.id);
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "নোট সেভ করা হয়েছে ✅" });
                      setDetailOrder({ ...detailOrder, notes: editNotes || null });
                      fetchOrders();
                    }
                    setSavingNotes(false);
                  }}
                >
                  {savingNotes ? "সেভ হচ্ছে..." : "নোট সেভ করুন"}
                </Button>
              </div>

              <Separator />

              {/* Dates */}
              <div className="text-xs text-muted-foreground">
                অর্ডারের তারিখ: {format(new Date(detailOrder.created_at), "dd/MM/yyyy hh:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;

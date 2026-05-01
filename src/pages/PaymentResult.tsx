import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface OrderSummary {
  order_id: string;
  product_title: string;
  product_type: string;
  price: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  payment_method: string;
  payment_verified: boolean;
  status: string;
  gateway_tran_id: string | null;
  created_at: string;
}

const PaymentResult = () => {
  const { status } = useParams<{ status: string }>();
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const POLL_INTERVAL = 2; // seconds
  const MAX_ATTEMPTS = 20; // ~40s total
  const TOTAL_SECONDS = POLL_INTERVAL * MAX_ATTEMPTS;

  const startPolling = useCallback(() => {
    if (status !== "success" || !orderId) {
      setLoading(false);
      return;
    }
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;
    setLoading(true);
    setTimedOut(false);
    setAttempt(0);
    setSecondsLeft(TOTAL_SECONDS);
    let attempts = 0;

    // 1Hz countdown ticker
    const tickerId = window.setInterval(() => {
      if (token.cancelled) {
        window.clearInterval(tickerId);
        return;
      }
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    (token as { cancelled: boolean; tickerId?: number }).tickerId = tickerId;

    const poll = async () => {
      if (token.cancelled) return;
      const { data } = await supabase
        .from("orders")
        .select(
          "order_id, product_title, product_type, price, customer_name, customer_phone, customer_email, payment_method, payment_verified, status, gateway_tran_id, created_at"
        )
        .eq("order_id", orderId)
        .maybeSingle();
      if (token.cancelled) return;
      if (data) setOrder(data as OrderSummary);
      if (data?.payment_verified) {
        setVerified(true);
        setLoading(false);
        window.clearInterval(tickerId);
        return;
      }
      attempts++;
      setAttempt(attempts);
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, POLL_INTERVAL * 1000);
      } else {
        setTimedOut(true);
        setLoading(false);
        window.clearInterval(tickerId);
      }
    };
    poll();
  }, [status, orderId, TOTAL_SECONDS]);

  useEffect(() => {
    startPolling();
    return () => {
      const t = cancelRef.current as { cancelled: boolean; tickerId?: number };
      t.cancelled = true;
      if (t.tickerId) window.clearInterval(t.tickerId);
    };
  }, [startPolling]);

  const config = {
    success: {
      Icon: CheckCircle2,
      color: "text-success",
      title: "পেমেন্ট সফল!",
      message: verified
        ? "আপনার পেমেন্ট ভেরিফাই হয়েছে। অর্ডার কনফার্ম করা হয়েছে।"
        : timedOut
          ? `সর্বোচ্চ ${MAX_ATTEMPTS}/${MAX_ATTEMPTS} প্রচেষ্টায় ভেরিফিকেশন সম্পন্ন হয়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন বা ড্যাশবোর্ডে স্ট্যাটাস দেখুন।`
          : "পেমেন্ট ভেরিফিকেশন চলছে...",
    },
    fail: {
      Icon: XCircle,
      color: "text-destructive",
      title: "পেমেন্ট ব্যর্থ",
      message: "আপনার পেমেন্ট সম্পন্ন হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
    },
    cancel: {
      Icon: AlertCircle,
      color: "text-warning",
      title: "পেমেন্ট বাতিল",
      message: "আপনি পেমেন্ট বাতিল করেছেন।",
    },
  }[status === "success" || status === "fail" || status === "cancel" ? status : "fail"];

  const Icon = config.Icon;
  const showReceipt = status === "success" && verified && order;
  const formatBdt = (n: number) => `৳${n.toLocaleString("bn-BD")}`;

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl glass-card p-8 text-center">
        {loading && status === "success" ? (
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
        ) : (
          <Icon className={`mx-auto h-16 w-16 ${config.color}`} />
        )}
        <h1 className="mt-4 text-2xl font-bold text-foreground">{config.title}</h1>
        <p className="mt-2 text-muted-foreground">{config.message}</p>
        {status === "success" && loading && !verified && (
          <div className="mx-auto mt-5 max-w-xs">
            <Progress value={((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>প্রচেষ্টা {attempt + 1}/{MAX_ATTEMPTS}</span>
              <span>আনুমানিক {secondsLeft} সেকেন্ড বাকি</span>
            </div>
          </div>
        )}
        {orderId && !showReceipt && (
          <p className="mt-3 text-sm text-muted-foreground">
            অর্ডার আইডি: <span className="font-mono font-semibold text-foreground">{orderId}</span>
          </p>
        )}
        {showReceipt && (
          <div className="mt-6 rounded-xl border border-border/50 bg-background/40 p-5 text-left">
            <div className="mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">রিসিট সারাংশ</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">অর্ডার আইডি</dt>
                <dd className="font-mono font-semibold text-foreground">{order!.order_id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">প্রোডাক্ট</dt>
                <dd className="text-right font-medium text-foreground">{order!.product_title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">কাস্টমার</dt>
                <dd className="text-right text-foreground">{order!.customer_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">ফোন</dt>
                <dd className="text-foreground">{order!.customer_phone}</dd>
              </div>
              {order!.customer_email && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">ইমেইল</dt>
                  <dd className="break-all text-right text-foreground">{order!.customer_email}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">পেমেন্ট মেথড</dt>
                <dd className="uppercase text-foreground">{order!.payment_method}</dd>
              </div>
              {order!.gateway_tran_id && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">ট্রানজ্যাকশন আইডি</dt>
                  <dd className="break-all text-right font-mono text-xs text-foreground">
                    {order!.gateway_tran_id}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">তারিখ</dt>
                <dd className="text-foreground">
                  {new Date(order!.created_at).toLocaleString("bn-BD")}
                </dd>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-border/50 pt-3">
                <dt className="text-base font-semibold text-foreground">মোট পরিশোধ</dt>
                <dd className="text-base font-bold text-success">{formatBdt(order!.price)}</dd>
              </div>
            </dl>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {status === "success" && timedOut && !verified && (
            <Button onClick={startPolling} variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              আবার ভেরিফাই করুন
            </Button>
          )}
          <Button asChild>
            <Link to="/dashboard">ড্যাশবোর্ডে যান</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">হোমে ফিরুন</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
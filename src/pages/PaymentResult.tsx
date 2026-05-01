import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PaymentResult = () => {
  const { status } = useParams<{ status: string }>();
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (status !== "success" || !orderId) {
      setLoading(false);
      return;
    }
    let attempts = 0;
    const poll = async () => {
      const { data } = await supabase
        .from("orders")
        .select("payment_verified, status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (data?.payment_verified) {
        setVerified(true);
        setLoading(false);
        return;
      }
      if (++attempts < 8) setTimeout(poll, 1500);
      else setLoading(false);
    };
    poll();
  }, [status, orderId]);

  const config = {
    success: {
      Icon: CheckCircle2,
      color: "text-success",
      title: "পেমেন্ট সফল!",
      message: verified
        ? "আপনার পেমেন্ট ভেরিফাই হয়েছে। অর্ডার কনফার্ম করা হয়েছে।"
        : "পেমেন্ট ভেরিফিকেশন প্রসেস হচ্ছে। ড্যাশবোর্ডে স্ট্যাটাস দেখুন।",
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

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl glass-card p-8 text-center">
        {loading && status === "success" ? (
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
        ) : (
          <Icon className={`mx-auto h-16 w-16 ${config.color}`} />
        )}
        <h1 className="mt-4 text-2xl font-bold text-foreground">{config.title}</h1>
        <p className="mt-2 text-muted-foreground">{config.message}</p>
        {orderId && (
          <p className="mt-3 text-sm text-muted-foreground">
            অর্ডার আইডি: <span className="font-mono font-semibold text-foreground">{orderId}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
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
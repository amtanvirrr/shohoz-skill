import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SslczPayButtonProps {
  productType: "course" | "book" | "quiz";
  productId: string;
  productTitle: string;
  price: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  /** Set to true when fields below are required (e.g. physical book). Default false – uses user profile/auth fallback */
  requireCustomerFields?: boolean;
  className?: string;
}

export const SslczPayButton = ({
  productType,
  productId,
  productTitle,
  price,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  requireCustomerFields = false,
  className,
}: SslczPayButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("অনলাইন পেমেন্ট (কার্ড / মোবাইল ব্যাংকিং)");
  const [minAmount, setMinAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("public_site_settings")
        .select("key, value")
        .in("key", ["sslcz_enabled", "sslcz_display_name", "sslcz_min_amount"]);
      if (data) {
        data.forEach((r: any) => {
          if (r.key === "sslcz_enabled") setEnabled(r.value === "true");
          if (r.key === "sslcz_display_name" && r.value) setDisplayName(r.value);
          if (r.key === "sslcz_min_amount" && r.value) {
            const n = parseFloat(r.value);
            if (!isNaN(n) && n > 0) setMinAmount(n);
          }
        });
      }
    })();
  }, []);

  if (!enabled || price <= 0) return null;

  const belowMin = price < minAmount;

  const handlePay = async () => {
    if (!user) {
      toast({ title: "প্রথমে লগইন করুন", variant: "destructive" });
      return;
    }
    if (belowMin) {
      toast({
        title: "ন্যূনতম পেমেন্ট সীমা",
        description: `অনলাইন পেমেন্টের জন্য কমপক্ষে ৳${minAmount} প্রয়োজন। অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি ব্যবহার করুন।`,
        variant: "destructive",
      });
      return;
    }
    const name = customerName?.trim() || user.user_metadata?.full_name || "Customer";
    const phone = customerPhone?.trim() || user.user_metadata?.phone || "";
    if (requireCustomerFields && (!name || !phone || !customerAddress?.trim())) {
      toast({ title: "অর্ডার তথ্য পূরণ করুন", description: "নাম, ফোন এবং ঠিকানা আবশ্যক", variant: "destructive" });
      return;
    }
    if (!phone) {
      toast({ title: "ফোন নাম্বার দিন", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sslcz-init", {
        body: {
          product_type: productType,
          product_id: productId,
          product_title: productTitle,
          price,
          customer_name: name,
          customer_phone: phone,
          customer_email: customerEmail || user.email || undefined,
          customer_address: customerAddress || undefined,
        },
      });
      if (error || !data?.gateway_url) {
        toast({
          title: "পেমেন্ট শুরু করা যায়নি",
          description: data?.error || error?.message || "Unknown error",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      window.location.href = data.gateway_url;
    } catch (e) {
      toast({ title: "ত্রুটি", description: (e as Error).message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
    <Button
      type="button"
      onClick={handlePay}
      disabled={loading || belowMin}
      size="lg"
      variant="outline"
      className={`w-full border-2 border-primary/40 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 disabled:opacity-60 ${className || ""}`}
    >
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> রিডিরেক্ট হচ্ছে...</>
      ) : (
        <><Globe className="mr-2 h-4 w-4 text-primary" /> {displayName} — ৳{price}</>
      )}
    </Button>
      {belowMin && (
        <p className="text-xs text-destructive text-center">
          অনলাইন পেমেন্টের জন্য ন্যূনতম ৳{minAmount} প্রয়োজন। অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি বেছে নিন।
        </p>
      )}
    </div>
  );
};

export default SslczPayButton;
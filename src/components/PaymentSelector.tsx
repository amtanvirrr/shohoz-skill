import { useEffect, useMemo, useState } from "react";
import { Globe, Loader2, Smartphone, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface MfsMethod {
  id: string;
  provider: string;
  display_name: string;
  phone_number: string;
  qr_code_url: string | null;
  mfs_type: string;
  payment_instruction: string;
  process_message: string;
}

interface PaymentSelectorProps {
  productType: "course" | "book" | "quiz";
  productId: string;
  productTitle: string;
  price: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  /** Require name/phone/address validation before SSL redirect (physical book) */
  requireCustomerFields?: boolean;
  /** Called with selected MFS provider + transaction ID. Should perform the order insert. */
  onMfsSubmit: (provider: string, transactionId: string) => Promise<void> | void;
  submitting?: boolean;
  /** Compact layout for tight spaces (e.g. quiz cards) */
  compact?: boolean;
}

const SSL_KEY = "__sslcommerz__";

export const PaymentSelector = ({
  productType,
  productId,
  productTitle,
  price,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  requireCustomerFields = false,
  onMfsSubmit,
  submitting = false,
  compact = false,
}: PaymentSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<MfsMethod[]>([]);
  const [sslEnabled, setSslEnabled] = useState(false);
  const [sslDisplayName, setSslDisplayName] = useState("অনলাইন পেমেন্ট (কার্ড / মোবাইল ব্যাংকিং)");
  const [sslMinAmount, setSslMinAmount] = useState(10);
  const [selected, setSelected] = useState<string>("");
  const [transactionId, setTransactionId] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [methodsRes, settingsRes] = await Promise.all([
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        (supabase as any)
          .from("public_site_settings")
          .select("key, value")
          .in("key", ["sslcz_enabled", "sslcz_display_name", "sslcz_min_amount"]),
      ]);
      if (cancelled) return;
      const mfsList = (methodsRes.data as MfsMethod[]) || [];
      let sEnabled = false;
      (settingsRes.data || []).forEach((r: any) => {
        if (r.key === "sslcz_enabled") sEnabled = r.value === "true";
        if (r.key === "sslcz_display_name" && r.value) setSslDisplayName(r.value);
        if (r.key === "sslcz_min_amount" && r.value) {
          const n = parseFloat(r.value);
          if (!isNaN(n) && n > 0) setSslMinAmount(n);
        }
      });
      setMethods(mfsList);
      setSslEnabled(sEnabled);

      // Auto-select / re-validate selection against currently-enabled methods
      setSelected((prev) => {
        const stillValid =
          (prev === SSL_KEY && sEnabled) ||
          (prev && mfsList.some((m) => m.provider === prev));
        if (stillValid) return prev;
        if (mfsList.length > 0) return mfsList[0].provider;
        if (sEnabled) return SSL_KEY;
        return "";
      });
      setLoading(false);
    };

    load();

    // Self-heal: refetch when tab regains focus so disabled methods disappear
    // without requiring a full page reload.
    const onFocus = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    // Realtime: react instantly when admin toggles a method or SSL setting.
    const channel = supabase
      .channel("payment-selector-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_methods" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_site_settings" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedMfs = useMemo(
    () => methods.find((m) => m.provider === selected),
    [methods, selected],
  );
  const isSsl = selected === SSL_KEY;
  const belowMin = isSsl && price < sslMinAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (price <= 0) return null;

  if (methods.length === 0 && !sslEnabled) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
        <p className="mt-2 text-sm font-medium text-foreground">
          বর্তমানে কোনো পেমেন্ট পদ্ধতি উপলব্ধ নেই
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন বা আমাদের সাথে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!user) {
      toast({ title: "প্রথমে লগইন করুন", variant: "destructive" });
      return;
    }

    if (isSsl) {
      if (belowMin) {
        toast({
          title: "ন্যূনতম পেমেন্ট সীমা",
          description: `অনলাইন পেমেন্টের জন্য কমপক্ষে ৳${sslMinAmount} প্রয়োজন। অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি বেছে নিন।`,
          variant: "destructive",
        });
        return;
      }
      const name = customerName?.trim() || (user.user_metadata as any)?.full_name || "Customer";
      const phone = customerPhone?.trim() || (user.user_metadata as any)?.phone || "";
      if (requireCustomerFields && (!name || !phone || !customerAddress?.trim())) {
        toast({ title: "অর্ডার তথ্য পূরণ করুন", description: "নাম, ফোন এবং ঠিকানা আবশ্যক", variant: "destructive" });
        return;
      }
      if (!phone) {
        toast({ title: "ফোন নাম্বার দিন", variant: "destructive" });
        return;
      }
      setRedirecting(true);
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
          setRedirecting(false);
          return;
        }
        window.location.href = data.gateway_url;
      } catch (e) {
        toast({ title: "ত্রুটি", description: (e as Error).message, variant: "destructive" });
        setRedirecting(false);
      }
      return;
    }

    // MFS flow
    if (!selected) {
      toast({ title: "পেমেন্ট পদ্ধতি নির্বাচন করুন", variant: "destructive" });
      return;
    }
    if (!transactionId.trim()) {
      toast({ title: "ট্রানজেকশন আইডি দিন", description: "পেমেন্ট করার পর Transaction ID লিখুন", variant: "destructive" });
      return;
    }
    await onMfsSubmit(selected, transactionId.trim());
    setTransactionId("");
  };

  const cardBase =
    "relative flex flex-col items-center justify-center rounded-lg border-2 px-3 py-3 text-center transition-all duration-200 cursor-pointer select-none";
  const cardActive = "border-primary bg-primary/5 text-primary shadow-sm";
  const cardIdle = "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <div className="space-y-3">
      <div>
        <Label className={compact ? "text-xs" : "text-sm font-medium text-foreground"}>
          পেমেন্ট পদ্ধতি নির্বাচন করুন
        </Label>
        <div className={`mt-2 grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
          {methods.map((m) => {
            const active = selected === m.provider;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setSelected(m.provider)}
                className={`${cardBase} ${active ? cardActive : cardIdle}`}
              >
                <Smartphone className="h-4 w-4 mb-1" />
                <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
                  {m.display_name || m.provider}
                </span>
                <span className="text-[10px] capitalize opacity-70">{m.mfs_type}</span>
              </button>
            );
          })}
          {sslEnabled && (
            <button
              type="button"
              onClick={() => setSelected(SSL_KEY)}
              className={`${cardBase} ${selected === SSL_KEY ? cardActive : cardIdle}`}
            >
              <Globe className="h-4 w-4 mb-1" />
              <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>অনলাইন পেমেন্ট</span>
              <span className="text-[10px] opacity-70">কার্ড / ব্যাংকিং</span>
            </button>
          )}
        </div>
      </div>

      {/* Details for selected method */}
      {selectedMfs && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{selectedMfs.phone_number}</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
              {selectedMfs.mfs_type}
            </span>
          </div>
          {selectedMfs.qr_code_url && (
            <img
              src={selectedMfs.qr_code_url}
              alt="QR Code"
              className="mx-auto h-28 w-28 rounded-lg border border-border object-contain"
            />
          )}
          {selectedMfs.payment_instruction && (
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {selectedMfs.payment_instruction}
            </p>
          )}
          {selectedMfs.process_message && (
            <div className="rounded-md bg-primary/5 p-2 text-[11px] text-foreground whitespace-pre-line">
              {selectedMfs.process_message}
            </div>
          )}
          <div>
            <Label className="text-xs">ট্রানজেকশন আইডি *</Label>
            <Input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="যেমন: TXN1234ABCD"
              className="mt-1"
            />
          </div>
        </div>
      )}

      {isSsl && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium">{sslDisplayName}</p>
              <p className="mt-1">
                নিরাপদ পেমেন্ট গেটওয়েতে রিডিরেক্ট হবেন। সফল পেমেন্টের পর স্বয়ংক্রিয়ভাবে অর্ডার নিশ্চিত হবে।
              </p>
              {belowMin && (
                <p className="mt-2 text-destructive">
                  অনলাইন পেমেন্টের জন্য ন্যূনতম ৳{sslMinAmount} প্রয়োজন।
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        size={compact ? "default" : "lg"}
        className="w-full"
        disabled={submitting || redirecting || !selected || (isSsl && belowMin)}
        onClick={handleConfirm}
      >
        {redirecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> রিডিরেক্ট হচ্ছে...
          </>
        ) : submitting ? (
          "প্রসেস হচ্ছে..."
        ) : isSsl ? (
          <>
            <Globe className="mr-2 h-4 w-4" /> অনলাইন পেমেন্ট করুন — ৳{price}
          </>
        ) : (
          <>নিশ্চিত করুন এবং অর্ডার দিন — ৳{price}</>
        )}
      </Button>
    </div>
  );
};

export default PaymentSelector;
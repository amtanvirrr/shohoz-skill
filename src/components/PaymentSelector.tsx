import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, Smartphone, CreditCard, AlertCircle, RefreshCcw, Truck } from "lucide-react";
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
  onMfsSubmit?: (provider: string, transactionId: string) => Promise<void> | void;
  /** Show Cash-on-Delivery option (for physical products). */
  showCod?: boolean;
  /** Hide MFS (manual mobile payment) cards. Defaults to true. */
  showMfs?: boolean;
  /** Called when user confirms COD. Parent performs the order insert. */
  onCodSubmit?: () => Promise<void> | void;
  /** Optional pre-flight validation (e.g. check address / shipping zone). Return false to abort. */
  validateBeforeSubmit?: () => boolean;
  submitting?: boolean;
  /** Compact layout for tight spaces (e.g. quiz cards) */
  compact?: boolean;
}

const SSL_KEY = "__sslcommerz__";
const COD_KEY = "__cod__";

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
  showCod = false,
  showMfs = true,
  onCodSubmit,
  validateBeforeSubmit,
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
  const [lastError, setLastError] = useState<string>("");
  // Banner shown when the user's previously-selected method gets auto-switched
  // because admin disabled it (or it disappeared) — gives a clear explanation.
  const [fallbackNotice, setFallbackNotice] = useState<{ from: string; to: string } | null>(null);
  const isInitialLoad = useRef(true);
  // Hard guard against rapid double clicks — refs update synchronously
  // so a second click before React flushes state still sees `true`.
  const busyRef = useRef(false);

  const isBusy = submitting || redirecting;

  // Fire-and-forget event logger. Never throws — logging must not block checkout.
  const logEvent = (
    event_type: string,
    payload: { message?: string; metadata?: Record<string, any>; method?: string } = {},
  ) => {
    try {
      (supabase as any)
        .from("payment_events")
        .insert({
          user_id: user?.id ?? null,
          product_type: productType,
          product_id: productId,
          product_title: productTitle,
          price,
          payment_method: payload.method ?? (selected === SSL_KEY ? "sslcommerz" : selected || null),
          event_type,
          message: payload.message ?? null,
          metadata: payload.metadata ?? {},
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        })
        .then(() => {})
        .catch(() => {});
    } catch { /* ignore */ }
  };

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
      const mfsList = showMfs ? ((methodsRes.data as MfsMethod[]) || []) : [];
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

      // Friendly label for any provider key, used in the fallback banner.
      const labelOf = (key: string) => {
        if (!key) return "";
        if (key === SSL_KEY) return "অনলাইন পেমেন্ট";
        if (key === COD_KEY) return "ক্যাশ অন ডেলিভারি";
        const m = mfsList.find((x) => x.provider === key);
        return m?.display_name || key;
      };

      // Auto-select / re-validate selection against currently-enabled methods.
      // If the previous selection is no longer valid, pick the next available
      // method and surface a fallback notice so the user is never silently
      // left on a hidden / disabled option.
      setSelected((prev) => {
        const stillValid =
          (prev === SSL_KEY && sEnabled) ||
          (prev === COD_KEY && showCod) ||
          (prev && mfsList.some((m) => m.provider === prev));
        if (stillValid) return prev;

        // Decide next best option in priority order
        let next = "";
        if (showCod && !showMfs) next = COD_KEY;
        else if (mfsList.length > 0) next = mfsList[0].provider;
        else if (sEnabled) next = SSL_KEY;
        else if (showCod) next = COD_KEY;

        // Only notify if the user previously had a real choice that just
        // disappeared (skip the very first load, where prev === "").
        if (!isInitialLoad.current && prev && next && prev !== next) {
          const fromLabel = labelOf(prev);
          const toLabel = labelOf(next);
          setFallbackNotice({ from: fromLabel, to: toLabel });
          // Reset transaction id since it belonged to the now-disabled method.
          setTransactionId("");
          setLastError("");
          toast({
            title: "পেমেন্ট পদ্ধতি পরিবর্তন হয়েছে",
            description: `"${fromLabel}" এখন আর উপলব্ধ নেই। স্বয়ংক্রিয়ভাবে "${toLabel}" নির্বাচন করা হয়েছে।`,
          });
          logEvent("method_auto_switched", {
            method: next === SSL_KEY ? "sslcommerz" : next,
            message: `auto-switched from ${prev} to ${next}`,
            metadata: { from: prev, to: next },
          });
        } else if (!isInitialLoad.current && prev && !next) {
          // No fallback available at all
          setFallbackNotice({ from: labelOf(prev), to: "" });
          toast({
            title: "পেমেন্ট পদ্ধতি অনুপলব্ধ",
            description: `"${labelOf(prev)}" বন্ধ করা হয়েছে এবং কোনো বিকল্প পদ্ধতি বর্তমানে সক্রিয় নেই।`,
            variant: "destructive",
          });
          logEvent("method_no_fallback", { metadata: { from: prev } });
        }

        return next;
      });
      setLoading(false);
      isInitialLoad.current = false;
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
  const isCod = selected === COD_KEY;
  const belowMin = isSsl && price < sslMinAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (price <= 0) return null;

  if (methods.length === 0 && !sslEnabled && !showCod) {
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
    if (busyRef.current || isBusy) return;
    // COD allows guest checkout (parent decides). Online methods require login.
    if (!isCod && !user) {
      toast({ title: "প্রথমে লগইন করুন", variant: "destructive" });
      logEvent("auth_required");
      return;
    }
    setLastError("");

    // Parent-supplied validation (address, shipping zone, etc.)
    if (validateBeforeSubmit && !validateBeforeSubmit()) {
      logEvent("validation_error", { method: isSsl ? "sslcommerz" : isCod ? "cod" : selected, message: "parent_validation_failed" });
      return;
    }

    if (isCod) {
      if (!onCodSubmit) {
        toast({ title: "ক্যাশ অন ডেলিভারি কনফিগার করা নেই", variant: "destructive" });
        return;
      }
      busyRef.current = true;
      logEvent("cod_submit_start", { method: "cod" });
      try {
        await onCodSubmit();
        logEvent("cod_submit_success", { method: "cod" });
      } catch (e) {
        const msg = (e as Error).message || "অর্ডার সাবমিট করতে সমস্যা হয়েছে";
        setLastError(msg);
        toast({ title: "ত্রুটি", description: msg, variant: "destructive" });
        logEvent("cod_submit_error", { method: "cod", message: msg });
      } finally {
        busyRef.current = false;
      }
      return;
    }

    if (isSsl) {
      if (belowMin) {
        toast({
          title: "ন্যূনতম পেমেন্ট সীমা",
          description: `অনলাইন পেমেন্টের জন্য কমপক্ষে ৳${sslMinAmount} প্রয়োজন। অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি বেছে নিন।`,
          variant: "destructive",
        });
        logEvent("validation_error", { method: "sslcommerz", message: "below_min_amount", metadata: { min: sslMinAmount, price } });
        return;
      }
      const name = customerName?.trim() || (user.user_metadata as any)?.full_name || "Customer";
      const phone = customerPhone?.trim() || (user.user_metadata as any)?.phone || "";
      if (requireCustomerFields && (!name || !phone || !customerAddress?.trim())) {
        toast({ title: "অর্ডার তথ্য পূরণ করুন", description: "নাম, ফোন এবং ঠিকানা আবশ্যক", variant: "destructive" });
        logEvent("validation_error", { method: "sslcommerz", message: "missing_customer_fields" });
        return;
      }
      if (!phone) {
        toast({ title: "ফোন নাম্বার দিন", variant: "destructive" });
        logEvent("validation_error", { method: "sslcommerz", message: "missing_phone" });
        return;
      }
      setRedirecting(true);
      busyRef.current = true;
      logEvent("ssl_init_start", { method: "sslcommerz" });
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
          const msg = data?.error || error?.message || "Unknown error";
          setLastError(msg);
          toast({
            title: "পেমেন্ট শুরু করা যায়নি",
            description: msg,
            variant: "destructive",
          });
          logEvent("ssl_init_error", { method: "sslcommerz", message: msg, metadata: { details: data?.details ?? null } });
          setRedirecting(false);
          busyRef.current = false;
          return;
        }
        logEvent("ssl_redirect", { method: "sslcommerz", message: "redirecting_to_gateway", metadata: { order_id: data.order_id ?? null } });
        window.location.href = data.gateway_url;
        // Keep busy=true; navigation is in progress.
      } catch (e) {
        const msg = (e as Error).message || "নেটওয়ার্ক ত্রুটি";
        setLastError(msg);
        toast({ title: "ত্রুটি", description: msg, variant: "destructive" });
        logEvent("ssl_init_exception", { method: "sslcommerz", message: msg });
        setRedirecting(false);
        busyRef.current = false;
      }
      return;
    }

    // MFS flow
    if (!selected) {
      toast({ title: "পেমেন্ট পদ্ধতি নির্বাচন করুন", variant: "destructive" });
      logEvent("validation_error", { message: "no_method_selected" });
      return;
    }
    if (!onMfsSubmit) {
      toast({ title: "এই পদ্ধতি সাপোর্টেড নয়", variant: "destructive" });
      return;
    }
    if (!transactionId.trim()) {
      toast({ title: "ট্রানজেকশন আইডি দিন", description: "পেমেন্ট করার পর Transaction ID লিখুন", variant: "destructive" });
      logEvent("validation_error", { method: selected, message: "missing_transaction_id" });
      return;
    }
    busyRef.current = true;
    logEvent("mfs_submit_start", { method: selected, metadata: { txn_len: transactionId.trim().length } });
    try {
      await onMfsSubmit(selected, transactionId.trim());
      logEvent("mfs_submit_success", { method: selected });
      setTransactionId("");
    } catch (e) {
      const msg = (e as Error).message || "অর্ডার সাবমিট করতে সমস্যা হয়েছে";
      setLastError(msg);
      toast({ title: "ত্রুটি", description: msg, variant: "destructive" });
      logEvent("mfs_submit_error", { method: selected, message: msg });
    } finally {
      busyRef.current = false;
    }
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
          {showCod && (
            <button
              type="button"
              onClick={() => { if (!isBusy) { setSelected(COD_KEY); setLastError(""); } }}
              disabled={isBusy}
              className={`${cardBase} ${selected === COD_KEY ? cardActive : cardIdle} ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Truck className="h-4 w-4 mb-1" />
              <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>ক্যাশ অন ডেলিভারি</span>
              <span className="text-[10px] opacity-70">ডেলিভারির সময় পেমেন্ট</span>
            </button>
          )}
          {methods.map((m) => {
            const active = selected === m.provider;
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => { if (!isBusy) { setSelected(m.provider); setLastError(""); } }}
                disabled={isBusy}
                className={`${cardBase} ${active ? cardActive : cardIdle} ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
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
              onClick={() => { if (!isBusy) { setSelected(SSL_KEY); setLastError(""); } }}
              disabled={isBusy}
              className={`${cardBase} ${selected === SSL_KEY ? cardActive : cardIdle} ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Globe className="h-4 w-4 mb-1" />
              <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>অনলাইন পেমেন্ট</span>
              <span className="text-[10px] opacity-70">কার্ড / ব্যাংকিং</span>
            </button>
          )}
        </div>
      </div>

      {isCod && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium">ক্যাশ অন ডেলিভারি</p>
              <p className="mt-1">
                পণ্য হাতে পেয়ে ডেলিভারিম্যানকে নগদ অর্থ পরিশোধ করুন। কোনো অগ্রিম পেমেন্ট প্রয়োজন নেই।
              </p>
            </div>
          </div>
        </div>
      )}

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
              disabled={isBusy}
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

      {lastError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">পেমেন্ট সম্পন্ন করা যায়নি</p>
              <p className="mt-1 text-muted-foreground break-words">{lastError}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 h-8"
              disabled={isBusy}
              onClick={() => { setLastError(""); handleConfirm(); }}
            >
              <RefreshCcw className="mr-1 h-3.5 w-3.5" />
              আবার চেষ্টা করুন
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        size={compact ? "default" : "lg"}
        className="w-full"
        disabled={isBusy || !selected || (isSsl && belowMin)}
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
        ) : isCod ? (
          <>
            <Truck className="mr-2 h-4 w-4" /> ক্যাশ অন ডেলিভারিতে অর্ডার — ৳{price}
          </>
        ) : (
          <>নিশ্চিত করুন এবং অর্ডার দিন — ৳{price}</>
        )}
      </Button>
    </div>
  );
};

export default PaymentSelector;
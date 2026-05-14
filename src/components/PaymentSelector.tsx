import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, Smartphone, CreditCard, AlertCircle, RefreshCcw, Truck, X, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mapPaymentError, type MappedPaymentError } from "@/lib/paymentErrors";
import CheckoutConsent from "@/components/CheckoutConsent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  /** Estimated delivery copy for the COD confirmation dialog (e.g. "৩-৫ দিন"). */
  codDeliveryText?: string;
  /** Optional pre-flight validation (e.g. check address / shipping zone). Return false to abort. */
  validateBeforeSubmit?: () => boolean;
  submitting?: boolean;
  /** Compact layout for tight spaces (e.g. quiz cards) */
  compact?: boolean;
}

const SSL_KEY = "__sslcommerz__";
const COD_KEY = "__cod__";
const PENDING_KEY = "sslcz_pending_session";
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes
const REDIRECT_COUNTDOWN_S = 3;

interface PendingSslSession {
  productId: string;
  productTitle: string;
  orderId: string | null;
  gatewayUrl: string;
  price: number;
  ts: number;
}

const readPendingSession = (productId: string): PendingSslSession | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PendingSslSession;
    if (s.productId !== productId) return null;
    if (Date.now() - s.ts > PENDING_TTL_MS) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
};

const writePendingSession = (s: PendingSslSession) => {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

const clearPendingSession = () => {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
};

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
  codDeliveryText,
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
  // Countdown before window.location.href fires — gives the user a chance
  // to cancel before being shipped off to the gateway.
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const redirectTimerRef = useRef<number | null>(null);
  // A pending SSL session means the user previously initiated a gateway
  // payment for this product but didn't complete it. We surface a recovery
  // card so they can resume or cancel & retry.
  const [pendingSession, setPendingSession] = useState<PendingSslSession | null>(null);
  const [lastError, setLastError] = useState<string>("");
  // Mapped, user-friendly version of the most recent failure. Drives both
  // the inline banner copy AND whether the retry button is offered.
  const [errorInfo, setErrorInfo] = useState<MappedPaymentError | null>(null);
  // Snapshot of the most recent failed attempt — used by the retry button so
  // that even if some piece of state drifts, we resubmit with the exact same
  // method + inputs the user originally chose.
  const lastAttemptRef = useRef<{ method: string; transactionId: string } | null>(null);
  // Banner shown when the user's previously-selected method gets auto-switched
  // because admin disabled it (or it disappeared) — gives a clear explanation.
  const [fallbackNotice, setFallbackNotice] = useState<{ from: string; to: string } | null>(null);
  const isInitialLoad = useRef(true);
  // Mandatory compliance: customer must explicitly agree to terms before
  // any order can be placed (SSL / MFS / COD).
  const [agreed, setAgreed] = useState(false);

  // On mount, look for a stored pending SSL session for this product.
  useEffect(() => {
    setPendingSession(readPendingSession(productId));
    // Cleanup any leftover redirect timer if we unmount mid-countdown.
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [productId]);

  const cancelRedirect = (reason: "user_cancelled" | "user_back" = "user_cancelled") => {
    if (redirectTimerRef.current !== null) {
      window.clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setRedirecting(false);
    setRedirectCountdown(0);
    busyRef.current = false;
    logEvent("ssl_redirect_cancelled", { method: "sslcommerz", message: reason });
  };

  const startRedirectCountdown = (gatewayUrl: string, orderId: string | null) => {
    setRedirectCountdown(REDIRECT_COUNTDOWN_S);
    let remaining = REDIRECT_COUNTDOWN_S;
    redirectTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      setRedirectCountdown(remaining);
      if (remaining <= 0) {
        if (redirectTimerRef.current !== null) {
          window.clearInterval(redirectTimerRef.current);
          redirectTimerRef.current = null;
        }
        // Persist the pending session so a back-navigation can recover.
        writePendingSession({
          productId,
          productTitle,
          orderId,
          gatewayUrl,
          price,
          ts: Date.now(),
        });
        logEvent("ssl_redirect", {
          method: "sslcommerz",
          message: "navigating_to_gateway",
          metadata: { order_id: orderId },
        });
        window.location.href = gatewayUrl;
      }
    }, 1000) as unknown as number;
  };
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
      // Always fetch fresh — never cache payment methods on the client.
      // A unique abort signal per call defeats any in-flight dedupe and
      // a `cb` query param defeats any HTTP/CDN-level caching.
      const ac = new AbortController();
      const cb = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const [methodsRes, settingsRes] = await Promise.all([
        (supabase as any)
          .from("payment_methods")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .abortSignal(ac.signal),
        (supabase as any)
          .from("public_site_settings")
          .select("key, value")
          .in("key", ["sslcz_enabled", "sslcz_display_name", "sslcz_min_amount"])
          .abortSignal(ac.signal),
      ]);
      void cb; // tag for observability
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

    // Safety net — poll every 30s in case realtime drops silently.
    // Cheap query (~2 small rows), and skipped while tab is hidden.
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);

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
      window.clearInterval(pollId);
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
    if (!agreed) {
      toast({
        title: "শর্তাবলীতে সম্মতি দিন",
        description: "অর্ডার করার আগে শর্তাবলী, প্রাইভেসি ও রিফান্ড পলিসি পড়ে চেকবক্সে টিক দিন।",
        variant: "destructive",
      });
      logEvent("consent_missing");
      return;
    }
    // COD allows guest checkout (parent decides). Online methods require login.
    if (!isCod && !user) {
      toast({ title: "প্রথমে লগইন করুন", variant: "destructive" });
      logEvent("auth_required");
      return;
    }
    setLastError("");
    setErrorInfo(null);

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
      lastAttemptRef.current = { method: "cod", transactionId: "" };
      try {
        await onCodSubmit();
        logEvent("cod_submit_success", { method: "cod" });
      } catch (e) {
        const msg = (e as Error).message || "অর্ডার সাবমিট করতে সমস্যা হয়েছে";
        const info = mapPaymentError(msg, "cod");
        setLastError(msg);
        setErrorInfo(info);
        toast({ title: info.title, description: info.message, variant: "destructive" });
        logEvent("cod_submit_error", { method: "cod", message: msg, metadata: { category: info.category } });
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
      lastAttemptRef.current = { method: SSL_KEY, transactionId: "" };
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
          const info = mapPaymentError(msg, "ssl");
          setLastError(msg);
          setErrorInfo(info);
          toast({ title: info.title, description: info.message, variant: "destructive" });
          logEvent("ssl_init_error", {
            method: "sslcommerz",
            message: msg,
            metadata: { category: info.category, details: data?.details ?? null },
          });
          setRedirecting(false);
          busyRef.current = false;
          return;
        }
        // Begin a short cancellable countdown. The actual navigation
        // happens inside startRedirectCountdown when it reaches zero.
        startRedirectCountdown(data.gateway_url, data.order_id ?? null);
      } catch (e) {
        const msg = (e as Error).message || "নেটওয়ার্ক ত্রুটি";
        const info = mapPaymentError(msg, "ssl");
        setLastError(msg);
        setErrorInfo(info);
        toast({ title: info.title, description: info.message, variant: "destructive" });
        logEvent("ssl_init_exception", { method: "sslcommerz", message: msg, metadata: { category: info.category } });
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
    lastAttemptRef.current = { method: selected, transactionId: transactionId.trim() };
    try {
      await onMfsSubmit(selected, transactionId.trim());
      logEvent("mfs_submit_success", { method: selected });
      setTransactionId("");
      lastAttemptRef.current = null;
    } catch (e) {
      const msg = (e as Error).message || "অর্ডার সাবমিট করতে সমস্যা হয়েছে";
      const info = mapPaymentError(msg, "mfs");
      setLastError(msg);
      setErrorInfo(info);
      toast({ title: info.title, description: info.message, variant: "destructive" });
      logEvent("mfs_submit_error", { method: selected, message: msg, metadata: { category: info.category } });
    } finally {
      busyRef.current = false;
    }
  };

  // Retry the most recent failed attempt with the same method + inputs.
  // Defensively resets transient UI flags (countdown timer, redirecting, busy)
  // and restores the snapshotted selection/transaction id before resubmitting,
  // so the retry never silently uses a different method than what failed.
  const handleRetry = () => {
    if (redirectTimerRef.current !== null) {
      window.clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setRedirectCountdown(0);
    setRedirecting(false);
    busyRef.current = false;
    setLastError("");
    setErrorInfo(null);

    const snap = lastAttemptRef.current;
    if (snap) {
      // Restore the exact method/inputs the user originally submitted.
      if (snap.method && snap.method !== selected) setSelected(snap.method);
      if (snap.transactionId && snap.transactionId !== transactionId) {
        setTransactionId(snap.transactionId);
      }
      logEvent("retry_clicked", { method: snap.method, message: "retry_with_snapshot" });
    } else {
      logEvent("retry_clicked", { method: selected, message: "retry_no_snapshot" });
    }

    // Wait one tick so any state restoration above is reflected before
    // handleConfirm reads from state.
    setTimeout(() => { handleConfirm(); }, 0);
  };

  const cardBase =
    "relative flex flex-col items-center justify-center rounded-lg border-2 px-3 py-3 text-center transition-all duration-200 cursor-pointer select-none";
  const cardActive = "border-primary bg-primary/5 text-primary shadow-sm";
  const cardIdle = "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <div className="space-y-3">
      {/* Pending SSL session recovery — shown when the user came back from
          the gateway without completing payment (browser back, closed tab,
          gateway cancel, etc.). They can resume or cancel and retry. */}
      {pendingSession && !redirecting && (
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">
                পেমেন্ট সম্পন্ন হয়নি
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                আপনি ইতোমধ্যে এই অর্ডারের জন্য একটি অনলাইন পেমেন্ট শুরু করেছিলেন। চাইলে গেটওয়েতে ফিরে গিয়ে পেমেন্ট সম্পন্ন করুন, অথবা বাতিল করে নতুন করে চেষ্টা করুন।
              </p>
              {pendingSession.orderId && (
                <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                  Order: {pendingSession.orderId}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    logEvent("ssl_resume_clicked", { method: "sslcommerz", metadata: { order_id: pendingSession.orderId } });
                    window.location.href = pendingSession.gatewayUrl;
                  }}
                >
                  <ArrowRight className="mr-1 h-4 w-4" /> গেটওয়েতে ফিরে যান
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearPendingSession();
                    setPendingSession(null);
                    logEvent("ssl_pending_dismissed", { method: "sslcommerz", metadata: { order_id: pendingSession.orderId } });
                    toast({
                      title: "বাতিল করা হয়েছে",
                      description: "আপনি এখন নতুন করে পেমেন্ট পদ্ধতি বেছে নিতে পারবেন।",
                    });
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> বাতিল করে আবার চেষ্টা করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active redirect countdown — visible only while the timer ticks
          down. Lets the user abort before the browser navigates. */}
      {redirecting && redirectCountdown > 0 && (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/20 p-2 shrink-0">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">
                পেমেন্ট গেটওয়েতে রিডিরেক্ট হচ্ছে...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-bold text-primary">{redirectCountdown}</span> সেকেন্ডের মধ্যে SSLCommerz গেটওয়েতে নিয়ে যাওয়া হবে। চাইলে এখনই বাতিল করতে পারেন।
              </p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="mt-3"
                onClick={() => {
                  cancelRedirect("user_cancelled");
                  toast({
                    title: "রিডিরেক্ট বাতিল হয়েছে",
                    description: "আপনি অন্য পেমেন্ট পদ্ধতি বেছে নিতে পারেন।",
                  });
                }}
              >
                <X className="mr-1 h-4 w-4" /> বাতিল করুন
              </Button>
            </div>
          </div>
        </div>
      )}

      {fallbackNotice && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning dark:text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-warning dark:text-warning">
                পেমেন্ট পদ্ধতি পরিবর্তন হয়েছে
              </p>
              <p className="mt-1 text-muted-foreground">
                {fallbackNotice.to ? (
                  <>
                    "<span className="font-medium text-foreground">{fallbackNotice.from}</span>" এখন আর উপলব্ধ নেই।
                    স্বয়ংক্রিয়ভাবে "<span className="font-medium text-foreground">{fallbackNotice.to}</span>" নির্বাচন করা হয়েছে।
                  </>
                ) : (
                  <>
                    "<span className="font-medium text-foreground">{fallbackNotice.from}</span>" বন্ধ করা হয়েছে এবং
                    কোনো বিকল্প পদ্ধতি বর্তমানে সক্রিয় নেই।
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotice(null)}
              className="text-warning dark:text-warning hover:opacity-70 text-lg leading-none"
              aria-label="বন্ধ করুন"
            >
              ×
            </button>
          </div>
        </div>
      )}

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

      {(errorInfo || lastError) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive">
                {errorInfo?.title || "পেমেন্ট সম্পন্ন করা যায়নি"}
              </p>
              <p className="mt-1 text-muted-foreground break-words">
                {errorInfo?.message || lastError}
              </p>
              {errorInfo?.hint && (
                <p className="mt-1 text-muted-foreground/80 break-words">
                  💡 {errorInfo.hint}
                </p>
              )}
              {errorInfo?.raw && errorInfo.raw !== errorInfo.message && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground/60 break-all">
                  {errorInfo.raw}
                </p>
              )}
            </div>
            {(errorInfo?.retryable ?? true) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 h-8"
                disabled={isBusy}
                onClick={handleRetry}
              >
                <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                আবার চেষ্টা করুন
              </Button>
            )}
          </div>
        </div>
      )}

      <CheckoutConsent checked={agreed} onChange={setAgreed} />

      <Button
        type="button"
        size={compact ? "default" : "lg"}
        className="w-full"
        disabled={isBusy || !selected || (isSsl && belowMin) || !agreed}
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
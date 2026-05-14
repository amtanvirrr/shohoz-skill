import { useEffect, useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, ShieldCheck, ArrowRight, Loader2, AlertCircle, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";

/** Verified order shape returned by the `track-order` edge function. */
interface VerifiedOrder {
  order_id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | string;
  product_title: string;
  product_type: string;
  price: number;
  payment_method: string;
  customer_name: string;
  customer_address: string | null;
  created_at: string;
  updated_at: string;
  courier_provider: string | null;
  courier_tracking_id: string | null;
  courier_status: string | null;
  courier_sent_at: string | null;
  transaction_id: string | null;
  payment_verified: boolean;
  notes: string | null;
}

const formSchema = z.object({
  order_id: z.string().trim().min(4, "সঠিক অর্ডার আইডি দিন").max(64),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{4,32}$/u, "সঠিক ফোন নম্বর দিন")
    .max(32),
});

const STEPS = [
  { key: "pending", label: "পেন্ডিং", icon: Clock },
  { key: "confirmed", label: "কনফার্মড", icon: CheckCircle2 },
  { key: "shipped", label: "শিপড", icon: Truck },
  { key: "delivered", label: "ডেলিভারড", icon: Package },
] as const;

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })
    : "—";

const TrackOrderPage = () => {
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [params, setParams] = useSearchParams();

  const [orderId, setOrderId] = useState(params.get("order_id") ?? params.get("q") ?? "");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [errors, setErrors] = useState<{ order_id?: string; phone?: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [order, setOrder] = useState<VerifiedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const runLookup = async (oid: string, ph: string) => {
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    try {
      const { data, error } = await supabase.functions.invoke("track-order", {
        body: { order_id: oid, phone: ph },
      });
      if (error) throw error;
      if (data?.order) {
        setOrder(data.order as VerifiedOrder);
      } else {
        setNotFound(true);
      }
    } catch (e: any) {
      toast({
        title: "সার্ভারে সমস্যা",
        description: e?.message || "কিছুক্ষণ পরে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  // Auto-submit if both query params arrived prefilled (e.g. from homepage form).
  useEffect(() => {
    const qOid = params.get("order_id");
    const qPh = params.get("phone");
    if (qOid && qPh && !submitted) {
      const parsed = formSchema.safeParse({ order_id: qOid, phone: qPh });
      if (parsed.success) {
        runLookup(parsed.data.order_id, parsed.data.phone);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({ order_id: orderId, phone });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        order_id: flat.order_id?.[0],
        phone: flat.phone?.[0],
      });
      return;
    }
    setErrors({});
    setParams(
      { order_id: parsed.data.order_id, phone: parsed.data.phone },
      { replace: true },
    );
    await runLookup(parsed.data.order_id, parsed.data.phone);
  };

  const currentStepIdx = order
    ? STEPS.findIndex((s) => s.key === order.status)
    : -1;
  const isCancelled = order?.status === "cancelled";

  /** Best-effort timestamp derivation per timeline step. */
  const stepTimestamp = (key: string): string | null => {
    if (!order) return null;
    if (key === "pending") return order.created_at;
    if (key === "shipped") return order.courier_sent_at || (order.status === "shipped" ? order.updated_at : null);
    if (key === order.status) return order.updated_at;
    return null;
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Search className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">অর্ডার ট্র্যাকিং</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          আপনার অর্ডার আইডি ও ফোন নম্বর — দুটোই দিয়ে সম্পূর্ণ অর্ডার তথ্য দেখুন।
        </p>
      </div>

      {/* Lookup form */}
      <form
        onSubmit={onSubmit}
        className="glass-card rounded-2xl p-6 sm:p-8"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="track-order-id">অর্ডার আইডি</Label>
            <Input
              id="track-order-id"
              className="glass-input mt-1.5"
              placeholder="যেমন: ORD-AB12CD34"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              aria-invalid={!!errors.order_id}
              aria-describedby={errors.order_id ? "track-order-id-err" : undefined}
              autoComplete="off"
              maxLength={64}
            />
            {errors.order_id && (
              <p id="track-order-id-err" className="mt-1 text-xs text-destructive">
                {errors.order_id}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="track-phone">ফোন নম্বর</Label>
            <Input
              id="track-phone"
              className="glass-input mt-1.5"
              placeholder="অর্ডারে দেওয়া ফোন নম্বর"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "track-phone-err" : undefined}
              autoComplete="tel"
              maxLength={32}
            />
            {errors.phone && (
              <p id="track-phone-err" className="mt-1 text-xs text-destructive">
                {errors.phone}
              </p>
            )}
          </div>
        </div>
        <Button type="submit" className="mt-5 w-full glow-hover" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> খোঁজা হচ্ছে…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" /> অর্ডার যাচাই করুন
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          নিরাপত্তার জন্য — আমরা শুধু সঠিক আইডি ও ফোন নম্বর জোড়া দিলেই বিস্তারিত দেখাই।
        </p>
      </form>

      {/* Result */}
      {submitted && !loading && notFound && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">অর্ডার পাওয়া যায়নি</p>
            <p className="mt-1 text-destructive/90">
              অর্ডার আইডি ও ফোন নম্বর — উভয়ই অর্ডার বসানোর সময়ের সঠিক মান হতে হবে।
              কোনো একটি ভুল হলে বিস্তারিত দেখানো হয় না।
            </p>
          </div>
        </div>
      )}

      {order && !loading && (
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  অর্ডার আইডি
                </p>
                <p className="font-mono text-lg font-bold text-foreground">
                  {order.order_id}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  isCancelled
                    ? "bg-destructive/15 text-destructive"
                    : order.status === "delivered"
                    ? "bg-success/15 text-success"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {isCancelled && <XCircle className="h-3.5 w-3.5" />}
                {!isCancelled && <CheckCircle2 className="h-3.5 w-3.5" />}
                {STEPS.find((s) => s.key === order.status)?.label ||
                  (isCancelled ? "বাতিল" : order.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">পণ্য</p>
                <p className="font-medium text-foreground">{order.product_title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">মূল্য</p>
                <p className="font-medium text-foreground">৳{order.price.toLocaleString("bn-BD")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">গ্রাহক</p>
                <p className="font-medium text-foreground">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">পেমেন্ট</p>
                <p className="font-medium text-foreground capitalize">
                  {order.payment_method}
                  {order.payment_verified && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> যাচাইকৃত
                    </span>
                  )}
                </p>
              </div>
              {order.customer_address && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">ঠিকানা</p>
                  <p className="font-medium text-foreground">{order.customer_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="mb-5 text-base font-semibold text-foreground">
              অর্ডারের অগ্রগতি
            </h2>
            {isCancelled ? (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-2 ring-destructive/30">
                  <XCircle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-destructive">অর্ডারটি বাতিল হয়েছে</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    বাতিলের সময়: {formatDate(order.updated_at)}
                  </p>
                  {order.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">কারণ/মন্তব্য: {order.notes}</p>
                  )}
                </div>
              </div>
            ) : (
              <ol className="relative space-y-5">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const reached = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const ts = stepTimestamp(step.key);
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 transition-colors ${
                          reached
                            ? "bg-primary text-primary-foreground ring-primary/30"
                            : "bg-muted text-muted-foreground ring-border"
                        } ${isCurrent ? "animate-pulse" : ""}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 pt-1">
                        <p
                          className={`text-sm font-semibold ${
                            reached ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              বর্তমান
                            </span>
                          )}
                        </p>
                        {ts && (
                          <p className="text-xs text-muted-foreground">{formatDate(ts)}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Courier */}
          {(order.courier_provider || order.courier_tracking_id) && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <Truck className="h-4 w-4 text-primary" /> কুরিয়ার তথ্য
              </h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">প্রতিষ্ঠান</p>
                  <p className="font-medium capitalize text-foreground">
                    {order.courier_provider || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ট্র্যাকিং আইডি</p>
                  <p className="font-mono font-medium text-foreground">
                    {order.courier_tracking_id || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">কুরিয়ার স্ট্যাটাস</p>
                  <p className="font-medium text-foreground">{order.courier_status || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">কুরিয়ারে দেওয়া হয়েছে</p>
                  <p className="font-medium text-foreground">
                    {formatDate(order.courier_sent_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              অর্ডার তারিখ: <span className="text-foreground">{formatDate(order.created_at)}</span>
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              সাহায্য দরকার? যোগাযোগ করুন <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Contact details */}
          {(settings.contact_phone || settings.contact_email) && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">যোগাযোগ</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                অর্ডার সংক্রান্ত যেকোনো জিজ্ঞাসায় নিচের যেকোনো মাধ্যমে যোগাযোগ করুন।
              </p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {settings.contact_phone && (
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{settings.contact_phone}</span>
                  </a>
                )}
                {settings.contact_email && (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{settings.contact_email}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackOrderPage;
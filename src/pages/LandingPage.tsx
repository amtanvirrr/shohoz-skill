import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star, CheckCircle, Minus, Plus, ShoppingBag, ChevronDown, Clock, Flame, AlertTriangle, Tag, Loader2, X as XIcon } from "lucide-react";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";

interface LandingPageData {
  id: string;
  slug: string;
  product_id: string;
  product_type: string;
  theme: string;
  headline: string;
  subheadline: string;
  hero_image_url: string;
  hero_video_url: string;
  benefits: { title: string; description: string }[];
  media_items: { type: string; url: string; caption: string }[];
  reviews: { name: string; rating: number; comment: string; image_url?: string }[];
  faqs: { question: string; answer: string }[];
  cta_text: string;
  cta_color: string;
  show_quantity: boolean;
  show_countdown: boolean;
  countdown_end_time: string | null;
  show_stock_badge: boolean;
  stock_limit: number;
  stock_sold: number;
  section_order: string[];
}

interface ProductInfo {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  image_url: string;
  book_type?: string;
}

interface MfsMethod {
  id: string;
  provider: string;
  display_name: string;
  phone_number: string;
  qr_code_url: string | null;
  mfs_type: string;
  payment_instruction: string;
  process_message: string;
}

interface ShippingZone {
  id: string;
  zone_name: string;
  zone_label: string;
  shipping_rate: number;
  free_shipping_minimum: number | null;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_time_unit: string;
}

// Countdown hook
const useCountdown = (endTime: string | null) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  useEffect(() => {
    if (!endTime) return;
    const calc = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return timeLeft;
};

const LandingPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [mfsMethods, setMfsMethods] = useState<MfsMethod[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [order, setOrder] = useState({ name: "", phone: "", address: "", paymentMethod: "", transactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; orderId: string; message?: string } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const countdown = useCountdown(page?.show_countdown ? page?.countdown_end_time : null);

  useEffect(() => {
    if (!slug) return;
    supabase.from("landing_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        const lp = data as any;
        setPage(lp);

        // Fetch product, mfs, shipping
        const table = lp.product_type === "course" ? "courses" : lp.product_type === "quiz" ? "quizzes" : "books";
        const [prodRes, mfsRes, szRes] = await Promise.all([
          supabase.from(table).select("*").eq("id", lp.product_id).maybeSingle(),
          supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("shipping_zones").select("*").eq("is_active", true).order("sort_order"),
        ]);
        if (prodRes.data) setProduct(prodRes.data as any);
        const mfs = (mfsRes.data || []) as MfsMethod[];
        setMfsMethods(mfs);
        if (mfs.length > 0) setOrder(o => ({ ...o, paymentMethod: mfs[0].provider }));
        const sz = (szRes.data || []) as ShippingZone[];
        setShippingZones(sz);
        if (sz.length > 0) setSelectedZone(sz[0].zone_name);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!page || !product) return <div className="flex min-h-screen items-center justify-center"><p className="text-xl text-muted-foreground">পেজটি পাওয়া যায়নি</p></div>;

  const isPhysical = page.product_type === "book" && (product as any).book_type === "physical";
  const activeZone = shippingZones.find(z => z.zone_name === selectedZone);
  const unitPrice = product.price;
  const subtotal = unitPrice * quantity;
  const shippingCost = isPhysical && activeZone ? (activeZone.free_shipping_minimum && subtotal >= activeZone.free_shipping_minimum ? 0 : activeZone.shipping_rate) : 0;
  
  // Calculate discount
  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round(subtotal * appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount) + shippingCost;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle();
    setCouponLoading(false);

    if (error || !data) { setCouponError("কুপন কোডটি সঠিক নয়"); return; }
    const c = data as any;
    if (c.expires_at && new Date(c.expires_at) < new Date()) { setCouponError("এই কুপনের মেয়াদ শেষ হয়ে গেছে"); return; }
    if (c.max_uses !== null && c.used_count >= c.max_uses) { setCouponError("এই কুপন আর ব্যবহার করা যাবে না"); return; }
    if (c.min_order_amount > 0 && subtotal < c.min_order_amount) { setCouponError(`সর্বনিম্ন ৳${c.min_order_amount} অর্ডারে প্রযোজ্য`); return; }

    setAppliedCoupon({ id: c.id, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value });
    setCouponCode("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.name || !order.phone) { toast({ title: "নাম ও ফোন আবশ্যক", variant: "destructive" }); return; }
    if (isPhysical && !order.address) { toast({ title: "ঠিকানা আবশ্যক", variant: "destructive" }); return; }
    if (!isPhysical && !order.transactionId.trim()) { toast({ title: "Transaction ID দিন", variant: "destructive" }); return; }

    setSubmitting(true);
    const paymentMethod = isPhysical ? "cod" : order.paymentMethod;
    const notes = [
      isPhysical && activeZone ? `Shipping: ${activeZone.zone_label} (৳${shippingCost})` : null,
      quantity > 1 ? `Quantity: ${quantity}` : null,
      appliedCoupon ? `Coupon: ${appliedCoupon.code} (-৳${discountAmount})` : null,
      `Landing Page: ${page.slug}`,
    ].filter(Boolean).join(" | ");

    const { data, error } = await supabase.from("orders").insert({
      customer_name: order.name,
      customer_phone: order.phone,
      customer_address: isPhysical ? order.address : null,
      product_type: page.product_type as any,
      product_id: product.id,
      product_title: product.title,
      price: totalPrice,
      payment_method: paymentMethod as any,
      user_id: user?.id || null,
      transaction_id: !isPhysical ? order.transactionId.trim() : null,
      notes,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) { toast({ title: "অর্ডার ব্যর্থ", description: error.message, variant: "destructive" }); }
    else {
      // Increment coupon used_count
      if (appliedCoupon) {
        supabase.from("coupons").select("used_count").eq("id", appliedCoupon.id).single().then(({ data: cd }) => {
          if (cd) supabase.from("coupons").update({ used_count: ((cd as any).used_count || 0) + 1 } as any).eq("id", appliedCoupon.id).then(() => {});
        });
      }
      supabase.functions.invoke("notify-order", { body: { orderId: data.order_id, orderData: { order_id: data.order_id, customer_name: order.name, customer_phone: order.phone, product_title: product.title, price: totalPrice, payment_method: paymentMethod, transaction_id: !isPhysical ? order.transactionId.trim() : null } } }).catch(() => {});
      setSuccessDialog({ open: true, orderId: data.order_id, message: isPhysical ? "আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে।" : "পেমেন্ট যাচাইয়ের পর আপনি কন্টেন্ট অ্যাক্সেস করতে পারবেন।" });
      setOrder({ name: "", phone: "", address: "", paymentMethod: mfsMethods[0]?.provider || "", transactionId: "" });
      setQuantity(1);
      setAppliedCoupon(null);
    }
  };

  const stockRemaining = page.stock_limit - page.stock_sold;
  const stockPercent = page.stock_limit > 0 ? Math.round((page.stock_sold / page.stock_limit) * 100) : 0;

  const ctaStyle = { backgroundColor: page.cta_color, color: "#fff" };
  const benefits = (page.benefits as any[]) || [];
  const reviews = (page.reviews as any[]) || [];
  const faqs = (page.faqs as any[]) || [];
  const mediaItems = (page.media_items as any[]) || [];
  const selectedMfs = mfsMethods.find(m => m.provider === order.paymentMethod);

  // Scroll to order form
  const scrollToOrder = () => {
    document.getElementById("lp-order-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // ==================== THEME-SPECIFIC RENDERING ====================
  const theme = page.theme;

  // ---- Shared: Order Form (used by all themes) ----
  const renderOrderForm = (wrapperClass: string, cardClass: string) => (
    <section key="order_form" id="lp-order-form" className={wrapperClass}>
      <div className="container mx-auto px-4 max-w-xl">
        <div className={cardClass}>
          <h2 className="text-center font-display text-2xl font-bold mb-2">
            <ShoppingBag className="inline h-6 w-6 mr-2" />{page.cta_text}
          </h2>
          <p className="text-center text-sm opacity-70 mb-6">
            {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে" : "পেমেন্ট করে এখনই পান"}
          </p>
          {isPhysical && page.show_quantity && (
            <div className="flex items-center justify-center gap-4 mb-6 p-3 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium">পরিমাণ:</Label>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <span className="text-sm font-medium">৳{unitPrice * quantity}</span>
            </div>
          )}
          <form onSubmit={handleOrder} className="space-y-4">
            <div><Label>আপনার নাম *</Label><Input className="mt-1" value={order.name} onChange={e => setOrder(o => ({ ...o, name: e.target.value }))} placeholder="পূর্ণ নাম" /></div>
            <div><Label>মোবাইল নম্বর *</Label><Input className="mt-1" value={order.phone} onChange={e => setOrder(o => ({ ...o, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
            {isPhysical && <div><Label>ডেলিভারি ঠিকানা *</Label><Textarea className="mt-1" rows={2} value={order.address} onChange={e => setOrder(o => ({ ...o, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" /></div>}
            {isPhysical && shippingZones.length > 0 && (
              <div><Label>ডেলিভারি জোন *</Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{shippingZones.map(z => <SelectItem key={z.zone_name} value={z.zone_name}>{z.zone_label} — ৳{z.shipping_rate} ({z.delivery_time_min}-{z.delivery_time_max} {z.delivery_time_unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {!isPhysical && mfsMethods.length > 0 && (
              <>
                <div><Label>পেমেন্ট মেথড *</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {mfsMethods.map(m => (
                      <button type="button" key={m.provider} onClick={() => setOrder(o => ({ ...o, paymentMethod: m.provider }))}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${order.paymentMethod === m.provider ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                        {m.display_name}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedMfs && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                    <p className="font-medium">{selectedMfs.display_name} ({selectedMfs.mfs_type})</p>
                    <p>নম্বর: <span className="font-mono font-bold">{selectedMfs.phone_number}</span></p>
                    {selectedMfs.payment_instruction && <p className="opacity-70">{selectedMfs.payment_instruction}</p>}
                  </div>
                )}
                <div><Label>Transaction ID *</Label><Input className="mt-1" value={order.transactionId} onChange={e => setOrder(o => ({ ...o, transactionId: e.target.value }))} placeholder="পেমেন্টের Transaction ID" /></div>
              </>
            )}
            {/* Coupon Code */}
            <div>
              <Label>কুপন কোড (ঐচ্ছিক)</Label>
              {appliedCoupon ? (
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                  <Tag className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">{appliedCoupon.code} প্রয়োগ হয়েছে</span>
                  <span className="text-sm text-green-600 dark:text-green-400">(-৳{discountAmount})</span>
                  <button type="button" onClick={removeCoupon} className="ml-auto text-muted-foreground hover:text-destructive"><XIcon className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="mt-1 flex gap-2">
                  <Input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }} placeholder="কুপন কোড লিখুন" className="font-mono uppercase flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "প্রয়োগ"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {quantity > 1 && <div className="flex justify-between text-sm"><span>মূল্য ({quantity}×৳{unitPrice})</span><span>৳{subtotal}</span></div>}
              {appliedCoupon && <div className="flex justify-between text-sm text-green-600"><span>ডিসকাউন্ট ({appliedCoupon.code})</span><span>-৳{discountAmount}</span></div>}
              {isPhysical && shippingCost > 0 && <div className="flex justify-between text-sm"><span>শিপিং</span><span>৳{shippingCost}</span></div>}
              {isPhysical && shippingCost === 0 && activeZone && <div className="flex justify-between text-sm text-green-600"><span>শিপিং</span><span>ফ্রি!</span></div>}
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>সর্বমোট</span><span>৳{totalPrice}</span></div>
            </div>
            <Button type="submit" size="lg" className="w-full text-lg py-6 shadow-lg" style={ctaStyle} disabled={submitting}>
              {submitting ? "প্রসেস হচ্ছে..." : page.cta_text}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );

  // ---- Shared: Countdown + Stock badge ----
  const renderUrgency = (containerClass = "") => (
    <div className={containerClass}>
      {page.show_countdown && !countdown.expired && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-destructive">
          <Clock className="h-5 w-5 animate-pulse" />
          <span className="font-bold text-sm">
            অফার শেষ হবে: {countdown.days > 0 && `${countdown.days}দিন `}{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </span>
        </div>
      )}
      {page.show_stock_badge && stockRemaining > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-4 py-2 mt-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">মাত্র {stockRemaining}টি বাকি আছে!</span>
          <div className="w-20 h-1.5 rounded-full bg-orange-200 dark:bg-orange-900 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${stockPercent}%` }} />
          </div>
        </div>
      )}
      {page.show_stock_badge && stockRemaining <= 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2 mt-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm font-bold text-destructive">স্টক শেষ!</span>
        </div>
      )}
    </div>
  );

  // ==================== MINIMALIST THEME ====================
  if (theme === "minimalist") {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero: Clean, centered, lots of whitespace */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
              {page.headline}
            </h1>
            {page.subheadline && (
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">{page.subheadline}</p>
            )}
            <div className="mt-8 flex items-center justify-center gap-3">
              {product.price === 0 ? (
                <span className="text-3xl font-bold text-primary">ফ্রি</span>
              ) : (
                <>
                  <span className="text-4xl font-bold text-foreground">৳{product.price}</span>
                  {product.original_price && <span className="text-xl text-muted-foreground line-through">৳{product.original_price}</span>}
                </>
              )}
            </div>
            {renderUrgency("mt-6")}
            <Button size="lg" className="mt-8 text-base px-10 py-6 rounded-full" style={ctaStyle} onClick={scrollToOrder}>
              {page.cta_text}
            </Button>
          </div>
        </section>

        {/* Single product image, full width with max constraint */}
        {(page.hero_video_url || page.hero_image_url) && (
          <section className="pb-16">
            <div className="container mx-auto px-4 max-w-4xl">
              {page.hero_video_url ? (
                <div className="aspect-video rounded-xl overflow-hidden border border-border">
                  <iframe src={page.hero_video_url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                </div>
              ) : (
                <img src={page.hero_image_url} alt={page.headline} className="rounded-xl w-full object-cover max-h-[500px] border border-border" />
              )}
            </div>
          </section>
        )}

        {/* Benefits: Simple list, no cards */}
        {benefits.length > 0 && benefits[0].title && (
          <section className="py-16 border-t border-border">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="space-y-6">
                {benefits.filter(b => b.title).map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{b.title}</h3>
                      {b.description && <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Media: Simple stack */}
        {mediaItems.length > 0 && (
          <section className="py-16">
            <div className="container mx-auto px-4 max-w-3xl space-y-6">
              {mediaItems.map((m, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-border">
                  {m.type === "video" ? (
                    <div className="aspect-video"><iframe src={m.url} className="w-full h-full" allowFullScreen /></div>
                  ) : (
                    <img src={m.url} alt={m.caption || ""} className="w-full object-cover" />
                  )}
                  {m.caption && <p className="p-4 text-sm text-center text-muted-foreground">{m.caption}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews: Simple quotes */}
        {reviews.length > 0 && (
          <section className="py-16 border-t border-border">
            <div className="container mx-auto px-4 max-w-2xl space-y-8">
              <h2 className="text-center text-xl font-medium text-muted-foreground">গ্রাহকদের মতামত</h2>
              {reviews.map((r, i) => (
                <blockquote key={i} className="text-center">
                  <p className="text-lg text-foreground italic leading-relaxed">"{r.comment}"</p>
                  <footer className="mt-3 text-sm text-muted-foreground">— {r.name}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Order Form */}
        {renderOrderForm("py-16 border-t border-border", "rounded-xl border border-border p-6 md:p-8 bg-card")}

        {/* FAQs */}
        {faqs.length > 0 && faqs[0].question && (
          <section className="py-16 border-t border-border">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-center text-xl font-medium text-muted-foreground mb-8">সচরাচর জিজ্ঞাসা</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.filter(f => f.question).map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border px-0">
                    <AccordionTrigger className="text-left font-medium py-4">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        <footer className="py-6 text-center text-sm text-muted-foreground border-t">
          {settings.copyright_text || `© ${new Date().getFullYear()} ${settings.site_name}`}
        </footer>
        {successDialog && <OrderSuccessDialog open={successDialog.open} orderId={successDialog.orderId} productTitle={product.title} message={successDialog.message} onClose={() => setSuccessDialog(null)} />}
      </div>
    );
  }

  // ==================== PREMIUM THEME ====================
  if (theme === "premium") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Hero: Full-width gradient bg with image overlay */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid gap-10 md:grid-cols-2 items-center">
              <div>
                <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-6">
                  ⭐ প্রিমিয়াম কালেকশন
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1]">
                  {page.headline}
                </h1>
                {page.subheadline && (
                  <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">{page.subheadline}</p>
                )}
                <div className="mt-6 flex items-baseline gap-4">
                  {product.price === 0 ? (
                    <span className="text-4xl font-extrabold text-primary">ফ্রি</span>
                  ) : (
                    <>
                      <span className="text-5xl font-extrabold text-foreground">৳{product.price}</span>
                      {product.original_price && (
                        <span className="text-2xl text-muted-foreground line-through">৳{product.original_price}</span>
                      )}
                      {product.original_price && (
                        <span className="rounded-full bg-destructive/10 text-destructive text-sm font-bold px-3 py-1">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% ছাড়
                        </span>
                      )}
                    </>
                  )}
                </div>
                {renderUrgency("mt-5")}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button size="lg" className="text-lg px-10 py-7 rounded-xl shadow-2xl hover:shadow-xl transition-all text-lg font-bold" style={ctaStyle} onClick={scrollToOrder}>
                    {page.cta_text} →
                  </Button>
                </div>
              </div>
              <div className="relative">
                {page.hero_video_url ? (
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-primary/20">
                    <iframe src={page.hero_video_url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                  </div>
                ) : page.hero_image_url ? (
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                    <img src={page.hero_image_url} alt={page.headline} className="relative rounded-2xl shadow-2xl w-full object-cover max-h-[500px] ring-1 ring-primary/10" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits: Gradient cards with numbers */}
        {benefits.length > 0 && benefits[0].title && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-display text-3xl md:text-4xl font-extrabold text-foreground mb-4">কেন এটি আপনার জন্য?</h2>
              <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">এই প্রোডাক্টটি আপনার জীবনে যে পরিবর্তন আনবে</p>
              <div className="grid gap-6 md:grid-cols-3">
                {benefits.filter(b => b.title).map((b, i) => (
                  <div key={i} className="group relative rounded-2xl border border-border bg-card p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div className="absolute -top-4 -left-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-lg shadow-lg">
                      {i + 1}
                    </div>
                    <h3 className="font-bold text-foreground text-xl mt-2">{b.title}</h3>
                    {b.description && <p className="mt-3 text-muted-foreground leading-relaxed">{b.description}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <Button size="lg" className="px-10 py-6 rounded-xl shadow-lg text-lg" style={ctaStyle} onClick={scrollToOrder}>{page.cta_text}</Button>
              </div>
            </div>
          </section>
        )}

        {/* Media Gallery: Masonry-like */}
        {mediaItems.length > 0 && (
          <section className="py-16 md:py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className={`grid gap-6 ${mediaItems.length === 1 ? "max-w-3xl mx-auto" : mediaItems.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                {mediaItems.map((m, i) => (
                  <div key={i} className={`rounded-2xl overflow-hidden shadow-xl ring-1 ring-border ${i === 0 && mediaItems.length >= 3 ? "md:col-span-2 md:row-span-2" : ""}`}>
                    {m.type === "video" ? (
                      <div className="aspect-video"><iframe src={m.url} className="w-full h-full" allowFullScreen /></div>
                    ) : (
                      <img src={m.url} alt={m.caption || ""} className="w-full h-full object-cover" />
                    )}
                    {m.caption && <p className="p-4 text-sm text-center text-muted-foreground bg-card">{m.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reviews: Cards with gradient top border */}
        {reviews.length > 0 && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-display text-3xl md:text-4xl font-extrabold text-foreground mb-12">গ্রাহকরা কী বলছেন</h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
                    <div className="p-6">
                      <div className="flex mb-3">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}</div>
                      <p className="text-foreground leading-relaxed mb-4">"{r.comment}"</p>
                      <div className="flex items-center gap-3">
                        {r.image_url ? (
                          <img src={r.image_url} alt={r.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg">{r.name.charAt(0)}</div>
                        )}
                        <span className="font-semibold text-foreground">{r.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Order Form */}
        {renderOrderForm(
          "py-16 md:py-20",
          "rounded-2xl border-2 border-primary/20 p-6 md:p-10 bg-card shadow-2xl"
        )}

        {/* FAQs */}
        {faqs.length > 0 && faqs[0].question && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-center font-display text-3xl font-extrabold text-foreground mb-10">সচরাচর জিজ্ঞাসা</h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.filter(f => f.question).map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-5 shadow-sm bg-card">
                    <AccordionTrigger className="text-left font-semibold text-base">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {/* Final CTA: Gradient banner */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-6">{page.headline}</h2>
            <Button size="lg" className="text-lg px-12 py-7 rounded-xl shadow-2xl font-bold" style={ctaStyle} onClick={scrollToOrder}>
              {page.cta_text} →
            </Button>
          </div>
        </section>

        <footer className="py-6 text-center text-sm text-muted-foreground border-t">
          {settings.copyright_text || `© ${new Date().getFullYear()} ${settings.site_name}`}
        </footer>
        {successDialog && <OrderSuccessDialog open={successDialog.open} orderId={successDialog.orderId} productTitle={product.title} message={successDialog.message} onClose={() => setSuccessDialog(null)} />}
      </div>
    );
  }

  // ==================== EXCLUSIVE THEME (Dark Luxury) ====================
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero: Full-bleed dark with dramatic typography */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background image with overlay */}
        {page.hero_image_url && !page.hero_video_url && (
          <div className="absolute inset-0">
            <img src={page.hero_image_url} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          </div>
        )}
        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="inline-block border border-amber-500/30 bg-amber-500/10 rounded-full px-5 py-1.5 text-sm font-semibold text-amber-400 mb-8 tracking-wider uppercase">
              ✦ Exclusive Edition
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              {page.headline}
            </h1>
            {page.subheadline && (
              <p className="mt-6 text-xl text-zinc-400 max-w-2xl leading-relaxed">{page.subheadline}</p>
            )}
            <div className="mt-8 flex items-baseline gap-4">
              {product.price === 0 ? (
                <span className="text-4xl font-extrabold text-amber-400">ফ্রি</span>
              ) : (
                <>
                  <span className="text-5xl font-extrabold text-white">৳{product.price}</span>
                  {product.original_price && <span className="text-2xl text-zinc-500 line-through">৳{product.original_price}</span>}
                </>
              )}
            </div>
            <div className="mt-6">
              {page.show_countdown && !countdown.expired && (
                <div className="inline-flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-5 py-3">
                  <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
                  <span className="font-bold text-amber-300 tracking-wide">
                    {countdown.days > 0 && `${countdown.days}দিন `}{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                  </span>
                </div>
              )}
              {page.show_stock_badge && stockRemaining > 0 && (
                <div className="inline-flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-5 py-3 mt-3">
                  <Flame className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-semibold text-red-300">মাত্র {stockRemaining}টি বাকি</span>
                </div>
              )}
            </div>
            <Button size="lg" className="mt-10 text-lg px-12 py-7 rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold tracking-wide shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all" onClick={scrollToOrder}>
              {page.cta_text} →
            </Button>
          </div>
        </div>
        {page.hero_video_url && (
          <div className="container mx-auto px-4 relative z-10 pb-16 max-w-4xl">
            <div className="aspect-video rounded-xl overflow-hidden ring-1 ring-zinc-800 shadow-2xl">
              <iframe src={page.hero_video_url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
            </div>
          </div>
        )}
      </section>

      {/* Benefits: Horizontal divider style */}
      {benefits.length > 0 && benefits[0].title && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-center text-sm font-semibold tracking-[0.3em] uppercase text-amber-400 mb-16">বৈশিষ্ট্য সমূহ</h2>
            <div className="space-y-0 divide-y divide-zinc-800">
              {benefits.filter(b => b.title).map((b, i) => (
                <div key={i} className="flex items-start gap-6 py-8 group">
                  <span className="text-3xl font-extrabold text-zinc-700 group-hover:text-amber-500 transition-colors w-12 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-xl group-hover:text-amber-300 transition-colors">{b.title}</h3>
                    {b.description && <p className="mt-2 text-zinc-400 leading-relaxed">{b.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Media Gallery: Cinematic */}
      {mediaItems.length > 0 && (
        <section className="py-20 bg-zinc-900/50">
          <div className="container mx-auto px-4">
            <div className={`grid gap-4 ${mediaItems.length === 1 ? "max-w-3xl mx-auto" : "md:grid-cols-2"}`}>
              {mediaItems.map((m, i) => (
                <div key={i} className="rounded-lg overflow-hidden ring-1 ring-zinc-800 shadow-xl">
                  {m.type === "video" ? (
                    <div className="aspect-video"><iframe src={m.url} className="w-full h-full" allowFullScreen /></div>
                  ) : (
                    <img src={m.url} alt={m.caption || ""} className="w-full object-cover" />
                  )}
                  {m.caption && <p className="p-4 text-sm text-center text-zinc-500 bg-zinc-900">{m.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews: Testimonial cards with gold accent */}
      {reviews.length > 0 && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-sm font-semibold tracking-[0.3em] uppercase text-amber-400 mb-16">গ্রাহকদের অভিজ্ঞতা</h2>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {reviews.map((r, i) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-8 bg-zinc-900/50 relative">
                  <div className="absolute top-0 left-8 h-1 w-12 bg-amber-500" />
                  <div className="flex mb-4">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
                  <p className="text-zinc-300 leading-relaxed italic">"{r.comment}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/30" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">{r.name.charAt(0)}</div>
                    )}
                    <span className="font-semibold text-zinc-300">{r.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Order Form: Dark card with gold accents */}
      {renderOrderForm(
        "py-20 border-t border-zinc-800",
        "rounded-lg border border-zinc-700 bg-zinc-900 p-6 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)] text-zinc-100"
      )}

      {/* FAQs */}
      {faqs.length > 0 && faqs[0].question && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-center text-sm font-semibold tracking-[0.3em] uppercase text-amber-400 mb-12">সচরাচর জিজ্ঞাসা</h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.filter(f => f.question).map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-zinc-800 rounded-lg px-5 bg-zinc-900/50">
                  <AccordionTrigger className="text-left font-medium text-zinc-200">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-zinc-400">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-20 border-t border-zinc-800 bg-gradient-to-t from-zinc-900 to-zinc-950">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-8">{page.headline}</h2>
          <Button size="lg" className="text-lg px-14 py-7 rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold tracking-wide shadow-[0_0_40px_rgba(245,158,11,0.3)]" onClick={scrollToOrder}>
            {page.cta_text} →
          </Button>
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-zinc-600 border-t border-zinc-800">
        {settings.copyright_text || `© ${new Date().getFullYear()} ${settings.site_name}`}
      </footer>
      {successDialog && <OrderSuccessDialog open={successDialog.open} orderId={successDialog.orderId} productTitle={product.title} message={successDialog.message} onClose={() => setSuccessDialog(null)} />}
    </div>
  );
};

export default LandingPage;

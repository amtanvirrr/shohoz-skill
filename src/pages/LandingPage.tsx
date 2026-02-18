import { useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { Star, CheckCircle, Minus, Plus, ShoppingBag, Clock, Flame, AlertTriangle, Tag, Loader2, X as XIcon, Shield, Truck, Award, Users, ThumbsUp, Zap, Crown, Gem, ChevronLeft, ChevronRight } from "lucide-react";
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
  hero_images: string[];
  hero_videos: string[];
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

// YouTube URL to embed URL converter
const toEmbedUrl = (url: string): string => {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname === 'youtu.be') {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {}
  return url;
};

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

// ==================== AUTO-SLIDING CAROUSEL ====================
const AutoSlider = ({ items, renderItem, className = "", interval = 4000 }: {
  items: string[];
  renderItem: (url: string, index: number) => React.ReactNode;
  className?: string;
  interval?: number;
}) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % items.length);
    }, interval);
  }, [items.length, interval]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = (dir: number) => {
    setCurrent(c => (c + dir + items.length) % items.length);
    startTimer();
  };

  if (items.length === 0) return null;
  if (items.length === 1) return <div className={className}>{renderItem(items[0], 0)}</div>;

  return (
    <div className={`relative group ${className}`}>
      <div className="overflow-hidden rounded-inherit">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${current * 100}%)` }}>
          {items.map((url, i) => (
            <div key={i} className="w-full flex-shrink-0">{renderItem(url, i)}</div>
          ))}
        </div>
      </div>
      {/* Navigation arrows */}
      <button onClick={() => goTo(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={() => goTo(1)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <ChevronRight className="h-5 w-5" />
      </button>
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {items.map((_, i) => (
          <button key={i} onClick={() => { setCurrent(i); startTimer(); }}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
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
        // Merge old single fields into arrays for backward compat
        const heroImages: string[] = (lp.hero_images as string[] || []).filter((u: string) => u && u.trim());
        const heroVideos: string[] = (lp.hero_videos as string[] || []).filter((u: string) => u && u.trim());
        // Fallback: if arrays empty but old fields exist, use them
        if (heroImages.length === 0 && lp.hero_image_url) heroImages.push(lp.hero_image_url);
        if (heroVideos.length === 0 && lp.hero_video_url) heroVideos.push(lp.hero_video_url);
        lp.hero_images = heroImages;
        lp.hero_videos = heroVideos;
        setPage(lp);
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
      if (appliedCoupon) {
        supabase.from("coupons").select("used_count").eq("id", appliedCoupon.id).single().then(({ data: cd }) => {
          if (cd) supabase.from("coupons").update({ used_count: ((cd as any).used_count || 0) + 1 } as any).eq("id", appliedCoupon.id).then(() => {});
        });
      }
      supabase.functions.invoke("notify-order", { body: { orderId: data.order_id, orderData: { order_id: data.order_id, customer_name: order.name, customer_phone: order.phone, product_title: product.title, price: totalPrice, payment_method: paymentMethod, transaction_id: !isPhysical ? order.transactionId.trim() : null } } }).catch(() => {});
      setSuccessDialog({ open: true, orderId: data.order_id, message: isPhysical ? "আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে।" : "পেমেন্ট যাচাইয়ের পর আপনি কন্টেন্ট অ্যাকসেস করতে পারবেন।" });
      setOrder({ name: "", phone: "", address: "", paymentMethod: mfsMethods[0]?.provider || "", transactionId: "" });
      setQuantity(1);
      setAppliedCoupon(null);
    }
  };

  const stockRemaining = page.stock_limit - page.stock_sold;
  const stockPercent = page.stock_limit > 0 ? Math.round((page.stock_sold / page.stock_limit) * 100) : 0;
  const discountPercent = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;

  const ctaStyle = { backgroundColor: page.cta_color, color: "#fff" };
  const benefits = (page.benefits as any[]) || [];
  const reviews = (page.reviews as any[]) || [];
  const faqs = (page.faqs as any[]) || [];
  const mediaItems = (page.media_items as any[]) || [];
  const selectedMfs = mfsMethods.find(m => m.provider === order.paymentMethod);

  // Separate media items by type
  const mediaImages = mediaItems.filter(m => m.type === "image" && m.url);
  const mediaVideos = mediaItems.filter(m => m.type === "video" && m.url);

  const heroImages = page.hero_images || [];
  const heroVideos = page.hero_videos || [];

  const scrollToOrder = () => {
    document.getElementById("lp-order-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const theme = page.theme;

  // ==================== SHARED: Order Form Inner Content ====================
  const renderOrderFormContent = (inputClass = "", labelClass = "", isDark = false) => (
    <form onSubmit={handleOrder} className="space-y-4">
      <div><Label className={labelClass}>আপনার নাম *</Label><Input className={`mt-1 ${inputClass}`} value={order.name} onChange={e => setOrder(o => ({ ...o, name: e.target.value }))} placeholder="পূর্ণ নাম" /></div>
      <div><Label className={labelClass}>মোবাইল নম্বর *</Label><Input className={`mt-1 ${inputClass}`} value={order.phone} onChange={e => setOrder(o => ({ ...o, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
      {isPhysical && <div><Label className={labelClass}>ডেলিভারি ঠিকানা *</Label><Textarea className={`mt-1 ${inputClass}`} rows={2} value={order.address} onChange={e => setOrder(o => ({ ...o, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" /></div>}
      {isPhysical && shippingZones.length > 0 && (
        <div><Label className={labelClass}>ডেলিভারি জোন *</Label>
          <Select value={selectedZone} onValueChange={setSelectedZone}><SelectTrigger className={`mt-1 ${inputClass}`}><SelectValue /></SelectTrigger>
            <SelectContent>{shippingZones.map(z => <SelectItem key={z.zone_name} value={z.zone_name}>{z.zone_label} — ৳{z.shipping_rate} ({z.delivery_time_min}-{z.delivery_time_max} {z.delivery_time_unit})</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {!isPhysical && mfsMethods.length > 0 && (
        <>
          <div><Label className={labelClass}>পেমেন্ট মেথড *</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mfsMethods.map(m => (
                <button type="button" key={m.provider} onClick={() => setOrder(o => ({ ...o, paymentMethod: m.provider }))}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                    isDark
                      ? (order.paymentMethod === m.provider ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-zinc-700 hover:border-amber-500/50 text-zinc-300")
                      : (order.paymentMethod === m.provider ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")
                  }`}>
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>
          {selectedMfs && (
            <div className={`rounded-lg p-3 text-sm space-y-1 ${isDark ? "bg-zinc-800/50" : "bg-muted/50"}`}>
              <p className="font-medium">{selectedMfs.display_name} ({selectedMfs.mfs_type})</p>
              <p>নম্বর: <span className="font-mono font-bold">{selectedMfs.phone_number}</span></p>
              {selectedMfs.payment_instruction && <p className="opacity-70">{selectedMfs.payment_instruction}</p>}
            </div>
          )}
          <div><Label className={labelClass}>Transaction ID *</Label><Input className={`mt-1 ${inputClass}`} value={order.transactionId} onChange={e => setOrder(o => ({ ...o, transactionId: e.target.value }))} placeholder="পেমেন্টের Transaction ID" /></div>
        </>
      )}
      {/* Coupon */}
      <div>
        <Label className={labelClass}>কুপন কোড (ঐচ্ছিক)</Label>
        {appliedCoupon ? (
          <div className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 ${isDark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200"}`}>
            <Tag className={`h-4 w-4 ${isDark ? "text-green-400" : "text-green-600"}`} />
            <span className={`text-sm font-medium ${isDark ? "text-green-400" : "text-green-700"}`}>{appliedCoupon.code} প্রয়োগ হয়েছে</span>
            <span className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>(-৳{discountAmount})</span>
            <button type="button" onClick={removeCoupon} className="ml-auto text-muted-foreground hover:text-destructive"><XIcon className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <Input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }} placeholder="কুপন কোড লিখুন" className={`font-mono uppercase flex-1 ${inputClass}`} />
            <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
              className={isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300" : ""}>
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "প্রয়োগ"}
            </Button>
          </div>
        )}
        {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
      </div>
      {/* Price Summary */}
      <div className={`rounded-lg p-4 space-y-2 ${isDark ? "bg-zinc-800/50" : "bg-muted/50"}`}>
        {quantity > 1 && <div className="flex justify-between text-sm"><span>মূল্য ({quantity}×৳{unitPrice})</span><span>৳{subtotal}</span></div>}
        {appliedCoupon && <div className={`flex justify-between text-sm ${isDark ? "text-green-400" : "text-green-600"}`}><span>ডিসকাউন্ট ({appliedCoupon.code})</span><span>-৳{discountAmount}</span></div>}
        {isPhysical && shippingCost > 0 && <div className="flex justify-between text-sm"><span>শিপিং</span><span>৳{shippingCost}</span></div>}
        {isPhysical && shippingCost === 0 && activeZone && <div className={`flex justify-between text-sm ${isDark ? "text-green-400" : "text-green-600"}`}><span>শিপিং</span><span>ফ্রি!</span></div>}
        <div className={`flex justify-between font-bold text-lg border-t pt-2 ${isDark ? "border-zinc-700" : ""}`}><span>সর্বমোট</span><span>৳{totalPrice}</span></div>
      </div>
      {isPhysical && page.show_quantity && (
        <div className={`flex items-center justify-center gap-4 p-3 rounded-lg ${isDark ? "bg-zinc-800/50" : "bg-muted/50"}`}>
          <Label className="text-sm font-medium">পরিমাণ:</Label>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className={`h-8 w-8 ${isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10" : ""}`} onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
            <span className="w-10 text-center font-bold text-lg">{quantity}</span>
            <Button size="icon" variant="outline" className={`h-8 w-8 ${isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10" : ""}`} onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </form>
  );

  // ==================== SHARED: Hero Media Section (Videos on top, Images below) ====================
  const renderHeroMedia = (containerClass: string, videoClass: string, imageClass: string) => {
    if (heroVideos.length === 0 && heroImages.length === 0) return null;
    return (
      <div className={containerClass}>
        {/* Videos first */}
        {heroVideos.length > 0 && (
          <AutoSlider
            items={heroVideos}
            renderItem={(url) => (
              <div className={`aspect-video ${videoClass}`}>
                <iframe src={toEmbedUrl(url)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
              </div>
            )}
          />
        )}
        {/* Images below videos */}
        {heroImages.length > 0 && (
          <AutoSlider
            items={heroImages}
            renderItem={(url) => (
              <img src={url} alt={page.headline} className={imageClass} />
            )}
          />
        )}
      </div>
    );
  };

  // ==================== SHARED: Media Gallery (separated by type with sliding) ====================
  const renderMediaGallery = (sectionClass: string, containerClass: string, videoFrameClass: string, imageFrameClass: string, captionClass: string) => {
    if (mediaImages.length === 0 && mediaVideos.length === 0) return null;
    return (
      <section className={sectionClass}>
        <div className={containerClass}>
          {/* Videos section */}
          {mediaVideos.length > 0 && (
            <div className="mb-8">
              <AutoSlider
                items={mediaVideos.map(m => m.url)}
                renderItem={(url, i) => {
                  const item = mediaVideos[i];
                  return (
                    <div className={videoFrameClass}>
                      <div className="aspect-video"><iframe src={toEmbedUrl(url)} className="w-full h-full" allowFullScreen /></div>
                      {item?.caption && <p className={captionClass}>{item.caption}</p>}
                    </div>
                  );
                }}
              />
            </div>
          )}
          {/* Images section */}
          {mediaImages.length > 0 && (
            <AutoSlider
              items={mediaImages.map(m => m.url)}
              renderItem={(url, i) => {
                const item = mediaImages[i];
                return (
                  <div className={imageFrameClass}>
                    <img src={url} alt={item?.caption || ""} className="w-full object-cover" />
                    {item?.caption && <p className={captionClass}>{item.caption}</p>}
                  </div>
                );
              }}
            />
          )}
        </div>
      </section>
    );
  };

  // ==================== MINIMALIST THEME ====================
  if (theme === "minimalist") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* ═══ STAGE 1: ATTENTION ═══ Hero: Ultra-clean, centered, generous whitespace */}
        <section className="py-24 md:py-36">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              {page.headline}
            </h1>
            {page.subheadline && (
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">{page.subheadline}</p>
            )}
          </div>
        </section>

        {/* Hero media: Videos on top, Images below */}
        {renderHeroMedia(
          "pb-12 container mx-auto px-4 max-w-3xl space-y-6",
          "rounded-2xl overflow-hidden border border-border shadow-sm",
          "rounded-2xl w-full object-cover max-h-[480px] border border-border shadow-sm"
        )}

        {/* Pricing + Urgency + CTA below hero visuals */}
        <section className="pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="flex items-center justify-center gap-3">
              {product.price === 0 ? (
                <span className="text-3xl font-bold text-primary">ফ্রি</span>
              ) : (
                <>
                  <span className="text-4xl font-bold">৳{product.price}</span>
                  {product.original_price && <span className="text-xl text-muted-foreground line-through">৳{product.original_price}</span>}
                </>
              )}
            </div>
            {page.show_countdown && !countdown.expired && (
              <p className="mt-4 text-sm text-muted-foreground">
                <Clock className="inline h-4 w-4 mr-1 opacity-60" />
                অফার শেষ হবে: {countdown.days > 0 && `${countdown.days}দিন `}{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </p>
            )}
            {page.show_stock_badge && stockRemaining > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">মাত্র {stockRemaining}টি বাকি আছে</p>
            )}
            <Button size="lg" className="mt-10 text-base px-12 py-6 rounded-full shadow-md hover:shadow-lg transition-all bg-[hsl(152,60%,38%)] hover:bg-[hsl(152,60%,33%)] text-white" onClick={scrollToOrder}>
              {page.cta_text}
            </Button>
          </div>
        </section>

        {/* ═══ STAGE 2: INTEREST ═══ Social Proof Badge + Benefits */}
        <section className="py-6">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> ৫০০+ সন্তুষ্ট গ্রাহক</span>
              <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4 text-primary" /> ৪.৮/৫ রেটিং</span>
            </div>
          </div>
        </section>

        {benefits.length > 0 && benefits[0].title && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="space-y-8">
                {benefits.filter(b => b.title).map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-[hsl(152,60%,38%)] mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold">{b.title}</h3>
                      {b.description && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{b.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ STAGE 3: DESIRE ═══ Media Gallery (separated) + Reviews + Mid-CTA */}
        {renderMediaGallery(
          "py-16",
          "container mx-auto px-4 max-w-3xl",
          "rounded-2xl overflow-hidden border border-border",
          "rounded-2xl overflow-hidden border border-border",
          "p-4 text-sm text-center text-muted-foreground"
        )}

        {reviews.length > 0 && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-center text-lg font-medium text-muted-foreground mb-12">বিশ্বস্ত গ্রাহকদের মতামত</h2>
              <div className="space-y-10 divide-y divide-border">
                {reviews.map((r, i) => (
                  <blockquote key={i} className={`text-center ${i > 0 ? 'pt-10' : ''}`}>
                    <p className="text-lg italic leading-relaxed">"{r.comment}"</p>
                    <footer className="mt-4 text-sm text-muted-foreground">— {r.name}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-xl text-center">
            <p className="text-muted-foreground mb-4">আর দেরি না করে সিদ্ধান্ত নিন</p>
            <Button size="lg" className="px-10 py-6 rounded-full bg-[hsl(152,60%,38%)] hover:bg-[hsl(152,60%,33%)] text-white" onClick={scrollToOrder}>
              {page.cta_text}
            </Button>
          </div>
        </section>

        {/* ═══ STAGE 4: ACTION ═══ Trust Signal + Order Form */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-xl text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-[hsl(152,60%,38%)]" />
              <span>১০০% সন্তুষ্টির নিশ্চয়তা — নিরাপদ অর্ডার প্রক্রিয়া</span>
            </div>
          </div>
        </section>

        <section id="lp-order-form" className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="rounded-2xl border border-border p-8 md:p-10 bg-card shadow-sm">
              <h2 className="text-center font-display text-2xl font-bold mb-2">
                <ShoppingBag className="inline h-5 w-5 mr-2 opacity-60" />{page.cta_text}
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-8">
                {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে" : "পেমেন্ট করে এখনই পান"}
              </p>
              {renderOrderFormContent()}
              <Button type="submit" size="lg" className="w-full text-lg py-6 mt-6 rounded-full shadow-md bg-[hsl(152,60%,38%)] hover:bg-[hsl(152,60%,33%)] text-white" disabled={submitting} onClick={handleOrder}>
                {submitting ? "প্রসেস হচ্ছে..." : page.cta_text}
              </Button>
            </div>
          </div>
        </section>

        {faqs.length > 0 && faqs[0].question && (
          <section className="py-16 md:py-24 border-t border-border">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-center text-lg font-medium text-muted-foreground mb-10">সচরাচর জিজ্ঞাসা</h2>
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

        <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
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
        {/* ═══ STAGE 1: ATTENTION ═══ Hero text + visuals below */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-56 h-56 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid gap-10 md:grid-cols-2 items-center">
              <div>
                <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-4">
                  ⭐ প্রিমিয়াম কালেকশন
                </div>
                {product.original_price && discountPercent > 0 && (
                  <div className="inline-flex items-center gap-2 ml-3 rounded-full bg-destructive text-white text-sm font-extrabold px-4 py-1.5 animate-bounce shadow-lg">
                    🔥 {discountPercent}% ছাড়!
                  </div>
                )}
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mt-4">
                  {page.headline}
                </h1>
                {page.subheadline && (
                  <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed">{page.subheadline}</p>
                )}
              </div>
              {/* Hero media on right side - videos first, images below */}
              <div className="space-y-4">
                {heroVideos.length > 0 && (
                  <AutoSlider
                    items={heroVideos}
                    renderItem={(url) => (
                      <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-primary/20">
                        <iframe src={toEmbedUrl(url)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                      </div>
                    )}
                  />
                )}
                {heroImages.length > 0 && (
                  <AutoSlider
                    items={heroImages}
                    renderItem={(url) => (
                      <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                        <img src={url} alt={page.headline} className="relative rounded-2xl shadow-2xl w-full object-cover max-h-[500px] ring-1 ring-primary/10" />
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing + Urgency + CTA below hero */}
        <section className="py-10 relative z-10">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-baseline justify-center gap-4">
              {product.price === 0 ? (
                <span className="text-4xl font-extrabold text-primary">ফ্রি</span>
              ) : (
                <>
                  <span className="text-5xl font-extrabold">৳{product.price}</span>
                  {product.original_price && (
                    <span className="text-2xl text-muted-foreground line-through">৳{product.original_price}</span>
                  )}
                </>
              )}
            </div>
            {page.show_countdown && !countdown.expired && (
              <div className="mt-5 inline-flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-5 py-3 shadow-lg">
                <Clock className="h-5 w-5 text-destructive animate-pulse" />
                <span className="font-extrabold text-destructive">
                  {countdown.days > 0 && `${countdown.days}দিন `}{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
            )}
            {page.show_stock_badge && stockRemaining > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-4 py-2 shadow-md">
                <Flame className="h-4 w-4 text-accent" />
                <span className="text-sm font-bold text-accent">মাত্র {stockRemaining}টি বাকি!</span>
                <div className="w-24 h-2 rounded-full bg-accent/20 overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${stockPercent}%` }} />
                </div>
              </div>
            )}
            <div className="mt-8">
              <Button size="lg" className="text-lg px-10 py-7 rounded-xl shadow-2xl hover:shadow-xl transition-all font-bold bg-gradient-to-r from-primary to-accent text-white hover:opacity-90" onClick={scrollToOrder}>
                {page.cta_text} →
              </Button>
            </div>
          </div>
        </section>

        {/* ═══ STAGE 2: INTEREST ═══ Social Proof Icons + Numbered Benefits */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3 shadow-md">
                <Users className="h-5 w-5 text-primary" />
                <div><span className="font-extrabold text-lg">৫০০+</span><span className="text-xs text-muted-foreground ml-1">সন্তুষ্ট গ্রাহক</span></div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3 shadow-md">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <div><span className="font-extrabold text-lg">৪.৮</span><span className="text-xs text-muted-foreground ml-1">রেটিং</span></div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-5 py-3 shadow-md">
                <Award className="h-5 w-5 text-accent" />
                <div><span className="font-extrabold text-lg">#১</span><span className="text-xs text-muted-foreground ml-1">বেস্টসেলার</span></div>
              </div>
            </div>
          </div>
        </section>

        {benefits.length > 0 && benefits[0].title && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-display text-3xl md:text-4xl font-extrabold mb-4">কেন এটি আপনার জন্য?</h2>
              <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">এই প্রোডাক্টটি আপনার জীবনে যে পরিবর্তন আনবে</p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {benefits.filter(b => b.title).map((b, i) => (
                  <div key={i} className="group relative rounded-2xl p-[2px] bg-gradient-to-br from-primary/40 to-accent/40 hover:from-primary hover:to-accent transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1">
                    <div className="rounded-2xl bg-card p-7 h-full">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-extrabold text-lg shadow-md mb-4">
                        {i + 1}
                      </div>
                      <h3 className="font-bold text-xl">{b.title}</h3>
                      {b.description && <p className="mt-3 text-muted-foreground leading-relaxed">{b.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Mid-CTA */}
        <section className="py-12 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-lg font-semibold mb-4">
              <Zap className="inline h-5 w-5 text-accent mr-1" /> আজই অর্ডার করুন এবং বিশেষ ছাড় পান
            </p>
            <Button size="lg" className="px-10 py-6 rounded-xl shadow-xl font-bold bg-gradient-to-r from-primary to-accent text-white hover:opacity-90" onClick={scrollToOrder}>
              {page.cta_text} →
            </Button>
          </div>
        </section>

        {/* ═══ STAGE 3: DESIRE ═══ Media Gallery (separated) + Verified Reviews */}
        {renderMediaGallery(
          "py-16 md:py-20 bg-muted/30",
          "container mx-auto px-4 max-w-4xl",
          "rounded-2xl overflow-hidden shadow-xl ring-1 ring-border",
          "rounded-2xl overflow-hidden shadow-xl ring-1 ring-border",
          "p-4 text-sm text-center text-muted-foreground bg-card"
        )}

        {reviews.length > 0 && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-center font-display text-3xl md:text-4xl font-extrabold mb-12">গ্রাহকরা কী বলছেন</h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}</div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          <CheckCircle className="h-3 w-3" /> ভেরিফাইড
                        </span>
                      </div>
                      <p className="leading-relaxed mb-4">"{r.comment}"</p>
                      <div className="flex items-center gap-3">
                        {r.image_url ? (
                          <img src={r.image_url} alt={r.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">{r.name.charAt(0)}</div>
                        )}
                        <span className="font-semibold">{r.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ STAGE 4: ACTION ═══ Trust Signals + Order Form */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-card border border-border p-4 shadow-sm text-center">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">নিরাপদ পেমেন্ট</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-card border border-border p-4 shadow-sm text-center">
                <Truck className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">দ্রুত ডেলিভারি</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl bg-card border border-border p-4 shadow-sm text-center">
                <Award className="h-6 w-6 text-accent" />
                <span className="text-xs font-semibold">১০০% গ্যারান্টি</span>
              </div>
            </div>
          </div>
        </section>

        <section id="lp-order-form" className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-extrabold px-6 py-1.5 shadow-xl">
                🏆 সর্বাধিক বিক্রিত
              </div>
              <div className="rounded-2xl p-[2px] bg-gradient-to-br from-primary/40 to-accent/40 shadow-2xl">
                <div className="rounded-2xl bg-card p-8 md:p-10">
                  <h2 className="text-center font-display text-2xl font-extrabold mb-2 mt-2">
                    <ShoppingBag className="inline h-6 w-6 mr-2" />{page.cta_text}
                  </h2>
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে" : "পেমেন্ট করে এখনই পান"}
                  </p>
                  {renderOrderFormContent()}
                  <Button type="submit" size="lg" className="w-full text-lg py-6 mt-6 rounded-xl shadow-xl font-bold bg-gradient-to-r from-primary to-accent text-white hover:opacity-90" disabled={submitting} onClick={handleOrder}>
                    {submitting ? "প্রসেস হচ্ছে..." : `${page.cta_text} →`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {faqs.length > 0 && faqs[0].question && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-center font-display text-3xl font-extrabold mb-10">সচরাচর জিজ্ঞাসা</h2>
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

        <section className="py-16 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold mb-6">{page.headline}</h2>
            <Button size="lg" className="text-lg px-12 py-7 rounded-xl shadow-2xl font-bold bg-gradient-to-r from-primary to-accent text-white hover:opacity-90" onClick={scrollToOrder}>
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
      {/* ═══ STAGE 1: ATTENTION ═══ Full-bleed hero with vignette */}
      <section className="relative overflow-hidden">
        {/* Background vignette from first hero image */}
        {heroImages.length > 0 && (
          <div className="absolute inset-0">
            <img src={heroImages[0]} alt="" className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/60 via-transparent to-zinc-950/60" />
          </div>
        )}
        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 rounded-full px-5 py-2 text-sm font-semibold text-amber-400 mb-8 tracking-wider uppercase animate-pulse">
              <Gem className="h-4 w-4" /> সীমিত সংস্করণ
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              {page.headline}
            </h1>
            {page.subheadline && (
              <p className="mt-6 text-xl text-zinc-400 max-w-2xl leading-relaxed">{page.subheadline}</p>
            )}
          </div>
        </div>

        {/* Hero Videos (sliding) */}
        {heroVideos.length > 0 && (
          <div className="container mx-auto px-4 relative z-10 pb-8 max-w-4xl">
            <AutoSlider
              items={heroVideos}
              renderItem={(url) => (
                <div className="aspect-video rounded-xl overflow-hidden ring-1 ring-zinc-800 shadow-2xl">
                  <iframe src={toEmbedUrl(url)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                </div>
              )}
            />
          </div>
        )}

        {/* Hero Images (sliding, below videos) */}
        {heroImages.length > 0 && (
          <div className="container mx-auto px-4 relative z-10 pb-16 max-w-4xl">
            <AutoSlider
              items={heroImages}
              renderItem={(url) => (
                <img src={url} alt={page.headline} className="rounded-xl w-full object-cover max-h-[500px] ring-1 ring-zinc-800 shadow-2xl" />
              )}
            />
          </div>
        )}

        {/* Pricing, Countdown, Stock Badge, CTA - below hero visuals */}
        <div className="container mx-auto px-4 relative z-10 pb-20">
          <div className="max-w-3xl">
            <div className="flex items-baseline gap-4">
              {product.price === 0 ? (
                <span className="text-4xl font-extrabold text-amber-400">ফ্রি</span>
              ) : (
                <>
                  <span className="text-5xl font-extrabold text-white">৳{product.price}</span>
                  {product.original_price && <span className="text-2xl text-zinc-500 line-through">৳{product.original_price}</span>}
                </>
              )}
            </div>
            <div className="mt-6 space-y-3">
              {page.show_countdown && !countdown.expired && (
                <div className="inline-flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-5 py-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
                  <span className="font-extrabold text-amber-300 tracking-wide text-lg">
                    {countdown.days > 0 && `${countdown.days}দিন `}{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                  </span>
                </div>
              )}
              {page.show_stock_badge && stockRemaining > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 px-5 py-3 shadow-[0_0_20px_rgba(239,68,68,0.15)] max-w-xs">
                  <Flame className="h-5 w-5 text-red-400 animate-pulse" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-red-300">মাত্র {stockRemaining}টি বাকি!</span>
                    <div className="w-full h-2 rounded-full bg-red-900/50 overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all shadow-[0_0_8px_rgba(239,68,68,0.5)]" style={{ width: `${stockPercent}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Button size="lg" className="mt-10 text-lg px-14 py-7 rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold tracking-wide shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all hover:shadow-[0_0_60px_rgba(245,158,11,0.4)]" onClick={scrollToOrder}>
              {page.cta_text} →
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ STAGE 2: INTEREST ═══ Gold border social proof + Benefits with gold dividers */}
      <section className="py-10 border-t border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-3">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">৫০০+ এক্সক্লুসিভ গ্রাহক</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-3">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">৪.৯/৫ রেটিং</span>
            </div>
          </div>
        </div>
      </section>

      {benefits.length > 0 && benefits[0].title && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-center text-sm font-semibold tracking-wide text-amber-400 mb-4">একচেটিয়া সুবিধা</h2>
            <p className="text-center text-zinc-500 mb-16 text-sm">শুধুমাত্র এক্সক্লুসিভ গ্রাহকদের জন্য</p>
            <div className="space-y-0">
              {benefits.filter(b => b.title).map((b, i) => (
                <div key={i} className="group">
                  <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                  <div className="flex items-start gap-6 py-8">
                    <span className="text-3xl font-extrabold text-zinc-700 group-hover:text-amber-500 transition-colors w-12 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-xl group-hover:text-amber-300 transition-colors">{b.title}</h3>
                      {b.description && <p className="mt-2 text-zinc-400 leading-relaxed">{b.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
              <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            </div>
          </div>
        </section>
      )}

      {/* Mid-CTA: Exclusive style */}
      <section className="py-14 bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900 border-y border-zinc-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-amber-400 text-sm tracking-wide font-semibold mb-4">সীমিত সময়ের অফার</p>
          <Button size="lg" className="px-12 py-7 rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold tracking-wide shadow-[0_0_40px_rgba(245,158,11,0.3)]" onClick={scrollToOrder}>
            {page.cta_text} →
          </Button>
        </div>
      </section>

      {/* ═══ STAGE 3: DESIRE ═══ Cinematic media (separated) + VIP Reviews */}
      {renderMediaGallery(
        "py-20 bg-zinc-900/50",
        "container mx-auto px-4 max-w-4xl",
        "rounded-lg overflow-hidden ring-1 ring-zinc-800 shadow-xl hover:ring-amber-500/30 transition-all",
        "rounded-lg overflow-hidden ring-1 ring-zinc-800 shadow-xl hover:ring-amber-500/30 transition-all",
        "p-4 text-sm text-center text-zinc-500 bg-zinc-900"
      )}

      {reviews.length > 0 && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-sm font-semibold tracking-wide text-amber-400 mb-4">VIP গ্রাহকদের অভিজ্ঞতা</h2>
            <p className="text-center text-zinc-500 mb-16 text-sm">যারা ইতিমধ্যে এক্সক্লুসিভ অভিজ্ঞতা নিয়েছেন</p>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              {reviews.map((r, i) => (
                <div key={i} className="border border-zinc-800 rounded-lg p-8 bg-zinc-900/50 relative hover:border-amber-500/30 transition-all">
                  <div className="absolute top-0 left-8 h-1 w-16 bg-gradient-to-r from-amber-500 to-amber-300" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
                    <span className="text-xs font-semibold text-amber-500/80 border border-amber-500/20 rounded-full px-2 py-0.5">VIP</span>
                  </div>
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

      {/* ═══ STAGE 4: ACTION ═══ "Last Chance" banner + Gold glow Order Form */}
      <section className="py-8 border-t border-zinc-800">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-6 py-3 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="font-bold text-red-300">শেষ সুযোগ — এই অফার আর নাও থাকতে পারে!</span>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <div className="inline-flex items-center gap-2 border border-amber-500/20 bg-amber-500/5 rounded-lg px-5 py-3">
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">এক্সক্লুসিভ গ্যারান্টি — ১০০% সন্তুষ্টি নিশ্চিত</span>
          </div>
        </div>
      </section>

      <section id="lp-order-form" className="py-20">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="rounded-lg border border-amber-500/20 bg-zinc-900 p-8 md:p-10 shadow-[0_0_60px_rgba(245,158,11,0.08)] relative">
            <div className="absolute -inset-px rounded-lg bg-gradient-to-br from-amber-500/20 via-transparent to-amber-500/10 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-center font-display text-2xl font-extrabold text-white mb-2">
                <ShoppingBag className="inline h-6 w-6 mr-2 text-amber-400" />{page.cta_text}
              </h2>
              <p className="text-center text-sm text-zinc-500 mb-6">
                {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে" : "পেমেন্ট করে এখনই পান"}
              </p>
              {renderOrderFormContent(
                "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500",
                "text-zinc-300",
                true
              )}
              <Button type="submit" size="lg" className="w-full text-lg py-6 mt-6 rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.3)]" disabled={submitting} onClick={handleOrder}>
                {submitting ? "প্রসেস হচ্ছে..." : `${page.cta_text} →`}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {faqs.length > 0 && faqs[0].question && (
        <section className="py-20 border-t border-zinc-800">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-center text-sm font-semibold tracking-wide text-amber-400 mb-12">সচরাচর জিজ্ঞাসা</h2>
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

      <section className="py-20 border-t border-zinc-800 bg-gradient-to-t from-zinc-900 to-zinc-950">
        <div className="container mx-auto px-4 text-center">
          <p className="text-amber-400 text-sm tracking-wide font-semibold mb-6">এখনই সিদ্ধান্ত নিন</p>
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

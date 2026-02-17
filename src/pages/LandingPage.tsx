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
import { Star, CheckCircle, Minus, Plus, ShoppingBag, ChevronDown } from "lucide-react";
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
  const shippingCost = isPhysical && activeZone ? (activeZone.free_shipping_minimum && unitPrice * quantity >= activeZone.free_shipping_minimum ? 0 : activeZone.shipping_rate) : 0;
  const totalPrice = unitPrice * quantity + shippingCost;

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
      supabase.functions.invoke("notify-order", { body: { orderId: data.order_id, orderData: { order_id: data.order_id, customer_name: order.name, customer_phone: order.phone, product_title: product.title, price: totalPrice, payment_method: paymentMethod, transaction_id: !isPhysical ? order.transactionId.trim() : null } } }).catch(() => {});
      setSuccessDialog({ open: true, orderId: data.order_id, message: isPhysical ? "আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে।" : "পেমেন্ট যাচাইয়ের পর আপনি কন্টেন্ট অ্যাক্সেস করতে পারবেন।" });
      setOrder({ name: "", phone: "", address: "", paymentMethod: mfsMethods[0]?.provider || "", transactionId: "" });
      setQuantity(1);
    }
  };

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

  const themeClasses = {
    classic: { bg: "bg-background", hero: "bg-gradient-to-br from-primary/5 to-primary/10", card: "bg-card" },
    bold: { bg: "bg-background", hero: "bg-gradient-to-br from-primary/20 to-accent/20", card: "bg-card" },
    minimal: { bg: "bg-background", hero: "bg-muted/30", card: "bg-card" },
  }[page.theme] || { bg: "bg-background", hero: "bg-primary/5", card: "bg-card" };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Hero Section */}
      <section className={`${themeClasses.hero} py-12 md:py-20`}>
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className={page.theme === "bold" ? "order-1" : ""}>
              <h1 className={`font-display font-bold text-foreground leading-tight ${page.theme === "bold" ? "text-4xl md:text-5xl lg:text-6xl" : "text-3xl md:text-4xl lg:text-5xl"}`}>
                {page.headline}
              </h1>
              {page.subheadline && (
                <p className={`mt-4 text-muted-foreground ${page.theme === "bold" ? "text-lg md:text-xl" : "text-base md:text-lg"}`}>
                  {page.subheadline}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3 items-center">
                <div className="flex items-baseline gap-3">
                  {product.price === 0 ? (
                    <span className="text-3xl font-bold text-green-600">ফ্রি</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">৳{product.price}</span>
                      {product.original_price && <span className="text-lg text-muted-foreground line-through">৳{product.original_price}</span>}
                    </>
                  )}
                </div>
              </div>
              <Button size="lg" className="mt-6 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all" style={ctaStyle} onClick={scrollToOrder}>
                {page.cta_text} →
              </Button>
            </div>
            <div className={page.theme === "bold" ? "order-0" : ""}>
              {page.hero_video_url ? (
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <iframe src={page.hero_video_url} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                </div>
              ) : page.hero_image_url ? (
                <img src={page.hero_image_url} alt={page.headline} className="rounded-2xl shadow-2xl w-full object-cover max-h-[500px]" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {benefits.length > 0 && benefits[0].title && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-foreground mb-10">কেন এটি আপনার জন্য?</h2>
            <div className={`grid gap-6 ${page.theme === "minimal" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {benefits.filter(b => b.title).map((b, i) => (
                <div key={i} className={`rounded-xl border border-border p-6 ${themeClasses.card} ${page.theme === "bold" ? "shadow-lg hover:shadow-xl transition-shadow" : "shadow-sm"}`}>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{b.title}</h3>
                      {b.description && <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button size="lg" style={ctaStyle} onClick={scrollToOrder}>{page.cta_text}</Button>
            </div>
          </div>
        </section>
      )}

      {/* Media Gallery */}
      {mediaItems.length > 0 && (
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className={`grid gap-4 ${mediaItems.length === 1 ? "max-w-2xl mx-auto" : "md:grid-cols-2"}`}>
              {mediaItems.map((m, i) => (
                <div key={i} className="rounded-xl overflow-hidden shadow-md">
                  {m.type === "video" ? (
                    <div className="aspect-video"><iframe src={m.url} className="w-full h-full" allowFullScreen /></div>
                  ) : (
                    <img src={m.url} alt={m.caption || ""} className="w-full object-cover" />
                  )}
                  {m.caption && <p className="p-3 text-sm text-center text-muted-foreground bg-card">{m.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-foreground mb-10">গ্রাহকরা কী বলছেন</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r, i) => (
                <div key={i} className={`rounded-xl border border-border p-6 ${themeClasses.card} shadow-sm`}>
                  <div className="flex items-center gap-3 mb-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{r.name.charAt(0)}</div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{r.name}</p>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button size="lg" style={ctaStyle} onClick={scrollToOrder}>{page.cta_text}</Button>
            </div>
          </div>
        </section>
      )}

      {/* Order Form */}
      <section id="lp-order-form" className={`py-12 md:py-16 ${page.theme === "bold" ? "bg-gradient-to-br from-primary/5 to-accent/5" : "bg-muted/30"}`}>
        <div className="container mx-auto px-4 max-w-xl">
          <div className={`rounded-2xl border-2 border-primary/20 p-6 md:p-8 ${themeClasses.card} shadow-xl`}>
            <h2 className="text-center font-display text-2xl font-bold text-foreground mb-2">
              <ShoppingBag className="inline h-6 w-6 mr-2" />{page.cta_text}
            </h2>
            <p className="text-center text-sm text-muted-foreground mb-6">
              {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে" : "পেমেন্ট করে এখনই পান"}
            </p>

            {/* Quantity for physical */}
            {isPhysical && page.show_quantity && (
              <div className="flex items-center justify-center gap-4 mb-6 p-3 rounded-lg bg-muted/50">
                <Label className="text-sm font-medium">পরিমাণ:</Label>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                  <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
                </div>
                <span className="text-sm font-medium text-foreground">৳{unitPrice * quantity}</span>
              </div>
            )}

            <form onSubmit={handleOrder} className="space-y-4">
              <div>
                <Label>আপনার নাম *</Label>
                <Input className="mt-1" value={order.name} onChange={e => setOrder(o => ({ ...o, name: e.target.value }))} placeholder="পূর্ণ নাম" />
              </div>
              <div>
                <Label>মোবাইল নম্বর *</Label>
                <Input className="mt-1" value={order.phone} onChange={e => setOrder(o => ({ ...o, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
              </div>
              {isPhysical && (
                <div>
                  <Label>ডেলিভারি ঠিকানা *</Label>
                  <Textarea className="mt-1" rows={2} value={order.address} onChange={e => setOrder(o => ({ ...o, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" />
                </div>
              )}

              {/* Shipping zone for physical */}
              {isPhysical && shippingZones.length > 0 && (
                <div>
                  <Label>ডেলিভারি জোন *</Label>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {shippingZones.map(z => (
                        <SelectItem key={z.zone_name} value={z.zone_name}>
                          {z.zone_label} — ৳{z.shipping_rate} ({z.delivery_time_min}-{z.delivery_time_max} {z.delivery_time_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* MFS payment for digital */}
              {!isPhysical && mfsMethods.length > 0 && (
                <>
                  <div>
                    <Label>পেমেন্ট মেথড *</Label>
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
                      {selectedMfs.payment_instruction && <p className="text-muted-foreground">{selectedMfs.payment_instruction}</p>}
                    </div>
                  )}
                  <div>
                    <Label>Transaction ID *</Label>
                    <Input className="mt-1" value={order.transactionId} onChange={e => setOrder(o => ({ ...o, transactionId: e.target.value }))} placeholder="পেমেন্টের Transaction ID" />
                  </div>
                </>
              )}

              {/* Price summary */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                {quantity > 1 && <div className="flex justify-between text-sm"><span>মূল্য ({quantity}×৳{unitPrice})</span><span>৳{unitPrice * quantity}</span></div>}
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

      {/* FAQ */}
      {faqs.length > 0 && faqs[0].question && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-center font-display text-2xl md:text-3xl font-bold text-foreground mb-8">সচরাচর জিজ্ঞাসা</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.filter(f => f.question).map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left font-medium">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className={`py-12 ${themeClasses.hero}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{page.headline}</h2>
          <Button size="lg" className="text-lg px-10 py-6 shadow-xl" style={ctaStyle} onClick={scrollToOrder}>
            {page.cta_text} →
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        {settings.copyright_text || `© ${new Date().getFullYear()} ${settings.site_name}`}
      </footer>

      {successDialog && (
        <OrderSuccessDialog
          open={successDialog.open}
          orderId={successDialog.orderId}
          productTitle={product.title}
          message={successDialog.message}
          onClose={() => setSuccessDialog(null)}
        />
      )}
    </div>
  );
};

export default LandingPage;

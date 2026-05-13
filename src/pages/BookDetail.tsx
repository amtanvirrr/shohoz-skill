import { useParams, Link, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ShoppingBag, BookOpen, Clock, Eye } from "lucide-react";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "@/components/MetaPixelProvider";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";
import PaymentSelector from "@/components/PaymentSelector";
import SelectedItemSummary from "@/components/checkout/SelectedItemSummary";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const bdPhoneRegex = /^01[3-9]\d{8}$/;

const baseCustomerSchema = {
  name: z
    .string()
    .trim()
    .min(2, "নাম কমপক্ষে ২ অক্ষর হতে হবে")
    .max(100, "নাম ১০০ অক্ষরের বেশি হতে পারবে না"),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, "সঠিক বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)"),
  email: z
    .string()
    .trim()
    .max(255, "ইমেইল ২৫৫ অক্ষরের বেশি হতে পারবে না")
    .email("সঠিক ইমেইল ঠিকানা দিন")
    .or(z.literal("")),
};

const physicalSchema = z.object({
  ...baseCustomerSchema,
  address: z
    .string()
    .trim()
    .min(10, "সম্পূর্ণ ঠিকানা লিখুন (কমপক্ষে ১০ অক্ষর)")
    .max(500, "ঠিকানা ৫০০ অক্ষরের বেশি হতে পারবে না"),
});

const ebookSchema = z.object(baseCustomerSchema);

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string;
  category: string;
  book_type: string;
  demo_pdf_url: string | null;
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

const BookDetail = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const fromFeatured = searchParams.get("ref") === "featured";
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = usePixel();
  const [book, setBook] = useState<DbBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState({ name: "", phone: "", email: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    orderId: string;
    message?: string;
    isFree?: boolean;
    paymentMethod?: string;
  } | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const isPhysical = book?.book_type === "physical";
  const isEbook = book?.book_type === "ebook";

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      supabase.from("books").select("*").eq("slug", slug).maybeSingle(),
      supabase.from("shipping_zones").select("*").eq("is_active", true).order("sort_order"),
    ]).then(([bookRes, shippingRes]) => {
      const b = bookRes.data as DbBook | null;
      setBook(b);
      if (b) {
        trackEvent("ViewContent", {
          content_name: b.title,
          content_type: "book",
          content_ids: [b.id],
          value: b.price,
          currency: "BDT",
        });
      }
      const szData = (shippingRes.data as ShippingZone[]) || [];
      setShippingZones(szData);
      if (szData.length > 0) setSelectedZone(szData[0].zone_name);
      setLoading(false);
    });
  }, [slug]);

  // Check if user has purchased this book (for ebooks)
  useEffect(() => {
    if (!user || !book) return;
    supabase.from("orders")
      .select("status")
      .eq("user_id", user.id)
      .eq("product_id", book.id)
      .eq("product_type", "book")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrderStatus(data[0].status);
        }
      });
  }, [user, book]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!book) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">বইটি পাওয়া যায়নি</h2>
          <Button className="mt-4" asChild><Link to="/books">বইয়ের তালিকায় ফিরে যান</Link></Button>
        </div>
      </div>
    );
  }

  const activeZone = shippingZones.find(z => z.zone_name === selectedZone);
  const shippingCost = isPhysical && activeZone
    ? (activeZone.free_shipping_minimum && book.price >= activeZone.free_shipping_minimum ? 0 : activeZone.shipping_rate)
    : 0;
  const totalPrice = book.price + shippingCost;

  const validateCustomer = () => {
    const schema = isPhysical ? physicalSchema : ebookSchema;
    const result = schema.safeParse(order);
    const fieldErrors: Record<string, string> = {};
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
    }
    if (isPhysical && shippingZones.length > 0 && !selectedZone) {
      fieldErrors.zone = "শিপিং জোন সিলেক্ট করুন";
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      toast({
        title: "ফর্মে কিছু ভুল রয়েছে",
        description: "নিচে চিহ্নিত ফিল্ডগুলো ঠিক করুন।",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const setField = (k: keyof typeof order, v: string) => {
    setOrder((o) => ({ ...o, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const fieldClass = (k: string) =>
    cn("mt-1", errors[k] && "border-destructive focus-visible:ring-destructive/30");

  const FieldError = ({ name }: { name: string }) =>
    errors[name] ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        {errors[name]}
      </p>
    ) : null;

  const insertOrder = async (paymentMethod: string, transactionId: string | null) => {
    const notesText = isPhysical && activeZone ? `Shipping: ${activeZone.zone_label} (৳${shippingCost})` : null;
    const { data, error } = await supabase.from("orders").insert({
      customer_name: order.name,
      customer_phone: order.phone,
      customer_email: order.email || null,
      customer_address: isPhysical ? order.address : null,
      product_type: "book" as any,
      product_id: book.id,
      product_title: book.title,
      price: totalPrice,
      payment_method: paymentMethod as any,
      user_id: user?.id || null,
      transaction_id: transactionId,
      notes: notesText,
    }).select("order_id").single();

    if (error) {
      toast({ title: "অর্ডার ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
      return;
    }

    supabase.functions.invoke("notify-order", { body: { orderId: data.order_id } }).catch(() => {});
    trackEvent("Purchase", {
      content_name: book.title,
      content_type: "book",
      content_ids: [book.id],
      value: totalPrice,
      currency: "BDT",
      order_id: data.order_id,
    }, { em: order.email || undefined, ph: order.phone || undefined });
    // Personalized copy is computed inside OrderSuccessDialog from
    // paymentMethod + productType + deliveryText — don't pass `message`.
    setSuccessDialog({
      open: true,
      orderId: data.order_id,
      paymentMethod,
    });
    setOrder({ name: "", phone: "", email: "", address: "" });
    if (isEbook) setOrderStatus("pending");
  };

  const handleCodSubmit = async () => {
    if (!validateCustomer()) return;
    setSubmitting(true);
    await insertOrder("cod", null);
    setSubmitting(false);
  };

  const handleMfsSubmit = async (provider: string, txnId: string) => {
    if (!validateCustomer()) return;
    setSubmitting(true);
    await insertOrder(provider, txnId);
    setSubmitting(false);
  };

  return (
    <div className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <Link to="/books" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> বইয়ের তালিকায় ফিরে যান
        </Link>

        <div className="mt-4 grid gap-10 lg:grid-cols-2">
          <ScrollReveal>
            <div className="overflow-hidden rounded-xl glass-card flex items-center justify-center lg:max-h-[75vh]">
              {book.image_url && <img src={book.image_url} alt={book.title} className="w-full h-full object-contain" style={{ aspectRatio: '3/4' }} />}
            </div>
          </ScrollReveal>

          <div>
            <ScrollReveal direction="right" delay={100}>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  <BookOpen className="h-3.5 w-3.5" />
                  {book.category}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isEbook
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/15 text-accent"
                }`}>
                  {isEbook ? "📱 ইবুক" : "📦 ফিজিক্যাল বই"}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{book.title}</h1>
              <p className="mt-2 text-muted-foreground">লেখক: {book.author}</p>

              <div className="mt-4 flex items-baseline gap-3">
                {book.price === 0 ? (
                  <span className="text-3xl font-bold text-success">ফ্রি</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">৳{book.price}</span>
                    {book.original_price && <span className="text-lg text-muted-foreground line-through">৳{book.original_price}</span>}
                  </>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="mt-6 glass-card rounded-xl p-5 leading-relaxed text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground" dangerouslySetInnerHTML={{ __html: book.description }} />
            </ScrollReveal>

            {/* Demo Preview Button */}
            {book.demo_pdf_url && (
              <button
                onClick={() => setDemoOpen(true)}
                className="mt-5 group flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5 transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-110">
                  <Eye className="h-5 w-5" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-foreground">📖 ডেমো দেখুন</span>
                  <span className="block text-xs text-muted-foreground">অর্ডারের আগে বইটির কিছু পৃষ্ঠা পড়ে দেখুন</span>
                </span>
                <ArrowLeft className="ml-auto h-4 w-4 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>
            )}

            <ScrollReveal delay={300}>
            <div id="order-form" className="mt-8 scroll-mt-20 md:scroll-mt-28">
            {isEbook && orderStatus && ["confirmed", "delivered"].includes(orderStatus) ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-success" /> আপনি এই বইটি কিনেছেন
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">পেমেন্ট ভেরিফাইড — আপনার কেনা ইবুকটি এখনই পড়ুন।</p>
                <Button size="lg" className="mt-4 w-full" asChild>
                  <Link to={`/read/${book.id}`}>পড়ুন →</Link>
                </Button>
              </div>
            ) : isEbook && orderStatus === "pending" ? (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <Clock className="h-5 w-5 text-warning" /> পেমেন্ট যাচাই অপেক্ষমাণ
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  আপনার অর্ডারটি সফলভাবে জমা হয়েছে। অ্যাডমিন পেমেন্ট যাচাই করার পর আপনি বইটি পড়তে পারবেন (সাধারণত ১-৩ ঘণ্টা)।
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to="/dashboard">আমার অর্ডার দেখুন</Link>
                  </Button>
                </div>
              </div>
            ) : book.price === 0 ? (
              <div className="rounded-xl glass-card p-6">
                <SelectedItemSummary
                  title={book.title}
                  id={book.id}
                  type={isEbook ? "ebook" : "book"}
                  imageUrl={(book as any).cover_image_url}
                  price={book.price}
                  fromFeatured={fromFeatured}
                />
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <ShoppingBag className="h-5 w-5 text-primary" /> ফ্রি বই
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">এই বইটি সম্পূর্ণ ফ্রি! একটি ক্লিকেই পেয়ে যান।</p>
                <Button
                  size="lg"
                  className="mt-5 w-full"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    const { data, error } = await supabase.from("orders").insert({
                      customer_name: user?.user_metadata?.full_name || "Free User",
                      customer_phone: user?.user_metadata?.phone || "",
                      customer_email: user?.email || null,
                      product_type: "book" as any,
                      product_id: book.id,
                      product_title: book.title,
                      price: 0,
                      payment_method: "cod" as any,
                      user_id: user?.id || null,
                      status: "confirmed" as any,
                      payment_verified: true,
                      notes: "Free product - auto confirmed",
                    }).select("order_id").single();
                    setSubmitting(false);
                    if (error) {
                      toast({ title: "ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
                    } else {
                      trackEvent("Purchase", {
                        content_name: book.title,
                        content_type: "book",
                        content_ids: [book.id],
                        value: 0,
                        currency: "BDT",
                        order_id: data.order_id,
                      });
                      setSuccessDialog({ open: true, orderId: data.order_id, isFree: true });
                      setOrderStatus("confirmed");
                    }
                  }}
                >
                  {submitting ? "প্রসেস হচ্ছে..." : "ফ্রিতে নিন"}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl glass-card p-6 glow-hover">
                <SelectedItemSummary
                  title={book.title}
                  id={book.id}
                  type={isEbook ? "ebook" : "book"}
                  imageUrl={(book as any).cover_image_url}
                  price={book.price}
                  fromFeatured={fromFeatured}
                />
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <ShoppingBag className="h-5 w-5 text-primary" /> {isPhysical ? "এখনই অর্ডার করুন" : "এখনই কিনুন"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPhysical ? "ক্যাশ অন ডেলিভারি — সারা বাংলাদেশে ডেলিভারি" : "বিকাশ / নগদ পেমেন্টে ইবুক পান"}
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <Label htmlFor="fullname">পূর্ণ নাম *</Label>
                    <Input id="fullname" maxLength={100} value={order.name} onChange={(e) => setField("name", e.target.value)} className={fieldClass("name")} aria-invalid={!!errors.name} />
                    <FieldError name="name" />
                  </div>
                  <div>
                    <Label htmlFor="phone">ফোন নম্বর *</Label>
                    <Input id="phone" inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" value={order.phone} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))} className={fieldClass("phone")} aria-invalid={!!errors.phone} />
                    <FieldError name="phone" />
                  </div>
                  <div>
                    <Label htmlFor="email">ইমেইল (ঐচ্ছিক)</Label>
                    <Input id="email" type="email" maxLength={255} value={order.email} onChange={(e) => setField("email", e.target.value)} className={fieldClass("email")} aria-invalid={!!errors.email} />
                    <FieldError name="email" />
                  </div>
                  {isPhysical && (
                    <div>
                      <Label htmlFor="address">সম্পূর্ণ ঠিকানা *</Label>
                      <Textarea id="address" rows={3} maxLength={500} value={order.address} onChange={(e) => setField("address", e.target.value)} className={fieldClass("address")} aria-invalid={!!errors.address} />
                      <FieldError name="address" />
                    </div>
                  )}

                  {/* Shipping Zone Selector for physical books */}
                  {isPhysical && shippingZones.length > 0 && (
                    <div className="space-y-2">
                      <Label>ডেলিভারি জোন *</Label>
                      <div className="flex flex-wrap gap-3">
                        {shippingZones.map((z) => (
                          <Button
                            key={z.id}
                            type="button"
                            variant={selectedZone === z.zone_name ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => { setSelectedZone(z.zone_name); if (errors.zone) setErrors((e) => { const n = { ...e }; delete n.zone; return n; }); }}
                          >
                            {z.zone_label}
                          </Button>
                        ))}
                      </div>
                      <FieldError name="zone" />
                      {activeZone && (
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">শিপিং চার্জ:</span>
                            {shippingCost === 0 ? (
                              <span className="font-medium text-success">ফ্রি শিপিং ✅</span>
                            ) : (
                              <span className="font-medium text-foreground">৳{shippingCost}</span>
                            )}
                          </div>
                          {activeZone.free_shipping_minimum && shippingCost > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ৳{activeZone.free_shipping_minimum}+ অর্ডারে ফ্রি শিপিং
                            </p>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ডেলিভারি সময়:</span>
                            <span className="font-medium text-foreground">
                              {activeZone.delivery_time_min}-{activeZone.delivery_time_max}{" "}
                              {activeZone.delivery_time_unit === "days" ? "দিন" : activeZone.delivery_time_unit === "hours" ? "ঘণ্টা" : "সপ্তাহ"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Summary for physical */}
                  {isPhysical && (
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">বইয়ের মূল্য:</span>
                        <span className="font-medium text-foreground">৳{book.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">শিপিং:</span>
                        <span className={`font-medium ${shippingCost === 0 ? "text-success" : "text-foreground"}`}>
                          {shippingCost === 0 ? "ফ্রি" : `৳${shippingCost}`}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold text-foreground">সর্বমোট:</span>
                        <span className="text-lg font-bold text-primary">৳{totalPrice}</span>
                      </div>
              </div>
            )}

                  <PaymentSelector
                    productType="book"
                    productId={book.id}
                    productTitle={book.title}
                    price={totalPrice}
                    customerName={order.name}
                    customerPhone={order.phone}
                    customerEmail={order.email}
                    customerAddress={isPhysical ? order.address : undefined}
                    requireCustomerFields={isPhysical}
                    showCod={isPhysical}
                    showMfs={!isPhysical}
                    onMfsSubmit={handleMfsSubmit}
                    onCodSubmit={handleCodSubmit}
                    validateBeforeSubmit={validateCustomer}
                    submitting={submitting}
                  />
                </div>
              </div>
            )}
            </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
      {successDialog && book && (
        <OrderSuccessDialog
          open={successDialog.open}
          onClose={() => setSuccessDialog(null)}
          orderId={successDialog.orderId}
          productTitle={book.title}
          message={successDialog.message}
          isFree={successDialog.isFree}
          paymentMethod={successDialog.paymentMethod}
          productType={isEbook ? "ebook" : "book"}
          deliveryText={
            isPhysical && activeZone
              ? `${activeZone.delivery_time_min}-${activeZone.delivery_time_max} ${
                  activeZone.delivery_time_unit === "days"
                    ? "কর্মদিবস"
                    : activeZone.delivery_time_unit === "hours"
                      ? "ঘণ্টা"
                      : "সপ্তাহ"
                }`
              : undefined
          }
        />
      )}
      {/* Demo PDF Modal */}
      {book?.demo_pdf_url && (
        <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
          <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle>📖 ডেমো প্রিভিউ — {book.title}</DialogTitle>
              <DialogDescription>অর্ডার করার আগে বইটির কিছু পৃষ্ঠা দেখে নিন।</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden px-4 pb-4">
              <iframe
                src={book.demo_pdf_url}
                title={`${book.title} - Demo Preview`}
                className="h-full w-full rounded-lg border border-border"
                style={{ border: "none", minHeight: "calc(85vh - 100px)" }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BookDetail;

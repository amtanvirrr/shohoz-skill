import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ShoppingBag, Smartphone, BookOpen, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePixel } from "@/components/MetaPixelProvider";

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

const BookDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = usePixel();
  const [book, setBook] = useState<DbBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState({ name: "", phone: "", email: "", address: "", paymentMethod: "bkash", transactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [mfsMethods, setMfsMethods] = useState<MfsMethod[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const isPhysical = book?.book_type === "physical";
  const isEbook = book?.book_type === "ebook";

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("books").select("*").eq("id", id).maybeSingle(),
      supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("shipping_zones").select("*").eq("is_active", true).order("sort_order"),
    ]).then(([bookRes, mfsRes, shippingRes]) => {
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
      const mfsData = (mfsRes.data as MfsMethod[]) || [];
      setMfsMethods(mfsData);
      if (mfsData.length > 0) setOrder(o => ({ ...o, paymentMethod: mfsData[0].provider }));
      const szData = (shippingRes.data as ShippingZone[]) || [];
      setShippingZones(szData);
      if (szData.length > 0) setSelectedZone(szData[0].zone_name);
      setLoading(false);
    });
  }, [id]);

  // Check if user has purchased this book (for ebooks)
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("orders")
      .select("status")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .eq("product_type", "book")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrderStatus(data[0].status);
        }
      });
  }, [user, id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!book) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Book not found</h2>
          <Button className="mt-4" asChild><Link to="/books">Back to Books</Link></Button>
        </div>
      </div>
    );
  }

  const activeZone = shippingZones.find(z => z.zone_name === selectedZone);
  const shippingCost = isPhysical && activeZone
    ? (activeZone.free_shipping_minimum && book.price >= activeZone.free_shipping_minimum ? 0 : activeZone.shipping_rate)
    : 0;
  const totalPrice = book.price + shippingCost;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.name || !order.phone) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (isPhysical && !order.address) {
      toast({ title: "Please enter your delivery address", variant: "destructive" });
      return;
    }
    if (isPhysical && !selectedZone) {
      toast({ title: "শিপিং জোন সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    if (!isPhysical && !order.transactionId.trim()) {
      toast({ title: "Transaction ID দিন", description: "পেমেন্ট করার পর Transaction ID লিখুন", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const paymentMethod = isPhysical ? "cod" : order.paymentMethod;
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
      transaction_id: !isPhysical ? order.transactionId.trim() : null,
      notes: notesText,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Order failed", description: error.message, variant: "destructive" });
    } else {
      // Send admin notification email (fire-and-forget)
      supabase.functions.invoke("notify-order", {
        body: {
          orderId: data.order_id,
          orderData: {
            order_id: data.order_id,
            customer_name: order.name,
            customer_phone: order.phone,
            customer_email: order.email || null,
            customer_address: isPhysical ? order.address : null,
            product_title: book.title,
            product_type: "book",
            price: totalPrice,
            payment_method: isPhysical ? "cod" : order.paymentMethod,
            transaction_id: !isPhysical ? order.transactionId.trim() : null,
            notes: isPhysical && activeZone ? `Shipping: ${activeZone.zone_label} (৳${shippingCost})` : null,
          },
        },
      }).catch(() => {});

      trackEvent("Purchase", {
        content_name: book.title,
        content_type: "book",
        content_ids: [book.id],
        value: totalPrice,
        currency: "BDT",
        order_id: data.order_id,
      }, { em: order.email || undefined, ph: order.phone || undefined });
      toast({ title: "Order Placed! 🎉", description: `Your Order ID: ${data.order_id}` });
      setOrder({ name: "", phone: "", email: "", address: "", paymentMethod: "bkash", transactionId: "" });
      if (isEbook) setOrderStatus("pending");
    }
  };

  return (
    <div className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <Link to="/books" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Books
        </Link>

        <div className="mt-4 grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {book.image_url && <img src={book.image_url} alt={book.title} className="h-full max-h-[500px] w-full object-cover" />}
          </div>

          <div>
            <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
            <h1 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{book.title}</h1>
            <p className="mt-2 text-muted-foreground">by {book.author}</p>

            <div className="mt-4 flex items-baseline gap-3">
              {book.price === 0 ? (
                <span className="text-3xl font-bold text-green-600">ফ্রি</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-foreground">৳{book.price}</span>
                  {book.original_price && <span className="text-lg text-muted-foreground line-through">৳{book.original_price}</span>}
                </>
              )}
            </div>

            <p className="mt-6 leading-relaxed text-muted-foreground">{book.description}</p>

            {/* Already purchased ebook - show read button */}
            {isEbook && orderStatus && ["confirmed", "delivered"].includes(orderStatus) ? (
              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <BookOpen className="h-5 w-5 text-primary" /> আপনি এই বইটি কিনেছেন
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনার কেনা ইবুকটি পড়তে নিচের বাটনে ক্লিক করুন।</p>
                <Button size="lg" className="mt-4 w-full" asChild>
                  <Link to={`/read/${book.id}`}>পড়ুন →</Link>
                </Button>
              </div>
            ) : isEbook && orderStatus === "pending" ? (
              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <Clock className="h-5 w-5 text-yellow-500" /> পেমেন্ট যাচাই অপেক্ষমাণ
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  আপনার অর্ডারটি সফলভাবে জমা হয়েছে। অ্যাডমিন পেমেন্ট যাচাই করার পর আপনি বইটি পড়তে পারবেন।
                </p>
                <div className="mt-3 rounded-lg bg-yellow-500/10 p-3 text-center text-sm font-medium text-yellow-600">
                  ⏳ অপেক্ষমাণ
                </div>
              </div>
            ) : book.price === 0 ? (
              <div className="mt-8 rounded-xl border border-border bg-card p-6">
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
                      toast({ title: "Failed", description: error.message, variant: "destructive" });
                    } else {
                      trackEvent("Purchase", {
                        content_name: book.title,
                        content_type: "book",
                        content_ids: [book.id],
                        value: 0,
                        currency: "BDT",
                        order_id: data.order_id,
                      });
                      toast({ title: "সফলভাবে সম্পন্ন! 🎉", description: `আপনার অর্ডার ID: ${data.order_id}` });
                      setOrderStatus("confirmed");
                    }
                  }}
                >
                  {submitting ? "Processing..." : "ফ্রিতে নিন"}
                </Button>
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <ShoppingBag className="h-5 w-5 text-primary" /> {isPhysical ? "Order Now" : "Buy Now"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPhysical ? "Cash on Delivery — সারা বাংলাদেশে ডেলিভারি" : "বিকাশ / নগদ পেমেন্টে ইবুক পান"}
                </p>

                <form onSubmit={handleOrder} className="mt-5 space-y-4">
                  <div><Label htmlFor="fullname">Full Name *</Label><Input id="fullname" value={order.name} onChange={(e) => setOrder({ ...order, name: e.target.value })} className="mt-1" /></div>
                  <div><Label htmlFor="phone">Phone Number *</Label><Input id="phone" value={order.phone} onChange={(e) => setOrder({ ...order, phone: e.target.value })} className="mt-1" /></div>
                  <div><Label htmlFor="email">Email (optional)</Label><Input id="email" type="email" value={order.email} onChange={(e) => setOrder({ ...order, email: e.target.value })} className="mt-1" /></div>
                  {isPhysical && (
                    <div><Label htmlFor="address">Full Address *</Label><Textarea id="address" rows={3} value={order.address} onChange={(e) => setOrder({ ...order, address: e.target.value })} className="mt-1" /></div>
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
                            onClick={() => setSelectedZone(z.zone_name)}
                          >
                            {z.zone_label}
                          </Button>
                        ))}
                      </div>
                      {activeZone && (
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">শিপিং চার্জ:</span>
                            {shippingCost === 0 ? (
                              <span className="font-medium text-green-600">ফ্রি শিপিং ✅</span>
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

                  {isPhysical ? (
                    <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">💵 Payment: <span className="font-medium text-foreground">Cash on Delivery</span></div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Payment Method *</Label>
                      <div className="flex flex-wrap gap-3">
                        {mfsMethods.length > 0 ? mfsMethods.map((m) => (
                          <Button key={m.id} type="button" variant={order.paymentMethod === m.provider ? "default" : "outline"} className="flex-1" onClick={() => setOrder({ ...order, paymentMethod: m.provider })}>
                            {m.display_name || m.provider}
                          </Button>
                        )) : (
                          <>
                            <Button type="button" variant={order.paymentMethod === "bkash" ? "default" : "outline"} className="flex-1" onClick={() => setOrder({ ...order, paymentMethod: "bkash" })}>বিকাশ</Button>
                            <Button type="button" variant={order.paymentMethod === "nagad" ? "default" : "outline"} className="flex-1" onClick={() => setOrder({ ...order, paymentMethod: "nagad" })}>নগদ</Button>
                          </>
                        )}
                      </div>

                      {/* Show selected MFS payment details */}
                      {(() => {
                        const selected = mfsMethods.find(m => m.provider === order.paymentMethod);
                        if (!selected) return null;
                        return (
                          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Smartphone className="h-4 w-4 text-primary" />
                              <span className="font-medium text-foreground">{selected.phone_number}</span>
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">{selected.mfs_type}</span>
                            </div>
                            {selected.qr_code_url && (
                              <img src={selected.qr_code_url} alt="QR Code" className="mx-auto h-32 w-32 rounded-lg border border-border object-contain" />
                            )}
                            {selected.payment_instruction && (
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.payment_instruction}</p>
                            )}
                            {selected.process_message && (
                              <div className="rounded-md bg-primary/5 p-3 text-xs text-foreground whitespace-pre-line">{selected.process_message}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Transaction ID field for digital payments */}
                  {!isPhysical && (
                    <div>
                      <Label htmlFor="txnId">Transaction ID *</Label>
                      <Input id="txnId" value={order.transactionId} onChange={(e) => setOrder({ ...order, transactionId: e.target.value })} className="mt-1" placeholder="যেমন: TXN1234ABCD" />
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
                        <span className={`font-medium ${shippingCost === 0 ? "text-green-600" : "text-foreground"}`}>
                          {shippingCost === 0 ? "ফ্রি" : `৳${shippingCost}`}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold text-foreground">সর্বমোট:</span>
                        <span className="text-lg font-bold text-primary">৳{totalPrice}</span>
                      </div>
              </div>
            )}

                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Placing Order..." : isPhysical ? `Place Order — ৳${totalPrice}` : "Buy Now"}</Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;

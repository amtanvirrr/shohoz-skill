import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string;
  category: string;
}

const BookDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [book, setBook] = useState<DbBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState({ name: "", phone: "", email: "", address: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("books").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setBook(data as DbBook | null);
      setLoading(false);
    });
  }, [id]);

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

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.name || !order.phone || !order.address) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: order.name,
      customer_phone: order.phone,
      customer_email: order.email || null,
      customer_address: order.address,
      product_type: "book" as any,
      product_id: book.id,
      product_title: book.title,
      price: book.price,
      payment_method: "cod" as any,
      user_id: user?.id || null,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Order failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order Placed! 🎉", description: `Your Order ID: ${data.order_id}` });
      setOrder({ name: "", phone: "", email: "", address: "" });
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
              <span className="text-3xl font-bold text-foreground">৳{book.price}</span>
              {book.original_price && <span className="text-lg text-muted-foreground line-through">৳{book.original_price}</span>}
            </div>

            <p className="mt-6 leading-relaxed text-muted-foreground">{book.description}</p>

            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <ShoppingBag className="h-5 w-5 text-primary" /> Order Now
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Cash on Delivery — সারা বাংলাদেশে ডেলিভারি</p>

              <form onSubmit={handleOrder} className="mt-5 space-y-4">
                <div><Label htmlFor="fullname">Full Name *</Label><Input id="fullname" value={order.name} onChange={(e) => setOrder({ ...order, name: e.target.value })} className="mt-1" /></div>
                <div><Label htmlFor="phone">Phone Number *</Label><Input id="phone" value={order.phone} onChange={(e) => setOrder({ ...order, phone: e.target.value })} className="mt-1" /></div>
                <div><Label htmlFor="email">Email (optional)</Label><Input id="email" type="email" value={order.email} onChange={(e) => setOrder({ ...order, email: e.target.value })} className="mt-1" /></div>
                <div><Label htmlFor="address">Full Address *</Label><Textarea id="address" rows={3} value={order.address} onChange={(e) => setOrder({ ...order, address: e.target.value })} className="mt-1" /></div>
                <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">💵 Payment: <span className="font-medium text-foreground">Cash on Delivery</span></div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Placing Order..." : "Place Order"}</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;

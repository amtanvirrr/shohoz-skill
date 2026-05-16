import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Clock, Package, Truck, BookOpen } from "lucide-react";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import EmptyState from "@/components/EmptyState";
import { statusPillClass } from "@/lib/cardStyles";
import BookCard from "@/components/cards/BookCard";

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  book_type: string;
}

interface OrderInfo {
  total: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
}

const BooksPage = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<DbBook[]>([]);
  const [orderMap, setOrderMap] = useState<Record<string, OrderInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("books").select("*").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => {
      setBooks(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("product_id, status")
      .eq("user_id", user.id)
      .eq("product_type", "book")
      .not("status", "eq", "cancelled")
      .then(({ data }) => {
        const map: Record<string, OrderInfo> = {};
        (data || []).forEach((o: any) => {
          if (!map[o.product_id]) {
            map[o.product_id] = { total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0 };
          }
          map[o.product_id].total++;
          if (o.status === "pending") map[o.product_id].pending++;
          else if (o.status === "confirmed") map[o.product_id].confirmed++;
          else if (o.status === "shipped") map[o.product_id].shipped++;
          else if (o.status === "delivered") map[o.product_id].delivered++;
        });
        setOrderMap(map);
      });
  }, [user]);

  const renderBadge = (book: DbBook) => {
    const info = orderMap[book.id];
    if (!info) return null;
    const isDigital = book.book_type === "ebook";
    if (isDigital) {
      const hasConfirmed = info.confirmed > 0 || info.delivered > 0;
      return (
        <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          hasConfirmed
            ? "bg-success/15 text-success"
            : "bg-warning/15 text-warning"
        }`}>
          {hasConfirmed ? <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</> : <><Clock className="h-3 w-3" /> পেন্ডিং</>}
        </div>
      );
    }
    return (
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>{info.total} বার কেনা হয়েছে</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {info.delivered > 0 && <span className={statusPillClass("success")}><CheckCircle className="h-2.5 w-2.5" /> {info.delivered} ডেলিভারি</span>}
            {info.shipped > 0 && <span className={statusPillClass("primary")}><Truck className="h-2.5 w-2.5" /> {info.shipped} শিপড</span>}
            {info.confirmed > 0 && <span className={statusPillClass("success")}><CheckCircle className="h-2.5 w-2.5" /> {info.confirmed} কনফার্মড</span>}
            {info.pending > 0 && <span className={statusPillClass("warning")}><Clock className="h-2.5 w-2.5" /> {info.pending} পেন্ডিং</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="section-kicker mb-3" style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
            <BookOpen className="h-3.5 w-3.5" />
            বই
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">সকল বই</h1>
          <p className="mt-2 text-muted-foreground">
            আমাদের সকল বই ব্রাউজ করুন{" "}
            {!loading && books.length > 0 && (
              <span className="ml-1 font-medium text-foreground">({books.length} টি)</span>
            )}
          </p>
        </ScrollReveal>

        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProductCardSkeleton aspect="portrait" count={6} />
          </div>
        ) : books.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={BookOpen}
              title="এখনো কোন বই নেই"
              description="শীঘ্রই নতুন বই যোগ করা হবে। ফিরে এসে আবার দেখুন।"
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book, idx) => (
              <ScrollReveal key={book.id} delay={idx * 80}>
                <BookCard book={book} variant="compact" badge={renderBadge(book)} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;

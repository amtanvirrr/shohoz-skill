import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Clock, Package, Truck } from "lucide-react";

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

  useEffect(() => {
    supabase.from("books").select("*").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => setBooks(data || []));
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
      // For ebooks: simple badge like before
      const hasConfirmed = info.confirmed > 0 || info.delivered > 0;
      return (
        <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          hasConfirmed
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}>
          {hasConfirmed ? (
            <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</>
          ) : (
            <><Clock className="h-3 w-3" /> পেন্ডিং</>
          )}
        </div>
      );
    }

    // Physical books: detailed multi-order badge
    const parts: string[] = [];
    if (info.delivered > 0) parts.push(`${info.delivered} ডেলিভারি ✅`);
    if (info.shipped > 0) parts.push(`${info.shipped} শিপড 🚚`);
    if (info.confirmed > 0) parts.push(`${info.confirmed} কনফার্মড`);
    if (info.pending > 0) parts.push(`${info.pending} পেন্ডিং ⏳`);

    return (
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>{info.total} বার কেনা হয়েছে</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {info.delivered > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-2.5 w-2.5" /> {info.delivered} ডেলিভারি
              </span>
            )}
            {info.shipped > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Truck className="h-2.5 w-2.5" /> {info.shipped} শিপড
              </span>
            )}
            {info.confirmed > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle className="h-2.5 w-2.5" /> {info.confirmed} কনফার্মড
              </span>
            )}
            {info.pending > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Clock className="h-2.5 w-2.5" /> {info.pending} পেন্ডিং
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground">All Books</h1>
        <p className="mt-2 text-muted-foreground">আমাদের সকল বই ব্রাউজ করুন</p>

        {books.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">No books available yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link key={book.id} to={`/book/${book.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                {renderBadge(book)}
                {book.image_url && <div className="aspect-[3/4] overflow-hidden"><img src={book.image_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                <div className="p-5">
                  <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground">{book.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {book.price === 0 ? (
                      <>
                        <span className="text-lg font-bold text-green-600">ফ্রি</span>
                        {book.original_price && book.original_price > 0 && (
                          <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-foreground">৳{book.price}</span>
                        {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
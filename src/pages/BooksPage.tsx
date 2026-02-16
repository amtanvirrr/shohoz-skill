import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Clock } from "lucide-react";

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
}

const BooksPage = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<DbBook[]>([]);
  const [orderMap, setOrderMap] = useState<Record<string, string>>({});

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
        const map: Record<string, string> = {};
        (data || []).forEach((o: any) => {
          if (!map[o.product_id] || ["confirmed", "delivered"].includes(o.status)) {
            map[o.product_id] = o.status;
          }
        });
        setOrderMap(map);
      });
  }, [user]);

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground">All Books</h1>
        <p className="mt-2 text-muted-foreground">আমাদের সকল বই ব্রাউজ করুন</p>

        {books.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">No books available yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => {
              const status = orderMap[book.id];
              return (
                <Link key={book.id} to={`/book/${book.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {status && (
                    <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ["confirmed", "delivered"].includes(status)
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {["confirmed", "delivered"].includes(status) ? (
                        <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</>
                      ) : (
                        <><Clock className="h-3 w-3" /> পেন্ডিং</>
                      )}
                    </div>
                  )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
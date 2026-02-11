import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [books, setBooks] = useState<DbBook[]>([]);

  useEffect(() => {
    supabase.from("books").select("*").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => setBooks(data || []));
  }, []);

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
              <Link key={book.id} to={`/book/${book.id}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                {book.image_url && <div className="aspect-[3/4] overflow-hidden"><img src={book.image_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                <div className="p-5">
                  <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground">{book.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">৳{book.price}</span>
                    {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
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

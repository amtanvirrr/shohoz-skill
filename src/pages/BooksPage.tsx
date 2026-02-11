import { Link } from "react-router-dom";
import { books } from "@/data/mock-data";

const BooksPage = () => {
  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground">All Books</h1>
        <p className="mt-2 text-muted-foreground">আমাদের সকল বই ব্রাউজ করুন</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Link
              key={book.id}
              to={`/book/${book.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img src={book.image} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground">{book.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">৳{book.price}</span>
                  {book.originalPrice && <span className="text-sm text-muted-foreground line-through">৳{book.originalPrice}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BooksPage;

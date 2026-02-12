import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const EbookReader = () => {
  const { bookId } = useParams();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId || !user) return;

    const fetchEbook = async () => {
      // Fetch book title
      const { data: book } = await supabase
        .from("books")
        .select("title")
        .eq("id", bookId)
        .single();
      if (book) setBookTitle(book.title);

      // Get signed URL from edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-ebook?book_id=${bookId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "ইবুক লোড করা যায়নি");
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      // Append toolbar=0 to hide PDF download/print toolbar
      setPdfUrl(url + "#toolbar=0&navpanes=0");
      setLoading(false);
    };

    fetchEbook();
  }, [bookId, user]);

  // Prevent right-click context menu
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-xl font-bold text-foreground">{error}</h2>
          <Button className="mt-4" asChild>
            <Link to="/dashboard">ড্যাশবোর্ডে ফিরে যান</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" /> ড্যাশবোর্ড
          </Link>
        </Button>
        <span className="text-sm font-medium text-foreground truncate">{bookTitle}</span>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative select-none" onDragStart={(e) => e.preventDefault()}>
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={bookTitle}
            style={{ pointerEvents: "auto" }}
          />
        )}
        {/* Overlay to prevent easy save-as on the iframe */}
        <div className="absolute inset-0 pointer-events-none" />
      </div>
    </div>
  );
};

export default EbookReader;

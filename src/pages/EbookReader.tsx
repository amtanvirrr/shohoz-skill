import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Loader2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const EbookReader = () => {
  const { bookId } = useParams();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [basePdfUrl, setBasePdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPage, setLastPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bookId || !user) return;

    const fetchEbook = async () => {
      // Fetch book title & reading progress in parallel
      const [bookRes, progressRes, sessionRes] = await Promise.all([
        supabase.from("books").select("title").eq("id", bookId).single(),
        supabase.from("reading_progress").select("last_page").eq("user_id", user.id).eq("book_id", bookId).maybeSingle(),
        supabase.auth.getSession(),
      ]);

      if (bookRes.data) setBookTitle(bookRes.data.title);
      const savedPage = progressRes.data?.last_page || 1;
      setLastPage(savedPage);
      setPageInput(String(savedPage));

      const token = sessionRes.data?.session?.access_token;
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
      setBasePdfUrl(url);
      setPdfUrl(url + `#toolbar=0&navpanes=0&page=${savedPage}`);
      setLoading(false);
    };

    fetchEbook();
  }, [bookId, user]);

  const savePageProgress = useCallback(async () => {
    if (!bookId || !user) return;
    const page = parseInt(pageInput);
    if (isNaN(page) || page < 1) return;

    setSaving(true);
    const { error } = await supabase.from("reading_progress").upsert(
      { user_id: user.id, book_id: bookId, last_page: page, updated_at: new Date().toISOString() },
      { onConflict: "user_id,book_id" }
    );
    setSaving(false);

    if (error) {
      toast.error("পেজ সেভ করা যায়নি");
    } else {
      setLastPage(page);
      toast.success(`পেজ ${page} সেভ করা হয়েছে`);
      // Navigate PDF to saved page
      if (basePdfUrl) {
        setPdfUrl(basePdfUrl + `#toolbar=0&navpanes=0&page=${page}`);
      }
    }
  }, [bookId, user, pageInput, basePdfUrl]);

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
        <span className="text-sm font-medium text-foreground truncate flex-1">{bookTitle}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">পেজ:</span>
          <Input
            type="number"
            min={1}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-16 h-8 text-center text-sm"
            onKeyDown={(e) => e.key === "Enter" && savePageProgress()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={savePageProgress}
            disabled={saving}
            className="gap-1"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saving ? "সেভ হচ্ছে..." : "সেভ"}</span>
          </Button>
          {lastPage > 1 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (সর্বশেষ: পেজ {lastPage})
            </span>
          )}
        </div>
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

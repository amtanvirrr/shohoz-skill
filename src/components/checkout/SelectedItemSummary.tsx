import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  id: string;
  type: "book" | "course" | "ebook" | "quiz";
  imageUrl?: string | null;
  price?: number;
  fromFeatured?: boolean;
}

const TYPE_LABEL: Record<Props["type"], string> = {
  book: "📦 ফিজিক্যাল বই",
  ebook: "📱 ইবুক",
  course: "🎓 কোর্স",
  quiz: "📝 কুইজ",
};

/**
 * Compact summary chip rendered at the top of an order form so the user can
 * confirm exactly which book/course is being ordered. Auto-shows a "ফিচার্ড থেকে"
 * pill when arrived via the homepage featured section.
 */
const SelectedItemSummary = ({ title, id, type, imageUrl, price, fromFeatured }: Props) => {
  const shortId = id.slice(0, 8).toUpperCase();
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/[0.06] p-2.5 animate-fade-in">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-border"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
          {TYPE_LABEL[type].split(" ")[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-accent">
            {TYPE_LABEL[type]}
          </span>
          {fromFeatured && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
              <Sparkles className="h-2.5 w-2.5" /> ফিচার্ড
            </span>
          )}
        </div>
        <p className="truncate text-sm font-semibold text-foreground" title={title}>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground">
          আইডি: <span className="font-mono">{shortId}</span>
          {typeof price === "number" && price > 0 && (
            <> • <span className="font-semibold text-foreground">৳{price.toLocaleString()}</span></>
          )}
        </p>
      </div>
    </div>
  );
};

export default SelectedItemSummary;
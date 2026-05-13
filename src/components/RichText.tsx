import DOMPurify from "dompurify";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RichTextProps {
  /** Raw HTML or plain text from the database (e.g. course/book description). */
  content?: string | null;
  /** Optional extra classes appended to the prose wrapper. */
  className?: string;
}

const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "strong", "b", "em", "i", "u", "s", "del", "mark",
  "a", "blockquote", "code", "pre",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "sup", "sub",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "class", "id",
  "target", "rel", "width", "height", "style",
  "colspan", "rowspan",
];

/**
 * Detects whether a string contains HTML tags. Plain-text descriptions are
 * wrapped so newlines render as paragraph breaks instead of collapsing.
 */
const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*?>/i.test(s);

const plainTextToHtml = (s: string) =>
  s
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p>${block
          .trim()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");

/**
 * Safely render rich-text descriptions (TipTap output, pasted HTML, or plain
 * text) with consistent typography across the app. Sanitizes via DOMPurify
 * and applies Tailwind Typography (`prose`) styles tuned to the design system.
 */
const RichText = ({ content, className }: RichTextProps) => {
  const html = useMemo(() => {
    const raw = (content ?? "").trim();
    if (!raw) return "";
    const source = looksLikeHtml(raw) ? raw : plainTextToHtml(raw);
    return DOMPurify.sanitize(source, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    });
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={cn(
        "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
        // Headings
        "prose-headings:font-display prose-headings:text-foreground prose-headings:font-bold",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base",
        "prose-h2:mt-6 prose-h3:mt-5 prose-h2:mb-3 prose-h3:mb-2",
        // Body
        "prose-p:text-muted-foreground prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-em:text-foreground",
        // Lists
        "prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-muted-foreground",
        "prose-li:marker:text-primary",
        // Links
        "prose-a:text-primary prose-a:font-medium hover:prose-a:underline",
        // Quotes & code
        "prose-blockquote:border-l-primary prose-blockquote:text-foreground/80 prose-blockquote:not-italic",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-[''] prose-code:after:content-['']",
        "prose-pre:bg-muted prose-pre:text-foreground",
        // Media
        "prose-img:rounded-lg prose-img:my-4",
        "prose-hr:border-border",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichText;
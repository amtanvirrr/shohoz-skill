import { bylineClass } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";

interface BylineProps {
  /** Instructor / author / contributor value. Empty or whitespace renders the placeholder. */
  value?: string | null;
  /** Bengali fallback shown (italic, muted) when no value is present. */
  emptyText: string;
  /** Optional extra classes appended to the shared bylineClass output. */
  className?: string;
}

/**
 * Single source of truth for the instructor/author byline line on cards.
 * Guarantees identical font size, leading, margin, line-clamp and reserved
 * min-height across every page and the loading skeleton.
 */
const Byline = ({ value, emptyText, className }: BylineProps) => (
  <p className={cn(bylineClass(value), className)}>
    {value?.trim() || emptyText}
  </p>
);

export default Byline;

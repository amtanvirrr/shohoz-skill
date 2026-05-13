/**
 * Image prefetch helper.
 *
 * Inserts a `<link rel="prefetch" as="image">` into <head> for the given URL
 * so the browser warms its HTTP cache at low priority. When the user later
 * navigates to the detail page (which renders the same image), the asset is
 * served from cache and feels instant.
 *
 * - Deduplicates per URL across the session.
 * - No-op on the server / when document is unavailable.
 * - Safe to call repeatedly.
 */
const prefetched = new Set<string>();

export function prefetchImage(url?: string | null): void {
  if (!url) return;
  if (typeof document === "undefined") return;
  if (prefetched.has(url)) return;
  prefetched.add(url);

  try {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = url;
    // Hint to the browser this is a low-priority warm-up, not a render-blocking asset.
    link.setAttribute("fetchpriority", "low");
    document.head.appendChild(link);
  } catch {
    // Older browsers may reject `as="image"` on <link rel=prefetch>; fall back
    // to a hidden Image() preloader which still primes the cache.
    try {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
    } catch {
      /* ignore */
    }
  }
}

export function prefetchImages(urls: Array<string | null | undefined>): void {
  urls.forEach(prefetchImage);
}
import { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const FONT_MAP: Record<string, { body: string; display: string }> = {
  "sylheti-keteki": { body: "'Galada', cursive", display: "'Galada', cursive" },
  jami: { body: "'Hind Siliguri', sans-serif", display: "'Hind Siliguri', sans-serif" },
  mohan: { body: "'Noto Sans Bengali', sans-serif", display: "'Noto Sans Bengali', sans-serif" },
  rupali: { body: "'Tiro Bangla', serif", display: "'Tiro Bangla', serif" },
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSiteSettings();

  useEffect(() => {
    const fontKey = settings.site_font || "jami";
    const fonts = FONT_MAP[fontKey] || FONT_MAP.jami;
    document.documentElement.style.setProperty("--font-body", fonts.body);
    document.documentElement.style.setProperty("--font-display", fonts.display);
  }, [settings.site_font]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme_primary) {
      root.style.setProperty("--primary", settings.theme_primary);
      root.style.setProperty("--sidebar-primary", settings.theme_primary);
    }
    if (settings.theme_accent) {
      root.style.setProperty("--accent", settings.theme_accent);
    }
    if (settings.theme_highlight) {
      root.style.setProperty("--ring", settings.theme_highlight);
      root.style.setProperty("--sidebar-ring", settings.theme_highlight);
      root.style.setProperty("--highlight", settings.theme_highlight);
    }
  }, [settings.theme_primary, settings.theme_accent, settings.theme_highlight]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        মূল কনটেন্টে যান
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-20 md:pb-0 focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

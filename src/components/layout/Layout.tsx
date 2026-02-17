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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;

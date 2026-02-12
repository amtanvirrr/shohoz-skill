import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_name: string;
  site_description: string;
  copyright_text: string;
  logo_url: string;
  footer_logo_url: string;
  admin_logo_url: string;
  favicon_url: string;
}

const defaults: SiteSettings = {
  site_name: "ShikhonHub",
  site_description: "আপনার শেখার সেরা প্ল্যাটফর্ম। কোর্স, বই, এবং আরও অনেক কিছু এক জায়গায়।",
  copyright_text: "© 2026 ShikhonHub. All rights reserved.",
  logo_url: "/favicon.webp",
  footer_logo_url: "/favicon.webp",
  admin_logo_url: "/favicon.webp",
  favicon_url: "/favicon.webp",
};

const SETTING_KEYS = Object.keys(defaults) as (keyof SiteSettings)[];

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", SETTING_KEYS);

      if (data && data.length > 0) {
        const merged = { ...defaults };
        data.forEach((row) => {
          if (row.key in merged && row.value) {
            (merged as any)[row.key] = row.value;
          }
        });
        setSettings(merged);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  return { settings, loading };
};

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
  facebook_pixel_id: string;
  facebook_test_event_code: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

const defaults: SiteSettings = {
  site_name: "ShikhonHub",
  site_description: "আপনার শেখার সেরা প্ল্যাটফর্ম। কোর্স, বই, এবং আরও অনেক কিছু এক জায়গায়।",
  copyright_text: "© 2026 ShikhonHub. All rights reserved.",
  logo_url: "/favicon.webp",
  footer_logo_url: "/favicon.webp",
  admin_logo_url: "/favicon.webp",
  favicon_url: "/favicon.webp",
  facebook_pixel_id: "",
  facebook_test_event_code: "",
  contact_email: "info@shikhonhub.com",
  contact_phone: "+880 1XXX-XXXXXX",
  contact_address: "Dhaka, Bangladesh",
};

const SETTING_KEYS = Object.keys(defaults) as (keyof SiteSettings)[];

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await (supabase as any)
        .from("public_site_settings")
        .select("key, value")
        .in("key", SETTING_KEYS);

      if (data && data.length > 0) {
        const merged = { ...defaults };
        data.forEach((row: any) => {
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

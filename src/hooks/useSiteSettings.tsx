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
  newsletter_title: string;
  about_content: string;
  contact_page_title: string;
  contact_page_subtitle: string;
  homepage_courses_title: string;
  homepage_courses_subtitle: string;
  homepage_books_title: string;
  homepage_books_subtitle: string;
  homepage_reviews_title: string;
  homepage_reviews_subtitle: string;
  homepage_track_title: string;
  homepage_track_subtitle: string;
  featured_course_ids: string;
  featured_book_ids: string;
}

const defaults: SiteSettings = {
  site_name: "",
  site_description: "",
  copyright_text: "",
  logo_url: "/favicon.webp",
  footer_logo_url: "/favicon.webp",
  admin_logo_url: "/favicon.webp",
  favicon_url: "/favicon.webp",
  facebook_pixel_id: "",
  facebook_test_event_code: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  newsletter_title: "",
  about_content: "",
  contact_page_title: "",
  contact_page_subtitle: "",
  homepage_courses_title: "",
  homepage_courses_subtitle: "",
  homepage_books_title: "",
  homepage_books_subtitle: "",
  homepage_reviews_title: "",
  homepage_reviews_subtitle: "",
  homepage_track_title: "",
  homepage_track_subtitle: "",
  featured_course_ids: "",
  featured_book_ids: "",
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

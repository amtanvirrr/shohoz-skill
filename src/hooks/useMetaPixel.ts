import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

interface PixelConfig {
  facebook_pixel_id: string;
  facebook_test_event_code: string;
}

const PIXEL_KEYS = ["facebook_pixel_id", "facebook_test_event_code"];

let pixelInitialized = false;
let cachedConfig: PixelConfig | null = null;

const generateEventId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// Initialize the FB Pixel script
const initPixel = (pixelId: string) => {
  if (pixelInitialized || !pixelId) return;

  // fbq snippet
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s?.parentNode?.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  (window as any).fbq("init", pixelId);
  pixelInitialized = true;
};

// Track client-side event
const trackClientEvent = (
  eventName: string,
  params?: Record<string, any>,
  eventId?: string
) => {
  const fbq = (window as any).fbq;
  if (!fbq) return;
  if (eventId) {
    fbq("track", eventName, params || {}, { eventID: eventId });
  } else {
    fbq("track", eventName, params || {});
  }
};

// Send server-side CAPI event
const sendCapiEvent = async (
  eventName: string,
  eventId: string,
  params?: Record<string, any>,
  userData?: Record<string, any>
) => {
  try {
    await supabase.functions.invoke("meta-capi", {
      body: { event_name: eventName, event_id: eventId, params, user_data: userData },
    });
  } catch (e) {
    console.warn("CAPI event failed:", e);
  }
};

export const useMetaPixel = () => {
  const [config, setConfig] = useState<PixelConfig | null>(cachedConfig);
  const location = useLocation();

  // Load config once
  useEffect(() => {
    if (cachedConfig) {
      initPixel(cachedConfig.facebook_pixel_id);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", PIXEL_KEYS);
      const cfg: PixelConfig = { facebook_pixel_id: "", facebook_test_event_code: "" };
      data?.forEach((r) => {
        if (r.key === "facebook_pixel_id") cfg.facebook_pixel_id = r.value;
        if (r.key === "facebook_test_event_code") cfg.facebook_test_event_code = r.value;
      });
      cachedConfig = cfg;
      setConfig(cfg);
      initPixel(cfg.facebook_pixel_id);
    };
    load();
  }, []);

  // Track PageView on route change
  useEffect(() => {
    if (!config?.facebook_pixel_id) return;
    const eventId = generateEventId();
    trackClientEvent("PageView", {}, eventId);
    sendCapiEvent("PageView", eventId, {
      source_url: window.location.href,
    });
  }, [location.pathname, config?.facebook_pixel_id]);

  // Fire a custom/standard event (both client + server)
  const trackEvent = useCallback(
    (
      eventName: string,
      params?: Record<string, any>,
      userData?: Record<string, any>
    ) => {
      if (!config?.facebook_pixel_id) return;
      const eventId = generateEventId();
      trackClientEvent(eventName, params, eventId);
      sendCapiEvent(eventName, eventId, params, userData);
    },
    [config?.facebook_pixel_id]
  );

  return { trackEvent, pixelId: config?.facebook_pixel_id };
};

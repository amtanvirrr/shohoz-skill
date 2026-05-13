import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "shz_session_id";

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
};

export interface CtaEventInput {
  event_name: string;
  section?: string;
  label?: string;
  target_url?: string;
}

/**
 * Fire-and-forget CTA click tracker. Failures are silent — never block UX.
 */
export const trackCtaClick = (input: CtaEventInput): void => {
  if (typeof window === "undefined") return;
  const payload = {
    event_name: input.event_name,
    section: input.section ?? null,
    label: input.label ?? null,
    target_url: input.target_url ?? null,
    page: window.location.pathname,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent.slice(0, 255),
    session_id: getSessionId(),
  };
  // Fire asynchronously; never await
  void supabase.from("cta_events").insert(payload).then(({ error }) => {
    if (error) console.warn("[analytics] CTA track failed:", error.message);
  });
};
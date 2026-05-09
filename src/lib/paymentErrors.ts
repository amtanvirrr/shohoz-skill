/**
 * Unified payment error mapping for both SSLCommerz init and MFS submit
 * flows. Goal: take any raw backend / network / validation error string and
 * translate it into a clear Bengali message that explains *why* the payment
 * failed and *what the user can do next* (retry, change method, etc.).
 *
 * Each mapped error returns:
 *  - title:     short headline shown in the inline error banner / toast
 *  - message:   user-facing explanation in Bengali
 *  - hint:      optional secondary line — actionable next step
 *  - retryable: whether the "আবার চেষ্টা করুন" button should be shown
 *  - category:  coarse bucket for logging/analytics
 */

export type PaymentErrorCategory =
  | "network"
  | "auth"
  | "validation"
  | "min_amount"
  | "duplicate"
  | "gateway_config"
  | "gateway_rejected"
  | "rate_limit"
  | "server"
  | "unknown";

export interface MappedPaymentError {
  title: string;
  message: string;
  hint?: string;
  retryable: boolean;
  category: PaymentErrorCategory;
  /** Original raw text — useful for the admin payment_events log. */
  raw: string;
}

const lc = (s: string) => s.toLowerCase();

/**
 * Map a raw error string from SSLCommerz init or MFS order insert into a
 * friendly Bengali message. `flow` tweaks copy slightly so the same generic
 * cause (e.g. network) reads naturally in either context.
 */
export function mapPaymentError(
  raw: string | undefined | null,
  flow: "ssl" | "mfs" | "cod" = "ssl"
): MappedPaymentError {
  const text = (raw || "").trim();
  const t = lc(text);

  const flowLabel = flow === "ssl" ? "অনলাইন পেমেন্ট" : flow === "cod" ? "অর্ডার" : "পেমেন্ট";

  // ---- Network / connectivity ----
  if (
    !text ||
    t.includes("failed to fetch") ||
    t.includes("networkerror") ||
    t.includes("network request failed") ||
    t.includes("load failed") ||
    t.includes("timeout") ||
    t.includes("timed out") ||
    t.includes("aborted")
  ) {
    return {
      title: "নেটওয়ার্ক সমস্যা",
      message: `${flowLabel} শুরু করতে গিয়ে সার্ভারের সাথে সংযোগ করা যায়নি।`,
      hint: "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
      retryable: true,
      category: "network",
      raw: text,
    };
  }

  // ---- Auth / session ----
  if (
    t.includes("unauthorized") ||
    t.includes("not authenticated") ||
    t.includes("jwt") ||
    t.includes("invalid token") ||
    t.includes("session expired") ||
    t.includes("auth")
  ) {
    return {
      title: "লগইন সেশন শেষ",
      message: "আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে।",
      hint: "অনুগ্রহ করে আবার লগইন করে পেমেন্ট সম্পন্ন করুন।",
      retryable: false,
      category: "auth",
      raw: text,
    };
  }

  // ---- Minimum amount (SSLCommerz specific) ----
  if (
    t.includes("minimum transaction amount") ||
    t.includes("min_amount") ||
    t.includes("minimum amount") ||
    t.includes("ন্যূনতম")
  ) {
    return {
      title: "ন্যূনতম পেমেন্ট সীমা",
      message: "অনলাইন গেটওয়ের জন্য আপনার অর্ডারের পরিমাণ অনেক কম।",
      hint: "অন্য পেমেন্ট পদ্ধতি (যেমন bKash/Nagad/COD) বেছে নিন।",
      retryable: false,
      category: "min_amount",
      raw: text,
    };
  }

  // ---- Duplicate transaction id (MFS) ----
  if (
    t.includes("duplicate") ||
    t.includes("already exists") ||
    t.includes("unique constraint") ||
    t.includes("23505")
  ) {
    return {
      title: "ট্রানজেকশন আইডি ব্যবহৃত",
      message: "এই Transaction ID এর জন্য আগেই একটি অর্ডার তৈরি হয়েছে।",
      hint: "Transaction ID ভালোভাবে যাচাই করুন, ভুল করে আবার সাবমিট করবেন না।",
      retryable: false,
      category: "duplicate",
      raw: text,
    };
  }

  // ---- Validation: missing fields / bad input ----
  if (
    t.includes("missing") ||
    t.includes("required") ||
    t.includes("invalid input") ||
    t.includes("validation") ||
    t.includes("not null") ||
    t.includes("transaction id")
  ) {
    return {
      title: "তথ্য পূরণে সমস্যা",
      message: "কিছু আবশ্যক তথ্য পাওয়া যায়নি বা সঠিক নয়।",
      hint: "নাম, ফোন, ঠিকানা ও ট্রানজেকশন আইডি সঠিক আছে কিনা দেখে আবার চেষ্টা করুন।",
      retryable: true,
      category: "validation",
      raw: text,
    };
  }

  // ---- Gateway config (store id / credentials missing) ----
  if (
    t.includes("store") ||
    t.includes("credential") ||
    t.includes("not configured") ||
    t.includes("missing config") ||
    t.includes("api key")
  ) {
    return {
      title: "পেমেন্ট গেটওয়ে কনফিগার নেই",
      message: "অনলাইন পেমেন্ট গেটওয়ে এখনো সম্পূর্ণ সেটআপ নেই।",
      hint: "অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি বেছে নিন বা কিছুক্ষণ পরে চেষ্টা করুন।",
      retryable: false,
      category: "gateway_config",
      raw: text,
    };
  }

  // ---- Gateway rejected (SSL returned FAILED with reason) ----
  if (
    t.includes("failedreason") ||
    t.includes("gateway") ||
    t.includes("rejected") ||
    t.includes("declined") ||
    t.includes("sslcommerz")
  ) {
    return {
      title: "গেটওয়ে অনুরোধ প্রত্যাখ্যান",
      message: text || "পেমেন্ট গেটওয়ে আপনার অনুরোধ প্রত্যাখ্যান করেছে।",
      hint: "একটু পরে আবার চেষ্টা করুন বা অন্য পদ্ধতি ব্যবহার করুন।",
      retryable: true,
      category: "gateway_rejected",
      raw: text,
    };
  }

  // ---- Rate limit ----
  if (t.includes("rate limit") || t.includes("too many") || t.includes("429")) {
    return {
      title: "অনেক বার চেষ্টা করেছেন",
      message: "অল্প সময়ে অনেকবার পেমেন্ট চেষ্টা করা হয়েছে।",
      hint: "প্রায় ১ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
      retryable: true,
      category: "rate_limit",
      raw: text,
    };
  }

  // ---- 5xx / server ----
  if (t.match(/\b5\d\d\b/) || t.includes("internal server") || t.includes("server error")) {
    return {
      title: "সার্ভার সাময়িকভাবে ব্যস্ত",
      message: "আমাদের সার্ভারে সাময়িক ত্রুটি হয়েছে।",
      hint: "কয়েক সেকেন্ড পরে আবার চেষ্টা করুন।",
      retryable: true,
      category: "server",
      raw: text,
    };
  }

  // ---- Fallback ----
  return {
    title: "পেমেন্ট সম্পন্ন করা যায়নি",
    message: text || "অজানা কারণে পেমেন্ট সম্পন্ন করা যায়নি।",
    hint: "অনুগ্রহ করে আবার চেষ্টা করুন। সমস্যা থাকলে সাপোর্টে যোগাযোগ করুন।",
    retryable: true,
    category: "unknown",
    raw: text,
  };
}
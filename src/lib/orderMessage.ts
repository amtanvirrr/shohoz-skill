/**
 * Generates the personalized order-confirmation copy shown in
 * OrderSuccessDialog and PaymentResult based on:
 *   - paymentMethod  → cod / sslcommerz / bkash|nagad|rocket|upay (manual MFS)
 *   - productType    → book (physical) / ebook / course / quiz
 *   - deliveryText   → e.g. "৩-৫ দিন" pulled from active shipping_zones
 *   - paymentVerified → true only for confirmed online (SSL) payments
 *
 * The goal: every customer sees copy that matches the path they took, so
 * a manual MFS submitter is never told "delivered instantly" and an SSL
 * payer is never told "we'll verify your payment".
 */

export type OrderProductType = "book" | "ebook" | "course" | "quiz";
export type OrderPaymentMethod =
  | "cod"
  | "sslcommerz"
  | "bkash"
  | "nagad"
  | "rocket"
  | "upay"
  | string;

export interface OrderMessageInput {
  paymentMethod: OrderPaymentMethod;
  productType: OrderProductType;
  /** e.g. "৩-৫ দিন" — already localized & with unit. */
  deliveryText?: string;
  /** True only when a gateway-paid order has been verified by IPN. */
  paymentVerified?: boolean;
  /** Free orders (price = 0) bypass payment entirely. */
  isFree?: boolean;
}

export interface OrderMessageOutput {
  title: string;
  message: string;
}

const DEFAULT_DELIVERY = "৩-৫ কর্মদিবস";

const isPhysical = (t: OrderProductType) => t === "book";
const isDigital = (t: OrderProductType) => t === "ebook" || t === "course" || t === "quiz";

const digitalAccessLine = (t: OrderProductType) => {
  if (t === "ebook") return "বইটি পড়তে পারবেন";
  if (t === "course") return "কোর্সটি অ্যাক্সেস করতে পারবেন";
  return "কুইজে অংশ নিতে পারবেন";
};

export function buildOrderMessage(input: OrderMessageInput): OrderMessageOutput {
  const { paymentMethod, productType, paymentVerified, isFree } = input;
  const delivery = input.deliveryText?.trim() || DEFAULT_DELIVERY;

  // Free orders — instant access (only digital items can be free).
  if (isFree) {
    return {
      title: "সফলভাবে সম্পন্ন! 🎉",
      message: `আপনার অর্ডারটি কনফার্ম হয়েছে। আপনি এখনই ${digitalAccessLine(productType)}।`,
    };
  }

  // Cash on Delivery — only physical books.
  if (paymentMethod === "cod") {
    return {
      title: "অর্ডার নিশ্চিত হয়েছে! 🎉",
      message:
        `আপনার অর্ডার করার জন্য ধন্যবাদ! আপনার ঠিকানায় ${delivery}-এর মধ্যে প্রোডাক্টটি পৌঁছে যাবে। ` +
        `প্রোডাক্ট হাতে পেয়ে যাচাই করার পর ডেলিভারি ম্যানকে মূল্য পরিশোধ করবেন।`,
    };
  }

  // Online gateway (SSLCommerz) — verified.
  if (paymentMethod === "sslcommerz" && paymentVerified) {
    if (isPhysical(productType)) {
      return {
        title: "পেমেন্ট সফল! 🎉",
        message:
          `অভিনন্দন! আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে এবং অর্ডারটি কনফার্ম হয়েছে। ` +
          `আপনার ঠিকানায় ${delivery}-এর মধ্যে প্রোডাক্টটি পৌঁছে যাবে।`,
      };
    }
    return {
      title: "পেমেন্ট সফল! 🎉",
      message: `অভিনন্দন! আপনার পেমেন্ট সফল হয়েছে এবং অর্ডার কনফার্ম হয়েছে। আপনি এখনই ${digitalAccessLine(productType)}।`,
    };
  }

  // Online gateway — not yet verified (rare; IPN delay).
  if (paymentMethod === "sslcommerz") {
    return {
      title: "পেমেন্ট গ্রহণ করা হয়েছে",
      message:
        `আপনার পেমেন্ট গ্রহণ করা হয়েছে। সংক্ষিপ্ত ভেরিফিকেশনের পর অর্ডার কনফার্ম হবে — ` +
        (isPhysical(productType)
          ? `এরপর ${delivery}-এর মধ্যে আপনার ঠিকানায় পৌঁছে দেওয়া হবে।`
          : `এরপর আপনি ${digitalAccessLine(productType)}।`),
    };
  }

  // Manual MFS (bKash/Nagad/Rocket/Upay) — payment requires admin verification.
  if (isPhysical(productType)) {
    return {
      title: "অর্ডার গ্রহণ করা হয়েছে",
      message:
        `আপনার অর্ডারটি গ্রহণ করা হয়েছে। শীঘ্রই আমরা আপনার পেমেন্টটি যাচাই করে ` +
        `${delivery}-এর মধ্যে আপনার ঠিকানায় প্রোডাক্টটি পৌঁছে দেব।`,
    };
  }
  return {
    title: "অর্ডার গ্রহণ করা হয়েছে",
    message:
      `আপনার অর্ডারটি গ্রহণ করা হয়েছে। আমরা আপনার পেমেন্ট যাচাই করার পরই আপনি ` +
      `${digitalAccessLine(productType)}।`,
  };
}
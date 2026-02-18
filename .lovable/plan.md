

# YouTube CAPTCHA সমস্যার সমাধান

## সমস্যা কী?

এই CAPTCHA আপনার কোড থেকে আসেনি — এটি Google/YouTube এর নিজস্ব bot detection সিস্টেম। পেজ লোড হওয়ার সাথে সাথে একাধিক YouTube iframe একসঙ্গে লোড হলে Google "unusual traffic" ধরে CAPTCHA দেখায়।

## সমাধান

`src/pages/LandingPage.tsx` ফাইলে দুটি পরিবর্তন করা হবে:

### 1. Privacy-Enhanced Embed URL
`toEmbedUrl()` ফাংশনে `youtube.com` এর বদলে `youtube-nocookie.com` ব্যবহার করা হবে। এটি কুকি ও ট্র্যাকিং কমায়, ফলে CAPTCHA ট্রিগার কম হয়।

### 2. Lazy Loading YouTube Iframes
সব YouTube iframe-এ `loading="lazy"` অ্যাট্রিবিউট যোগ করা হবে, যাতে শুধু ভিউপোর্টে আসলেই ভিডিও লোড হয় — একসাথে সব রিকোয়েস্ট না যায়।

## প্রযুক্তিগত বিবরণ

- `toEmbedUrl()` এর আউটপুট পরিবর্তন: `youtube.com/embed/...` -> `youtube-nocookie.com/embed/...`
- সব `<iframe>` ট্যাগে `loading="lazy"` যোগ (প্রায় ৮-১০ জায়গা)
- শুধুমাত্র একটি ফাইল পরিবর্তন হবে: `src/pages/LandingPage.tsx`




# YouTube ভিডিও "refused to connect" সমস্যার সমাধান

## সমস্যা কী?

YouTube তাদের সাধারণ URL (যেমন `https://www.youtube.com/watch?v=abc123`) iframe-এ লোড করতে দেয় না — এটা তাদের সিকিউরিটি পলিসি। ভিডিও embed করতে হলে URL-টি `https://www.youtube.com/embed/abc123` ফরম্যাটে রূপান্তর করতে হয়।

## সমাধান

### ফাইল: `src/pages/LandingPage.tsx`

একটি হেল্পার ফাংশন `toEmbedUrl()` যোগ করা হবে যা স্বয়ংক্রিয়ভাবে যেকোনো YouTube URL-কে embed ফরম্যাটে রূপান্তর করবে:

- `https://www.youtube.com/watch?v=VIDEO_ID` → `https://www.youtube.com/embed/VIDEO_ID`
- `https://youtu.be/VIDEO_ID` → `https://www.youtube.com/embed/VIDEO_ID`
- ইতিমধ্যে embed URL হলে পরিবর্তন হবে না
- YouTube নয় এমন URL (সরাসরি .mp4 ফাইল ইত্যাদি) অপরিবর্তিত থাকবে

এরপর যতগুলো জায়গায় `<iframe src={url}>` ব্যবহার করা হয়েছে (হিরো ভিডিও, মিডিয়া গ্যালারি — প্রায় ৬-৭ জায়গা), সবগুলোতে `src={toEmbedUrl(url)}` ব্যবহার করা হবে।

## প্রযুক্তিগত বিবরণ

```text
ইউজার যা দেয়:  https://www.youtube.com/watch?v=abc123
                        ↓ toEmbedUrl()
iframe যা পায়:  https://www.youtube.com/embed/abc123
```

শুধুমাত্র একটি ফাইল (`LandingPage.tsx`) পরিবর্তন হবে। ডাটাবেজে কোনো পরিবর্তন নেই — ইউজার যেকোনো ফরম্যাটে URL দিতে পারবে, সিস্টেম নিজে থেকে ঠিক করে নেবে।

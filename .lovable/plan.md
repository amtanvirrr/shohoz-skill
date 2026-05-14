## পরিবর্তন

মোবাইলে Featured Course এবং Featured বই section এর কার্ডগুলো বর্তমানে `w-[82%]` width ব্যবহার করছে, যার ফলে স্ক্রিনে একটি কার্ড পুরোপুরি দেখা যায় এবং পরবর্তী কার্ডের সামান্য অংশ পিক করে। আপনি চান প্রায় দুইটি কার্ড একসাথে দেখা যাক এবং তৃতীয় কার্ডের একটি ছোট peek থাকুক — যাতে user বুঝতে পারে আরও কন্টেন্ট আছে এবং swipe করতে উৎসাহিত হয়।

## পদ্ধতি

কার্ডের mobile width `w-[82%]` থেকে কমিয়ে **`w-[44%]`** করা হবে। এই হিসাব:

- Container: `px-4` (16px padding) + কার্ডের মাঝে `gap-4` (16px gap)
- 44% width-এ দুইটি পূর্ণ কার্ড আরামসে আঁটে এবং তৃতীয় কার্ডের ~10–12% peek দেখা যায়
- ছোট ফোন (320–360px) এও কার্ডের content (ছবি, title, price, button) ভালোভাবে readable থাকে

`sm:` breakpoint থেকে existing grid layout (২–৩ column) অপরিবর্তিত থাকবে — শুধু মোবাইলে পরিবর্তন।

## যে files পরিবর্তন হবে

- `src/pages/Index.tsx` — Featured Course map (line ~365) এবং Featured Book map (line ~463) এর `ScrollReveal` wrapper-এ `w-[82%]` → `w-[44%]`

## যা পরিবর্তন হবে না

- কার্ডের ভেতরের design, content, spacing
- Desktop/tablet grid layout
- Quiz card বা অন্য section
- Carousel logic, snap behavior, pagination dots

বাস্তবায়ন approve করলে এগিয়ে যাব।
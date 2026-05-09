import { useSiteSettings } from "@/hooks/useSiteSettings";
import DOMPurify from "dompurify";

const defaultHtml = `
<p>আপনার ব্যক্তিগত তথ্যের গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। এই প্রাইভেসি পলিসি ব্যাখ্যা করে আমরা কী কী তথ্য সংগ্রহ করি, কীভাবে ব্যবহার করি এবং কীভাবে সুরক্ষিত রাখি।</p>
<h2>১. সংগৃহীত তথ্য</h2>
<ul>
  <li>নাম, ইমেইল, ফোন নম্বর ও ঠিকানা (অর্ডার সম্পন্ন করতে)</li>
  <li>পেমেন্ট সংক্রান্ত তথ্য (গেটওয়ের মাধ্যমে নিরাপদভাবে প্রসেস হয়)</li>
  <li>ব্রাউজিং ডেটা ও কুকিজ (সেবা উন্নয়নে)</li>
</ul>
<h2>২. তথ্য ব্যবহারের উদ্দেশ্য</h2>
<ul>
  <li>অর্ডার প্রসেসিং, ডেলিভারি ও কাস্টমার সাপোর্ট</li>
  <li>অ্যাকাউন্ট ম্যানেজমেন্ট ও যোগাযোগ</li>
  <li>সেবার মান উন্নয়ন ও বিশ্লেষণ</li>
</ul>
<h2>৩. তথ্য শেয়ারিং</h2>
<p>আমরা আপনার ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি করি না। শুধুমাত্র অর্ডার ডেলিভারি (কুরিয়ার) ও পেমেন্ট (গেটওয়ে) সেবার জন্য প্রয়োজনীয় তথ্য শেয়ার করা হয়।</p>
<h2>৪. ডেটা নিরাপত্তা</h2>
<p>আমরা আধুনিক এনক্রিপশন ও অ্যাক্সেস কন্ট্রোল ব্যবহার করে আপনার তথ্য সুরক্ষিত রাখি।</p>
<h2>৫. আপনার অধিকার</h2>
<p>আপনি যেকোনো সময় নিজের ডেটা দেখার, সংশোধনের বা মুছে ফেলার অনুরোধ করতে পারেন।</p>
<h2>৬. কুকিজ</h2>
<p>ব্যবহারকারীর অভিজ্ঞতা উন্নত করতে আমরা কুকিজ ব্যবহার করি। ব্রাউজার সেটিংস থেকে কুকিজ নিয়ন্ত্রণ করা যাবে।</p>
<h2>৭. যোগাযোগ</h2>
<p>প্রাইভেসি সংক্রান্ত যেকোনো জিজ্ঞাসায় আমাদের কন্টাক্ট পেজে যোগাযোগ করুন।</p>
`;

const Privacy = () => {
  const { settings } = useSiteSettings();
  const html = DOMPurify.sanitize((settings as any).privacy_content || defaultHtml);
  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">প্রাইভেসি পলিসি</h1>
          <div
            className="mt-8 space-y-6 text-muted-foreground leading-relaxed prose prose-headings:text-foreground prose-headings:font-bold prose-h2:text-2xl prose-h2:!mt-10 prose-ul:list-disc prose-ul:pl-6 prose-li:space-y-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
};

export default Privacy;
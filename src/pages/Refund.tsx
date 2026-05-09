import { useSiteSettings } from "@/hooks/useSiteSettings";
import DOMPurify from "dompurify";

const defaultHtml = `
<p>আমরা গ্রাহক সন্তুষ্টিকে সর্বোচ্চ গুরুত্ব দিই। নিচের শর্ত অনুযায়ী আপনি অর্ডার রিটার্ন বা রিফান্ডের অনুরোধ করতে পারবেন।</p>
<h2>১. রিফান্ডের সময়সীমা</h2>
<p><strong>অনুমোদিত রিফান্ড আবেদন প্রক্রিয়াকরণে ৭ থেকে ১০ কর্মদিবস (Working Days) সময় লাগবে।</strong> রিফান্ডের অর্থ আপনার মূল পেমেন্ট মাধ্যমেই (কার্ড / মোবাইল ব্যাংকিং / ব্যাংক) ফেরত পাঠানো হবে।</p>
<h2>২. ফিজিক্যাল বই (Physical Book) রিটার্ন</h2>
<ul>
  <li>পণ্য হাতে পাওয়ার <strong>২৪ ঘণ্টার</strong> মধ্যে রিটার্ন/রিপ্লেস অনুরোধ করতে হবে।</li>
  <li>পণ্যটি ব্যবহার না হওয়া, অক্ষত প্যাকেজিং ও আসল কন্ডিশনে থাকতে হবে।</li>
  <li>ভুল পণ্য পাঠানো হলে বা পণ্যে ত্রুটি থাকলে সম্পূর্ণ রিফান্ড / প্রতিস্থাপন প্রযোজ্য।</li>
</ul>
<h2>৩. ডিজিটাল প্রোডাক্ট (E-book / Course / Quiz) রিফান্ড</h2>
<ul>
  <li>একবার অ্যাক্সেস (ডাউনলোড / এনরোল / অ্যাটেম্পট) নেওয়ার পর ডিজিটাল প্রোডাক্ট সাধারণত রিফান্ডযোগ্য নয়।</li>
  <li>পেমেন্ট সম্পন্ন হলেও কারিগরি কারণে অ্যাক্সেস না পেলে সম্পূর্ণ রিফান্ড দেওয়া হবে।</li>
</ul>
<h2>৪. ক্যান্সেলেশন</h2>
<p>অর্ডার ডিসপ্যাচ হওয়ার আগে আপনি বিনামূল্যে অর্ডার ক্যান্সেল করতে পারবেন।</p>
<h2>৫. রিফান্ডের জন্য আবেদন</h2>
<p>রিফান্ডের জন্য আপনার অর্ডার আইডি ও বিস্তারিত কারণ সহ আমাদের কন্টাক্ট পেজে যোগাযোগ করুন। যাচাই-বাছাই করার পর ৭–১০ কর্মদিবসের মধ্যে রিফান্ড সম্পন্ন হবে।</p>
<h2>৬. ব্যতিক্রম</h2>
<p>প্রমোশনাল / ফ্রি / কুপন-ভিত্তিক অর্ডার এবং কাস্টম-অর্ডার সাধারণত রিফান্ডযোগ্য নয়।</p>
`;

const Refund = () => {
  const { settings } = useSiteSettings();
  const html = DOMPurify.sanitize((settings as any).refund_content || defaultHtml);
  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">রিটার্ন ও রিফান্ড পলিসি</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            রিফান্ড প্রক্রিয়াকরণ সময়: {(settings as any).refund_timeline_text || "৭–১০ কর্মদিবস"}
          </div>
          <div
            className="mt-8 space-y-6 text-muted-foreground leading-relaxed prose prose-headings:text-foreground prose-headings:font-bold prose-h2:text-2xl prose-h2:!mt-10 prose-ul:list-disc prose-ul:pl-6 prose-li:space-y-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
};

export default Refund;
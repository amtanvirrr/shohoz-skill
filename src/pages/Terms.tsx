import { useSiteSettings } from "@/hooks/useSiteSettings";
import DOMPurify from "dompurify";

const defaultHtml = `
<p>আমাদের ওয়েবসাইট ও সেবা ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী ভালোভাবে পড়ুন। ওয়েবসাইটে প্রবেশ বা অর্ডার করার মাধ্যমে আপনি নিচের সকল শর্তে সম্মত হচ্ছেন।</p>
<h2>১. সেবার ব্যবহার</h2>
<p>আমরা ডিজিটাল কোর্স, ই-বুক, কুইজ এবং ফিজিক্যাল বই বিক্রি করি। কেনাকাটার জন্য সঠিক ও সম্পূর্ণ তথ্য প্রদান করা গ্রাহকের দায়িত্ব।</p>
<h2>২. অ্যাকাউন্ট ও নিরাপত্তা</h2>
<p>আপনার অ্যাকাউন্টের পাসওয়ার্ড এবং লগইন তথ্য গোপন রাখার দায়িত্ব আপনার নিজের।</p>
<h2>৩. মূল্য ও পেমেন্ট</h2>
<p>সকল মূল্য বাংলাদেশী টাকায় (৳) প্রদর্শিত। আমরা যেকোনো সময় মূল্য, ছাড় বা প্রমোশন পরিবর্তনের অধিকার সংরক্ষণ করি।</p>
<h2>৪. বুদ্ধিবৃত্তিক সম্পদ</h2>
<p>ওয়েবসাইটের সকল কনটেন্ট, কোর্স মেটেরিয়াল ও ই-বুকের কপিরাইট আমাদের। অননুমোদিতভাবে কপি, বিতরণ বা পুনর্বিক্রয় কঠোরভাবে নিষিদ্ধ।</p>
<h2>৫. দায়বদ্ধতার সীমা</h2>
<p>আমরা সেবার নিরবচ্ছিন্নতা সর্বোচ্চ চেষ্টা করে নিশ্চিত করি, তবে অপ্রত্যাশিত প্রযুক্তিগত ত্রুটির জন্য আমরা দায়ী নই।</p>
<h2>৬. শর্তাবলীর পরিবর্তন</h2>
<p>আমরা যেকোনো সময় এই শর্তাবলী হালনাগাদ করতে পারি। হালনাগাদকৃত শর্তাবলী এই পেজে প্রকাশের সাথে সাথেই কার্যকর হবে।</p>
`;

const Terms = () => {
  const { settings } = useSiteSettings();
  const html = DOMPurify.sanitize((settings as any).terms_content || defaultHtml);
  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">ব্যবহারের শর্তাবলী</h1>
          <div
            className="mt-8 space-y-6 text-muted-foreground leading-relaxed prose prose-headings:text-foreground prose-headings:font-bold prose-h2:text-2xl prose-h2:!mt-10 prose-ul:list-disc prose-ul:pl-6 prose-li:space-y-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
};

export default Terms;
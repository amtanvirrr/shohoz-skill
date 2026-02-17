import { useSiteSettings } from "@/hooks/useSiteSettings";
import DOMPurify from "dompurify";

const defaultAboutHtml = `
<p>এটি একটি আধুনিক শিক্ষা প্ল্যাটফর্ম যেখানে আপনি পাবেন মানসম্পন্ন অনলাইন কোর্স এবং হ্যান্ডপিকড বই। আমাদের লক্ষ্য হলো প্রত্যেকের জন্য মানসম্পন্ন শিক্ষা সহজলভ্য করা।</p>
<p>আমরা বিশ্বাস করি যে সঠিক রিসোর্স এবং গাইডলাইন পেলে যে কেউ তার ক্যারিয়ারে সফল হতে পারে। তাই আমরা সেরা ইন্সট্রাক্টর এবং লেখকদের সাথে কাজ করি যারা প্র্যাক্টিক্যাল এবং বাস্তবসম্মত কন্টেন্ট তৈরি করেন।</p>
<h2>আমাদের মিশন</h2>
<p>বাংলায় মানসম্পন্ন শিক্ষা উপকরণ তৈরি করা এবং প্রযুক্তি ব্যবহার করে শিক্ষাকে সবার কাছে পৌঁছে দেওয়া।</p>
<h2>কেন আমরা?</h2>
<ul>
  <li>অভিজ্ঞ ইন্সট্রাক্টর দ্বারা তৈরি কোর্স</li>
  <li>প্র্যাক্টিক্যাল এবং প্রজেক্ট-ভিত্তিক শিক্ষা</li>
  <li>লাইফটাইম অ্যাক্সেস</li>
  <li>সাশ্রয়ী মূল্য</li>
  <li>ডেডিকেটেড সাপোর্ট</li>
</ul>
`;

const About = () => {
  const { settings } = useSiteSettings();
  const name = settings.site_name || "আমাদের প্ল্যাটফর্ম";
  const rawHtml = settings.about_content || defaultAboutHtml;
  const cleanHtml = DOMPurify.sanitize(rawHtml);

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">About {name}</h1>
          <div
            className="mt-8 space-y-6 text-muted-foreground leading-relaxed prose prose-headings:text-foreground prose-headings:font-bold prose-h2:text-2xl prose-h2:!mt-10 prose-ul:list-disc prose-ul:pl-6 prose-li:space-y-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default About;

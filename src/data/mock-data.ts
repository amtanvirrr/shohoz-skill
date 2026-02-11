export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  category: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  lessonsCount: number;
  duration: string;
  category: string;
  lessons: { title: string; duration: string }[];
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  product: string;
}

export const books: Book[] = [
  {
    id: "book-1",
    title: "ডিজিটাল মার্কেটিং মাস্টারক্লাস",
    author: "রাফি আহমেদ",
    price: 450,
    originalPrice: 600,
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=560&fit=crop",
    description: "ডিজিটাল মার্কেটিং এর A to Z শিখুন এই বই থেকে। Facebook Ads, Google Ads, SEO, Content Marketing সব কিছু এক জায়গায়।",
    category: "মার্কেটিং",
  },
  {
    id: "book-2",
    title: "ফ্রিল্যান্সিং ক্যারিয়ার গাইড",
    author: "সাদিয়া ইসলাম",
    price: 350,
    originalPrice: 500,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=560&fit=crop",
    description: "ফ্রিল্যান্সিং এ সফল ক্যারিয়ার গড়তে চান? এই বইটি আপনার জন্য। প্র্যাক্টিক্যাল টিপস ও গাইডলাইন।",
    category: "ক্যারিয়ার",
  },
  {
    id: "book-3",
    title: "উদ্যোক্তা হওয়ার পথে",
    author: "তানভীর হাসান",
    price: 500,
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=560&fit=crop",
    description: "বাংলাদেশে সফল উদ্যোক্তা হতে চাইলে এই বইটি অবশ্যই পড়ুন। রিয়েল লাইফ কেস স্টাডি সহ।",
    category: "ব্যবসা",
  },
];

export const courses: Course[] = [
  {
    id: "course-1",
    title: "Complete Web Development Bootcamp",
    instructor: "আরিফ রহমান",
    price: 2999,
    originalPrice: 4999,
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
    description: "HTML, CSS, JavaScript, React, Node.js — সব কিছু শিখুন একটি কোর্সে। প্র্যাক্টিক্যাল প্রজেক্ট সহ।",
    lessonsCount: 120,
    duration: "40 ঘন্টা",
    category: "ওয়েব ডেভেলপমেন্ট",
    lessons: [
      { title: "HTML Fundamentals", duration: "2h 30m" },
      { title: "CSS & Responsive Design", duration: "3h 15m" },
      { title: "JavaScript Basics", duration: "4h 00m" },
      { title: "Advanced JavaScript", duration: "3h 45m" },
      { title: "React.js Complete Guide", duration: "6h 00m" },
      { title: "Node.js & Express", duration: "5h 30m" },
      { title: "Database & MongoDB", duration: "4h 00m" },
      { title: "Final Project", duration: "8h 00m" },
    ],
  },
  {
    id: "course-2",
    title: "Facebook & Instagram Ads Mastery",
    instructor: "নাফিসা তাসনিম",
    price: 1999,
    originalPrice: 3499,
    image: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600&h=400&fit=crop",
    description: "Facebook ও Instagram Ads এর মাধ্যমে ব্যবসা বাড়ান। টার্গেটিং, বাজেটিং, কপিরাইটিং সব শিখুন।",
    lessonsCount: 45,
    duration: "15 ঘন্টা",
    category: "ডিজিটাল মার্কেটিং",
    lessons: [
      { title: "Facebook Ads Overview", duration: "1h 30m" },
      { title: "Audience Targeting", duration: "2h 00m" },
      { title: "Ad Creative Design", duration: "2h 30m" },
      { title: "Campaign Optimization", duration: "3h 00m" },
      { title: "Instagram Ads Strategy", duration: "2h 00m" },
      { title: "Analytics & Reporting", duration: "2h 00m" },
    ],
  },
  {
    id: "course-3",
    title: "Graphic Design for Business",
    instructor: "মাহবুব আলম",
    price: 1499,
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=400&fit=crop",
    description: "Canva, Photoshop, Illustrator দিয়ে প্রফেশনাল ডিজাইন শিখুন। ব্যবসার জন্য ডিজাইন তৈরি করুন।",
    lessonsCount: 60,
    duration: "20 ঘন্টা",
    category: "গ্রাফিক ডিজাইন",
    lessons: [
      { title: "Design Principles", duration: "2h 00m" },
      { title: "Canva Mastery", duration: "3h 00m" },
      { title: "Photoshop Basics", duration: "4h 00m" },
      { title: "Illustrator Essentials", duration: "4h 00m" },
      { title: "Brand Design", duration: "3h 00m" },
      { title: "Social Media Graphics", duration: "2h 30m" },
    ],
  },
];

export const reviews: Review[] = [
  {
    id: "1",
    name: "আবদুল্লাহ আল মামুন",
    rating: 5,
    comment: "অসাধারণ কোর্স! সব কিছু খুব সুন্দরভাবে শেখানো হয়েছে। প্র্যাক্টিক্যাল প্রজেক্ট গুলো খুবই হেল্পফুল।",
    product: "Complete Web Development Bootcamp",
  },
  {
    id: "2",
    name: "ফাতিমা আক্তার",
    rating: 5,
    comment: "বইটি পড়ে অনেক কিছু শিখেছি। লেখকের ব্যাখ্যা খুবই সহজ এবং বোধগম্য।",
    product: "ডিজিটাল মার্কেটিং মাস্টারক্লাস",
  },
  {
    id: "3",
    name: "রাকিবুল ইসলাম",
    rating: 4,
    comment: "কোর্সের কন্টেন্ট খুবই ভালো। ইন্সট্রাক্টর অনেক সাপোর্টিভ। রিকমেন্ড করি।",
    product: "Facebook & Instagram Ads Mastery",
  },
  {
    id: "4",
    name: "নুসরাত জাহান",
    rating: 5,
    comment: "ফ্রিল্যান্সিং শুরু করার জন্য এই বইটি খুবই দরকারী ছিল। ধন্যবাদ!",
    product: "ফ্রিল্যান্সিং ক্যারিয়ার গাইড",
  },
];

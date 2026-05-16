import type { CourseCardCourse } from "@/components/cards/CourseCard";
import type { BookCardBook } from "@/components/cards/BookCard";

export const SHORT_INSTRUCTOR = "ড. রহমান";
export const LONG_INSTRUCTOR =
  "অধ্যাপক ড. মুহাম্মদ আব্দুর রহমান চৌধুরী, ঢাকা বিশ্ববিদ্যালয়ের কম্পিউটার সায়েন্স ও ইঞ্জিনিয়ারিং বিভাগের প্রধান এবং সিনিয়র রিসার্চ ফেলো";

export const SHORT_AUTHOR = "হুমায়ূন আহমেদ";
export const LONG_AUTHOR =
  "অধ্যাপক ড. মুহাম্মদ জাফর ইকবাল, শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়, সিলেট — বিজ্ঞান কল্পকাহিনী লেখক ও শিক্ষাবিদ";

export const baseCourse: CourseCardCourse = {
  id: "demo-course-1",
  title: "সম্পূর্ণ ওয়েব ডেভেলপমেন্ট মাস্টারক্লাস ২০২৬",
  slug: "web-dev-masterclass",
  instructor: SHORT_INSTRUCTOR,
  price: 2500,
  original_price: 4000,
  image_url: "https://placehold.co/640x360/1e3a8a/ffffff?text=Course",
  category: "প্রোগ্রামিং",
  duration: "৪০ ঘণ্টা",
  description: "React, Node.js ও PostgreSQL দিয়ে আধুনিক ফুল-স্ট্যাক অ্যাপ তৈরি করুন।",
  lesson_count: 86,
};

export const baseBook: BookCardBook = {
  id: "demo-book-1",
  title: "বাংলা সাহিত্যের ইতিহাস ও বিকাশধারা",
  slug: "bangla-sahitya",
  author: SHORT_AUTHOR,
  price: 450,
  original_price: 600,
  image_url: "https://placehold.co/480x640/c2410c/ffffff?text=Book",
  category: "সাহিত্য",
  book_type: "physical",
  description: "বাংলা সাহিত্যের সহস্রাব্দব্যাপী যাত্রার একটি বিস্তারিত পাঠ।",
};
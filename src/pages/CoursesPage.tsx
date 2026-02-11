import { Link } from "react-router-dom";
import { courses } from "@/data/mock-data";
import { BookOpen, Clock } from "lucide-react";

const CoursesPage = () => {
  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground">All Courses</h1>
        <p className="mt-2 text-muted-foreground">আমাদের সকল কোর্স ব্রাউজ করুন</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
            >
              <div className="aspect-video overflow-hidden">
                <img src={course.image} alt={course.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2">{course.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lessonsCount} lessons</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                  {course.originalPrice && <span className="text-sm text-muted-foreground line-through">৳{course.originalPrice.toLocaleString()}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;

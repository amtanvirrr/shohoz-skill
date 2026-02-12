import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, PlayCircle, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Order {
  id: string;
  order_id: string;
  product_type: string;
  product_id: string;
  product_title: string;
  price: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface BookInfo {
  id: string;
  title: string;
  image_url: string;
  author: string;
  book_type: string;
  ebook_file_url: string | null;
}

interface CourseInfo {
  id: string;
  title: string;
  image_url: string;
  instructor: string;
  duration: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Map<string, BookInfo>>(new Map());
  const [courses, setCourses] = useState<Map<string, CourseInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch user's orders that are confirmed/delivered
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "delivered"])
        .order("created_at", { ascending: false });

      const userOrders = (orderData || []) as Order[];
      setOrders(userOrders);

      // Fetch book details for book orders
      const bookIds = userOrders.filter(o => o.product_type === "book").map(o => o.product_id);
      if (bookIds.length > 0) {
        const { data: bookData } = await supabase
          .from("books")
          .select("id, title, image_url, author, book_type, ebook_file_url")
          .in("id", bookIds);
        const bookMap = new Map<string, BookInfo>();
        (bookData || []).forEach((b: any) => bookMap.set(b.id, b));
        setBooks(bookMap);
      }

      // Fetch course details for course orders
      const courseIds = userOrders.filter(o => o.product_type === "course").map(o => o.product_id);
      if (courseIds.length > 0) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, title, image_url, instructor, duration")
          .in("id", courseIds);
        const courseMap = new Map<string, CourseInfo>();
        (courseData || []).forEach((c: any) => courseMap.set(c.id, c));
        setCourses(courseMap);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const ebookOrders = orders.filter(o => {
    if (o.product_type !== "book") return false;
    const book = books.get(o.product_id);
    return book?.book_type === "ebook";
  });

  const courseOrders = orders.filter(o => o.product_type === "course");

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-foreground">আমার ড্যাশবোর্ড</h1>
        <p className="mt-2 text-muted-foreground">আপনার কেনা ইবুক ও কোর্স এখান থেকে এক্সেস করুন</p>

        <Tabs defaultValue="ebooks" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="ebooks" className="gap-2">
              <BookOpen className="h-4 w-4" /> ইবুক ({ebookOrders.length})
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <PlayCircle className="h-4 w-4" /> কোর্স ({courseOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ebooks" className="mt-6">
            {ebookOrders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">কোনো ইবুক নেই</h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনি এখনো কোনো ইবুক কেনেননি।</p>
                <Button className="mt-4" asChild>
                  <Link to="/books">ইবুক দেখুন</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ebookOrders.map((order) => {
                  const book = books.get(order.product_id);
                  if (!book) return null;
                  return (
                    <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="aspect-[3/2] overflow-hidden">
                        <img src={book.image_url} alt={book.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1">{book.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                        <div className="mt-3 flex items-center gap-2">
                          {book.ebook_file_url ? (
                            <Button size="sm" className="w-full gap-2" asChild>
                              <a href={book.ebook_file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" /> ডাউনলোড করুন
                              </a>
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" className="w-full" disabled>
                              শীঘ্রই আসছে
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            {courseOrders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <PlayCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">কোনো কোর্স নেই</h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনি এখনো কোনো কোর্স কেনেননি।</p>
                <Button className="mt-4" asChild>
                  <Link to="/courses">কোর্স দেখুন</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courseOrders.map((order) => {
                  const course = courses.get(order.product_id);
                  if (!course) return null;
                  return (
                    <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="aspect-video overflow-hidden">
                        <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1">{course.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{course.instructor} • {course.duration}</p>
                        <Button size="sm" className="mt-3 w-full gap-2" asChild>
                          <Link to={`/course/${course.id}`}>
                            <ExternalLink className="h-4 w-4" /> কোর্সে যান
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;

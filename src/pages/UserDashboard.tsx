import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, PlayCircle, ExternalLink, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Package, Eye, UserCircle, Save, Loader2, Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "পেন্ডিং", icon: Clock, variant: "secondary" },
  confirmed: { label: "কনফার্মড", icon: CheckCircle, variant: "default" },
  shipped: { label: "শিপড", icon: Truck, variant: "outline" },
  delivered: { label: "ডেলিভারড", icon: Package, variant: "default" },
  cancelled: { label: "বাতিল", icon: XCircle, variant: "destructive" },
};

const paymentMethodLabels: Record<string, string> = {
  cod: "ক্যাশ অন ডেলিভারি",
  bkash: "বিকাশ",
  nagad: "নগদ",
};

const UserDashboard = () => {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Map<string, BookInfo>>(new Map());
  const [courses, setCourses] = useState<Map<string, CourseInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<{ id: string; blog_post_id: string; title: string; slug: string; category: string; cover_image_url: string; created_at: string }[]>([]);

  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch orders, profile, and bookmarks in parallel
      const [ordersRes, profileRes, bookmarksRes] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name, phone, address, email").eq("user_id", user.id).maybeSingle(),
        supabase.from("bookmarks").select("id, blog_post_id, created_at, blog_posts(title, slug, category, cover_image_url)").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      // Bookmarks
      setBookmarkedPosts(
        (bookmarksRes.data || []).map((b: any) => ({
          id: b.id,
          blog_post_id: b.blog_post_id,
          title: b.blog_posts?.title || "",
          slug: b.blog_posts?.slug || "",
          category: b.blog_posts?.category || "",
          cover_image_url: b.blog_posts?.cover_image_url || "",
          created_at: b.created_at,
        }))
      );

      // Profile
      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
        setPhone(profileRes.data.phone || "");
        setAddress(profileRes.data.address || "");
        setEmail(profileRes.data.email || "");
      }
      setProfileLoading(false);

      const allUserOrders = (ordersRes.data || []) as Order[];
      setAllOrders(allUserOrders);

      const accessOrders = allUserOrders.filter(o => ["confirmed", "delivered"].includes(o.status));
      setOrders(accessOrders);

      const bookIds = [...new Set(allUserOrders.filter(o => o.product_type === "book").map(o => o.product_id))];
      if (bookIds.length > 0) {
        const { data: bookData } = await supabase
          .from("books")
          .select("id, title, image_url, author, book_type, ebook_file_url")
          .in("id", bookIds);
        const bookMap = new Map<string, BookInfo>();
        (bookData || []).forEach((b: any) => bookMap.set(b.id, b));
        setBooks(bookMap);
      }

      const courseIds = [...new Set(allUserOrders.filter(o => o.product_type === "course").map(o => o.product_id))];
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

  const handleProfileSave = async () => {
    if (!user) return;
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      toast.error("নাম লিখুন");
      return;
    }

    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
      })
      .eq("user_id", user.id);
    setProfileSaving(false);

    if (error) {
      toast.error("প্রোফাইল আপডেট করা যায়নি");
    } else {
      toast.success("প্রোফাইল আপডেট হয়েছে");
    }
  };

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
        <p className="mt-2 text-muted-foreground">আপনার কেনা ইবুক, কোর্স ও অর্ডার হিস্ট্রি এখান থেকে দেখুন</p>

        <Tabs defaultValue="ebooks" className="mt-6 sm:mt-8">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:max-w-3xl sm:grid-cols-5">
              <TabsTrigger value="ebooks" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> ইবুক ({ebookOrders.length})
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
                <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> কোর্স ({courseOrders.length})
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
                <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> বুকমার্ক ({bookmarkedPosts.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> অর্ডার ({allOrders.length})
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 whitespace-nowrap text-xs sm:text-sm">
                <UserCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> প্রোফাইল
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Ebook Tab */}
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
                              <Link to={`/read/${book.id}`}>
                                <Eye className="h-4 w-4" /> পড়ুন
                              </Link>
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

          {/* Course Tab */}
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
                          <Link to={`/enrolled/${course.id}`}>
                            <PlayCircle className="h-4 w-4" /> কোর্স শুরু করুন
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="mt-6">
            {bookmarkedPosts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">কোনো বুকমার্ক নেই</h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনি এখনো কোনো ব্লগ পোস্ট বুকমার্ক করেননি।</p>
                <Button className="mt-4" asChild>
                  <Link to="/blog">ব্লগ দেখুন</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarkedPosts.map((bp) => (
                  <div key={bp.id} className="group overflow-hidden rounded-xl border border-border bg-card">
                    {bp.cover_image_url && (
                      <Link to={`/blog/${bp.slug}`}>
                        <div className="aspect-video overflow-hidden">
                          <img src={bp.cover_image_url} alt={bp.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                      </Link>
                    )}
                    <div className="p-4">
                      {bp.category && <Badge variant="secondary" className="mb-2 text-xs">{bp.category}</Badge>}
                      <Link to={`/blog/${bp.slug}`}>
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{bp.title}</h3>
                      </Link>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(bp.created_at).toLocaleDateString("bn-BD")}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={async () => {
                            await supabase.from("bookmarks").delete().eq("id", bp.id);
                            setBookmarkedPosts((prev) => prev.filter((p) => p.id !== bp.id));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> সরান
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Order History Tab */}
          <TabsContent value="orders" className="mt-6">
            {allOrders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">কোনো অর্ডার নেই</h3>
                <p className="mt-1 text-sm text-muted-foreground">আপনি এখনো কোনো অর্ডার করেননি।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allOrders.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={order.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{order.order_id}</span>
                          <Badge variant={sc.variant} className="gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" /> {sc.label}
                          </Badge>
                        </div>
                        <h4 className="mt-1 font-semibold text-foreground line-clamp-1">{order.product_title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{order.product_type === "book" ? "বই" : "কোর্স"}</span>
                          <span>৳{order.price}</span>
                          <span>{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
                          <span>{new Date(order.created_at).toLocaleDateString("bn-BD")}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {order.product_type === "book" ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/book/${order.product_id}`}>বিস্তারিত</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/course/${order.product_id}`}>বিস্তারিত</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">প্রোফাইল তথ্য</h3>
              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input id="email" value={email} disabled className="mt-1 bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">ইমেইল পরিবর্তন করা যায় না</p>
                  </div>
                  <div>
                    <Label htmlFor="fullName">পুরো নাম *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={100}
                      placeholder="আপনার নাম"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">মোবাইল নম্বর</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      placeholder="01XXXXXXXXX"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">ঠিকানা</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      maxLength={500}
                      placeholder="আপনার ঠিকানা লিখুন"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleProfileSave} disabled={profileSaving} className="w-full gap-2">
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {profileSaving ? "সেভ হচ্ছে..." : "প্রোফাইল আপডেট করুন"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;

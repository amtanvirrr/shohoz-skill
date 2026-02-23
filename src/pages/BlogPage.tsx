import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowRight, Search, Eye, TrendingUp, Clock, Tag, ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ScrollReveal } from "@/hooks/useScrollReveal";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string;
  view_count: number;
}

const BlogPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const POSTS_PER_PAGE = 6;

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, content, cover_image_url, category, tags, author_name, published_at, view_count")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  // Fetch user bookmarks
  useEffect(() => {
    if (!user) { setBookmarkedIds([]); return; }
    supabase
      .from("bookmarks")
      .select("blog_post_id")
      .eq("user_id", user.id)
      .then(({ data }) => setBookmarkedIds((data || []).map((b) => b.blog_post_id)));
  }, [user]);

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  const allTags = [...new Set(posts.flatMap((p) => p.tags || []).filter(Boolean))];
  const popularPosts = [...posts].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
  const bookmarkedPosts = posts.filter((p) => bookmarkedIds.includes(p.id));

  const filtered = posts.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.category === selectedCategory;
    const matchTag = !selectedTag || (p.tags && p.tags.includes(selectedTag));
    return matchSearch && matchCat && matchTag;
  });

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginatedPosts = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedTag]);

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <ScrollReveal>
        <div className="mb-14 text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            আমাদের ব্লগ
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            জ্ঞান ও অনুপ্রেরণা
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            স্কিল ডেভেলপমেন্ট, ক্যারিয়ার গাইড এবং টিপস নিয়ে আমাদের লেটেস্ট আর্টিকেল পড়ুন।
          </p>
        </div>
      </ScrollReveal>

      {/* Search & Filter */}
      <ScrollReveal delay={100}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="আর্টিকেল খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 glass-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                !selectedCategory ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              সব
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                  selectedCategory === cat ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <ScrollReveal delay={150}>
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setSelectedTag("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ${
                !selectedTag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              সব ট্যাগ
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ${
                  selectedTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </ScrollReveal>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Posts */}
          {loading ? (
            <div className="grid gap-8 md:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl glass-card p-4">
                  <div className="mb-4 h-48 rounded-lg bg-muted" />
                  <div className="mb-2 h-4 w-1/3 rounded bg-muted" />
                  <div className="mb-2 h-6 rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">কোনো আর্টিকেল পাওয়া যায়নি।</p>
          ) : (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                {paginatedPosts.map((post, index) => (
                  <ScrollReveal key={post.id} delay={index * 80}>
                    <Link
                      to={`/blog/${post.slug}`}
                      className={`group relative block overflow-hidden rounded-2xl glass-card shimmer transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${
                        index === 0 && currentPage === 1 ? "md:col-span-2" : ""
                      }`}
                    >
                      {post.cover_image_url && (
                        <div className={`overflow-hidden ${index === 0 && currentPage === 1 ? "aspect-[21/9]" : "aspect-video"}`}>
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="mb-3 flex items-center gap-2">
                          {post.category && (
                            <Badge variant="secondary" className="rounded-full font-medium">
                              {post.category}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {Math.max(1, Math.ceil(post.content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200))} মিনিট
                          </span>
                        </div>
                        <h2 className={`mb-3 font-display font-bold text-foreground line-clamp-2 transition-colors duration-200 group-hover:text-primary ${
                          index === 0 && currentPage === 1 ? "text-2xl md:text-3xl" : "text-lg"
                        }`}>
                          {post.title}
                        </h2>
                        <p className={`mb-5 text-muted-foreground line-clamp-3 leading-relaxed ${
                          index === 0 && currentPage === 1 ? "text-base" : "text-sm"
                        }`}>{post.excerpt}</p>
                        <div className="flex items-center justify-between border-t border-border/50 pt-4">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {post.author_name && (
                              <span className="flex items-center gap-1.5 font-medium">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  {post.author_name.charAt(0)}
                                </div>
                                {post.author_name}
                              </span>
                            )}
                            {post.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(post.published_at).toLocaleDateString("bn-BD")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" /> {post.view_count || 0}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="min-w-[36px]"
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {filtered.length}টি আর্টিকেলের মধ্যে {(currentPage - 1) * POSTS_PER_PAGE + 1}-{Math.min(currentPage * POSTS_PER_PAGE, filtered.length)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        {!loading && (popularPosts.length > 0 || bookmarkedPosts.length > 0) && (
          <aside className="w-full shrink-0 lg:w-80 xl:w-96">
            <div className="sticky top-24 space-y-6">
              {/* Bookmarked Posts */}
              {bookmarkedPosts.length > 0 && (
                <ScrollReveal direction="right" delay={100}>
                  <div className="rounded-2xl glass-card p-6">
                    <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Bookmark className="h-4 w-4 text-primary" />
                      </span>
                      বুকমার্ক করা আর্টিকেল
                    </h3>
                    <div className="space-y-3">
                      {bookmarkedPosts.map((p) => (
                        <Link key={p.id} to={`/blog/${p.slug}`} className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                          {p.cover_image_url && (
                            <img src={p.cover_image_url} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors group-hover:text-primary">{p.title}</p>
                            <span className="text-xs text-muted-foreground">{p.category}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* Popular Posts */}
              {popularPosts.length > 0 && (
                <ScrollReveal direction="right" delay={200}>
                  <div className="rounded-2xl glass-card p-6">
                    <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                        <TrendingUp className="h-4 w-4 text-accent" />
                      </span>
                      জনপ্রিয় আর্টিকেল
                    </h3>
                    <div className="space-y-1">
                      {popularPosts.map((p, i) => (
                        <Link key={p.id} to={`/blog/${p.slug}`} className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors group-hover:text-primary">{p.title}</p>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" /> {p.view_count || 0} বার পড়া হয়েছে
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default BlogPage;

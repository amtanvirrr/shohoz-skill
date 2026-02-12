import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowRight, Search, Eye, TrendingUp, Clock, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

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

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  const allTags = [...new Set(posts.flatMap((p) => p.tags || []).filter(Boolean))];
  const popularPosts = [...posts].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);

  const filtered = posts.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.category === selectedCategory;
    const matchTag = !selectedTag || (p.tags && p.tags.includes(selectedTag));
    return matchSearch && matchCat && matchTag;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">ব্লগ</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          স্কিল ডেভেলপমেন্ট, ক্যারিয়ার গাইড এবং টিপস নিয়ে আমাদের লেটেস্ট আর্টিকেল পড়ুন।
        </p>
      </div>

      {/* Search & Filter */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="আর্টিকেল খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            সব
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setSelectedTag("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedTag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            সব ট্যাগ
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1">
          {/* Posts */}
          {loading ? (
            <div className="grid gap-8 md:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
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
            <div className="grid gap-8 md:grid-cols-2">
              {filtered.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg"
                >
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {post.category && (
                      <Badge variant="secondary" className="mb-3">
                        {post.category}
                      </Badge>
                    )}
                    <h2 className="mb-2 font-display text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary">
                      {post.title}
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {post.author_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {post.author_name}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.published_at).toLocaleDateString("bn-BD")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {Math.max(1, Math.ceil(post.content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200))} মিনিট
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {post.view_count || 0}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Popular Posts */}
        {!loading && popularPosts.length > 0 && (
          <aside className="w-full shrink-0 lg:w-72 xl:w-80">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" /> জনপ্রিয় আর্টিকেল
              </h3>
              <div className="space-y-4">
                {popularPosts.map((p, i) => (
                  <Link key={p.id} to={`/blog/${p.slug}`} className="group flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{p.title}</p>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Eye className="h-3 w-3" /> {p.view_count || 0} বার পড়া হয়েছে
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default BlogPage;

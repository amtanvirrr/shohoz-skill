import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  meta_title: string | null;
  meta_description: string | null;
}

const BlogDetailPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      setPost(data as BlogPost | null);
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (post) {
      document.title = post.meta_title || post.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", post.meta_description || post.excerpt);
    }
  }, [post]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="aspect-video rounded-xl bg-muted" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">আর্টিকেল পাওয়া যায়নি</h1>
        <Button asChild className="mt-6">
          <Link to="/blog">ব্লগে ফিরে যান</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> ব্লগে ফিরে যান
        </Link>

        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {post.category && <Badge variant="secondary">{post.category}</Badge>}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" /> {post.author_name}
          </span>
          {post.published_at && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.published_at).toLocaleDateString("bn-BD", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">{post.title}</h1>

        {/* Cover */}
        {post.cover_image_url && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img src={post.cover_image_url} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default BlogDetailPage;

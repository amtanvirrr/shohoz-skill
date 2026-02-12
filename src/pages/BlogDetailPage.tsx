import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowLeft, Tag, MessageCircle, Trash2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

interface BlogComment {
  id: string;
  blog_post_id: string;
  user_id: string;
  commenter_name: string;
  comment: string;
  created_at: string;
}

const BlogDetailPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("blog_post_id", postId)
      .order("created_at", { ascending: true });
    setComments((data as BlogComment[]) || []);
  };

  useEffect(() => {
    if (post?.id) fetchComments(post.id);
  }, [post?.id]);

  const handleSubmitComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    setSubmitting(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("blog_comments").insert({
      blog_post_id: post.id,
      user_id: user.id,
      commenter_name: profile?.full_name || user.email || "Unknown",
      comment: newComment.trim(),
    });
    if (error) {
      toast.error("মন্তব্য পোস্ট করতে সমস্যা হয়েছে");
    } else {
      toast.success("মন্তব্য সফলভাবে পোস্ট হয়েছে");
      setNewComment("");
      fetchComments(post.id);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("blog_comments").delete().eq("id", commentId);
    if (!error && post) {
      toast.success("মন্তব্য মুছে ফেলা হয়েছে");
      fetchComments(post.id);
    }
  };

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

        {/* Comments Section */}
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground">
            <MessageCircle className="h-5 w-5" /> মন্তব্য ({comments.length})
          </h2>

          {/* Comment Form */}
          {user ? (
            <div className="mb-8 space-y-3">
              <Textarea
                placeholder="আপনার মন্তব্য লিখুন..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()} size="sm">
                <Send className="mr-2 h-4 w-4" /> {submitting ? "পোস্ট হচ্ছে..." : "মন্তব্য করুন"}
              </Button>
            </div>
          ) : (
            <p className="mb-8 text-sm text-muted-foreground">
              মন্তব্য করতে <Link to="/login" className="text-primary underline">লগইন করুন</Link>।
            </p>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্য করুন!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{c.commenter_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                    {user?.id === c.user_id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteComment(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default BlogDetailPage;

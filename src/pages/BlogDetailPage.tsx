import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowLeft, Tag, MessageCircle, Trash2, Send, Facebook, Share2, Link2, Copy } from "lucide-react";
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

        {/* Social Share */}
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">শেয়ার করুন:</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
          >
            <Facebook className="h-4 w-4" /> Facebook
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`, '_blank')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("লিংক কপি হয়েছে!");
            }}
          >
            <Copy className="h-4 w-4" /> লিংক কপি
          </Button>
        </div>

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

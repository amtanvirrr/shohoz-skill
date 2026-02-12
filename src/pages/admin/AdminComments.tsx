import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  blog_post_id: string;
  user_id: string;
  commenter_name: string;
  comment: string;
  is_approved: boolean;
  created_at: string;
  blog_posts?: { title: string; slug: string } | null;
}

const AdminComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const fetchComments = async () => {
    const { data } = await supabase
      .from("blog_comments")
      .select("*, blog_posts(title, slug)")
      .order("created_at", { ascending: false });
    setComments((data as Comment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, []);

  const toggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase.from("blog_comments").update({ is_approved: !current }).eq("id", id);
    if (error) { toast.error("আপডেট করতে সমস্যা হয়েছে"); return; }
    toast.success(!current ? "মন্তব্য অনুমোদিত হয়েছে" : "মন্তব্য লুকানো হয়েছে");
    fetchComments();
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("blog_comments").delete().eq("id", id);
    if (error) { toast.error("মুছতে সমস্যা হয়েছে"); return; }
    toast.success("মন্তব্য মুছে ফেলা হয়েছে");
    fetchComments();
  };

  const filtered = comments.filter((c) => {
    if (filter === "approved") return c.is_approved;
    if (filter === "pending") return !c.is_approved;
    return true;
  });

  const pendingCount = comments.filter((c) => !c.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">কমেন্ট মডারেশন</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} পেন্ডিং</Badge>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "approved", "pending"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? `সব (${comments.length})` : f === "approved" ? `অনুমোদিত (${comments.filter(c => c.is_approved).length})` : `পেন্ডিং (${pendingCount})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">কোনো মন্তব্য নেই</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>মন্তব্যকারী</TableHead>
                <TableHead>মন্তব্য</TableHead>
                <TableHead>পোস্ট</TableHead>
                <TableHead>তারিখ</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.commenter_name}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{c.comment}</TableCell>
                  <TableCell className="text-sm">{c.blog_posts?.title || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("bn-BD")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_approved ? "default" : "secondary"}>
                      {c.is_approved ? "অনুমোদিত" : "পেন্ডিং"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => toggleApproval(c.id, c.is_approved)}
                        title={c.is_approved ? "লুকান" : "অনুমোদন করুন"}
                      >
                        {c.is_approved ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>মন্তব্য মুছে ফেলবেন?</AlertDialogTitle>
                            <AlertDialogDescription>এই মন্তব্যটি স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>বাতিল</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteComment(c.id)}>মুছে ফেলুন</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminComments;

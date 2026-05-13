import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Search, Trash2, UserX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    let list = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.address?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "oldest") list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === "name") list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    else list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [users, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("profiles").delete().in("id", ids);
    if (error) {
      toast({ title: "ডিলিট ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length}টি ইউজার ডিলিট হয়েছে` });
      setSelectedIds(new Set());
      fetchUsers();
    }
    setShowDeleteDialog(false);
  };

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Address", "Joined"];
    const rows = filtered.map((u) => [u.full_name, u.phone, u.email, u.address, new Date(u.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length}টি ইউজার CSV-তে এক্সপোর্ট হয়েছে ✅` });
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <span className="ml-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{users.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="নাম, ফোন, ইমেইল বা ঠিকানা দিয়ে সার্চ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">নতুন আগে</SelectItem>
            <SelectItem value="oldest">পুরাতন আগে</SelectItem>
            <SelectItem value="name">নাম অনুসারে</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-foreground">{selectedIds.size}টি নির্বাচিত</span>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> ডিলিট
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>বাতিল</Button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg glass-card p-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={UserX}
            title={searchQuery ? "কোনো ইউজার পাওয়া যায়নি" : "এখনো কোনো ইউজার নেই"}
            description={searchQuery ? "সার্চ পরিবর্তন করে দেখুন।" : undefined}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg glass-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-3 font-medium text-muted-foreground">নাম</th>
                <th className="p-3 font-medium text-muted-foreground">ফোন</th>
                <th className="p-3 font-medium text-muted-foreground">ইমেইল</th>
                <th className="p-3 font-medium text-muted-foreground">ঠিকানা</th>
                <th className="p-3 font-medium text-muted-foreground">যোগদান</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className={`border-b border-border transition-colors hover:bg-muted/20 ${selectedIds.has(user.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelect(user.id)}
                    />
                  </td>
                  <td className="p-3 font-medium text-foreground">{user.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{user.phone || "—"}</td>
                  <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate">{user.address || "—"}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(user.created_at).toLocaleDateString("bn-BD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ইউজার ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size}টি ইউজারের প্রোফাইল ডিলিট হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ডিলিট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;

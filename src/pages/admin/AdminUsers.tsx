import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers((data as Profile[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Address", "Joined"];
    const rows = users.map((u) => [u.full_name, u.phone, u.email, u.address, new Date(u.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : users.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No users yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Phone</th><th className="pb-3 pr-4">Email</th><th className="pb-3">Joined</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">{user.full_name || "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{user.phone || "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{user.email || "—"}</td>
                  <td className="py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

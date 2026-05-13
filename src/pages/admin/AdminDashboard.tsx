import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, GraduationCap, ShoppingCart, Users } from "lucide-react";
import CtaAnalyticsPanel from "@/components/admin/CtaAnalyticsPanel";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ books: 0, courses: 0, orders: 0, users: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [b, c, o, u] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        books: b.count ?? 0,
        courses: c.count ?? 0,
        orders: o.count ?? 0,
        users: u.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Books", value: stats.books, icon: BookOpen, color: "text-accent" },
    { label: "Courses", value: stats.courses, icon: GraduationCap, color: "text-primary" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-success" },
    { label: "Users", value: stats.users, icon: Users, color: "text-foreground" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl glass-card p-5 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <CtaAnalyticsPanel />
      </div>
    </div>
  );
};

export default AdminDashboard;

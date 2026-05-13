import { Link, useLocation } from "react-router-dom";
import { Home, GraduationCap, BookOpen, HelpCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { to: "/", label: "হোম", icon: Home },
  { to: "/courses", label: "কোর্স", icon: GraduationCap },
  { to: "/books", label: "বই", icon: BookOpen },
  { to: "/quizzes", label: "কুইজ", icon: HelpCircle },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (to: string) => {
    const p = location.pathname;
    if (to === "/") return p === "/";
    if (to === "/courses") return p === "/courses" || p.startsWith("/course/") || p.startsWith("/enrolled/");
    if (to === "/books") return p === "/books" || p.startsWith("/book/") || p.startsWith("/read/");
    if (to === "/quizzes") return p === "/quizzes" || p.startsWith("/quiz/");
    if (to === "/dashboard") return p === "/dashboard";
    return p.startsWith(to);
  };

  const dashActive = isActive("/dashboard");
  const dashTo = user ? "/dashboard" : "/login?redirect=/dashboard";

  const renderTab = (tab: typeof tabs[number]) => {
    const Icon = tab.icon;
    const active = isActive(tab.to);
    return (
      <Link
        key={tab.to}
        to={tab.to}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-all duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span
          className={`flex h-8 w-10 items-center justify-center rounded-lg transition-colors ${
            active ? "bg-primary/10" : ""
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="leading-none">{tab.label}</span>
        <span
          className={`h-1 w-1 rounded-full transition-colors ${
            active ? "bg-primary" : "bg-transparent"
          }`}
        />
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pt-2 pb-3"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-label="মোবাইল নেভিগেশন"
    >
      <div className="relative mx-auto flex max-w-md items-stretch justify-between rounded-2xl glass-card border border-border/40 backdrop-blur-xl shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] px-2">
        {tabs.slice(0, 2).map(renderTab)}

        <div className="flex w-16 flex-col items-center justify-end pb-1.5">
          <Link
            to={dashTo}
            aria-label="ড্যাশবোর্ড"
            className={`-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              dashActive ? "scale-105" : ""
            }`}
          >
            <LayoutDashboard className="h-6 w-6" />
          </Link>
          <span
            className={`mt-1 text-[11px] font-medium leading-none ${
              dashActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            ড্যাশবোর্ড
          </span>
        </div>

        {tabs.slice(2).map(renderTab)}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

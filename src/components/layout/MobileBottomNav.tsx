import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, GraduationCap, BookOpen, HelpCircle, Menu, Newspaper, Info, Phone, LayoutDashboard, LogIn, UserPlus, LogOut, Moon, Sun, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { to: "/", label: "হোম", icon: Home },
  { to: "/courses", label: "কোর্স", icon: GraduationCap },
  { to: "/books", label: "বই", icon: BookOpen },
  { to: "/quizzes", label: "কুইজ", icon: HelpCircle },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => {
    const p = location.pathname;
    if (to === "/") return p === "/";
    if (to === "/courses") return p === "/courses" || p.startsWith("/course/") || p.startsWith("/enrolled/");
    if (to === "/books") return p === "/books" || p.startsWith("/book/") || p.startsWith("/read/");
    if (to === "/quizzes") return p === "/quizzes" || p.startsWith("/quiz/");
    return p.startsWith(to);
  };

  const moreActive = !tabs.some((t) => isActive(t.to));

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const moreLinks = [
    { to: "/blog", label: "ব্লগ", icon: Newspaper },
    { to: "/about", label: "আমাদের সম্পর্কে", icon: Info },
    { to: "/contact", label: "যোগাযোগ", icon: Phone },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pt-2 pb-3"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-label="মোবাইল নেভিগেশন"
    >
      <div className="relative mx-auto flex max-w-md items-stretch justify-between rounded-2xl glass-card border border-border/40 backdrop-blur-xl shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] px-2">
        {tabs.slice(0, 2).map((tab) => {
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
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <div className="flex w-16 flex-col items-center justify-end pb-1.5">
            <SheetTrigger asChild>
              <button
                className={`-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  open ? "scale-105" : ""
                }`}
                aria-label="আরও মেনু"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <span
              className={`mt-1 text-[11px] font-medium leading-none ${
                moreActive && open ? "text-primary" : "text-muted-foreground"
              }`}
            >
              মেনু
            </span>
          </div>

          {tabs.slice(2).map((tab) => {
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
          })}

            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-right">মেনু</SheetTitle>
              </SheetHeader>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {moreLinks.map((l) => {
                  const Icon = l.icon;
                  const active = isActive(l.to);
                  return (
                    <SheetClose asChild key={l.to}>
                      <Link
                        to={l.to}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 p-3 text-xs font-medium transition-colors ${
                          active ? "bg-primary/10 text-primary border-primary/40" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {l.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              <div className="my-4 h-px bg-border/60" />

              <div className="flex flex-col gap-2">
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        ড্যাশবোর্ড
                      </Link>
                    </SheetClose>
                    {isAdmin && (
                      <SheetClose asChild>
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          অ্যাডমিন প্যানেল
                        </Link>
                      </SheetClose>
                    )}
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/login"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <LogIn className="h-4 w-4" />
                        লগইন
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/register"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <UserPlus className="h-4 w-4" />
                        রেজিস্টার
                      </Link>
                    </SheetClose>
                  </>
                )}

                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Sun className="h-4 w-4 hidden dark:block" />
                  <Moon className="h-4 w-4 block dark:hidden" />
                  <span className="dark:hidden">ডার্ক মোড</span>
                  <span className="hidden dark:inline">লাইট মোড</span>
                </button>

                {user && (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    লগআউট
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
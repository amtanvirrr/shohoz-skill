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

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-header border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="মোবাইল নেভিগেশন"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={`flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  moreActive && open ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="আরও মেনু"
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all ${
                    open ? "bg-primary/10" : ""
                  }`}
                >
                  <Menu className="h-5 w-5" />
                </span>
                <span className="leading-none">মেনু</span>
              </button>
            </SheetTrigger>
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
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
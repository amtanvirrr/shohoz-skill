import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { to: "/", label: "হোম" },
  { to: "/courses", label: "কোর্স" },
  { to: "/books", label: "বই" },
  { to: "/quizzes", label: "কুইজ" },
  { to: "/blog", label: "ব্লগ" },
  { to: "/about", label: "আমাদের সম্পর্কে" },
  { to: "/contact", label: "যোগাযোগ" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();

  useEffect(() => {
    if (!user) { setAvatarUrl(null); setProfileName(""); return; }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url || null);
        setProfileName(data.full_name || "");
      }
    };
    fetchProfile();
  }, [user]);

  const initials = profileName
    ? profileName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <img src={settings.logo_url || "/favicon.webp"} alt={settings.site_name} className="h-9 w-9 rounded-lg" />
          {settings.site_name}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => {
              document.documentElement.classList.toggle("dark");
              localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Toggle dark mode"
          >
            <Sun className="h-5 w-5 hidden dark:block" />
            <Moon className="h-5 w-5 block dark:hidden" />
          </button>
          {user ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">ড্যাশবোর্ড</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin">অ্যাডমিন</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                লগআউট
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">লগইন</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">রেজিস্টার</Link>
              </Button>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-foreground hover:bg-secondary md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          {user && (
            <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary">
              <Avatar className="h-9 w-9 border border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{profileName || user.email}</p>
                {profileName && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
              </div>
            </Link>
          )}
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => {
              document.documentElement.classList.toggle("dark");
              localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
            }}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
            <span className="dark:hidden">ডার্ক মোড</span>
            <span className="hidden dark:inline">লাইট মোড</span>
          </button>
          <div className="mt-4 flex gap-3">
            {user ? (
              <>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>ড্যাশবোর্ড</Link>
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>অ্যাডমিন</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>লগআউট</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/login">লগইন</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/register">রেজিস্টার</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

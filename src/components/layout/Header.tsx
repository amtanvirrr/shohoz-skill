import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
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
    <header className="sticky top-0 z-50 glass-header transition-all duration-300">
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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:translate-y-[-1px]"
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

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => {
              document.documentElement.classList.toggle("dark");
              localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
            aria-label="Toggle dark mode"
          >
            <Sun className="h-5 w-5 hidden dark:block" />
            <Moon className="h-5 w-5 block dark:hidden" />
          </button>
          {user ? (
            <Link to="/dashboard" aria-label="ড্যাশবোর্ড">
              <Avatar className="h-8 w-8 border border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">লগইন</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

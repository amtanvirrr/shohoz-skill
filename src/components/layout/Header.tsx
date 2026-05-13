import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Moon, Sun, Search, LayoutDashboard, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import CommandPalette from "@/components/CommandPalette";

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
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.platform));
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setProfileName("");
      return;
    }
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
    ? profileName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-header-scrolled" : "glass-header"
        }`}
      >
        <div
          className={`container mx-auto flex items-center justify-between gap-4 px-4 transition-all duration-300 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-bold text-foreground transition-transform hover:scale-[1.02]"
          >
            <img
              src={settings.logo_url || "/favicon.webp"}
              alt={settings.site_name}
              className={`rounded-lg transition-all duration-300 ${scrolled ? "h-8 w-8" : "h-9 w-9"}`}
            />
            <span className="text-base sm:text-xl truncate max-w-[140px] sm:max-w-none">
              {settings.site_name}
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  data-active={active}
                  className={`nav-link-underline rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Command palette trigger - desktop */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors min-w-[180px]"
              aria-label="খুঁজুন"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">খুঁজুন...</span>
              <span className="kbd">{isMac ? "⌘" : "Ctrl"}+K</span>
            </button>

            {/* Mobile search button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
              aria-label="খুঁজুন"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors overflow-hidden"
              aria-label="থিম পরিবর্তন"
            >
              <Sun className="theme-toggle-icon absolute inset-0 m-auto h-5 w-5 rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100" />
              <Moon className="theme-toggle-icon absolute inset-0 m-auto h-5 w-5 rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0" />
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all"
                    aria-label="অ্যাকাউন্ট মেনু"
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-semibold">{profileName || "ইউজার"}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      ড্যাশবোর্ড
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        অ্যাডমিন প্যানেল
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    লগআউট
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">লগইন</Link>
                </Button>
                <Button variant="premium" size="sm" asChild>
                  <Link to="/register">রেজিস্টার</Link>
                </Button>
              </div>
            )}
            {!user && (
              <Button variant="premium" size="sm" asChild className="sm:hidden gap-1.5 px-3">
                <Link to="/login">
                  <UserIcon className="h-4 w-4" />
                  <span>লগইন</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
};

export default Header;

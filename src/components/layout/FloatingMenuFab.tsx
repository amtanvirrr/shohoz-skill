import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Newspaper,
  Info,
  Phone,
  LayoutDashboard,
  LogIn,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";

const SIDE_KEY = "floatingMenuSide";
const TOP_KEY = "floatingMenuTop";
const FAB_SIZE = 48;
const EDGE_INSET = 12;
const TOP_MIN = 80;
const BOTTOM_RESERVED = 160;

const FloatingMenuFab = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [topPx, setTopPx] = useState(0);
  const [leftPx, setLeftPx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [animateSnap, setAnimateSnap] = useState(true);
  const [profile, setProfile] = useState<{ name: string; avatar: string | null }>({
    name: "",
    avatar: null,
  });

  const fabRef = useRef<HTMLButtonElement | null>(null);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    startTop: 0,
    moved: false,
    pointerId: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedSide = localStorage.getItem(SIDE_KEY);
    const savedTop = Number(localStorage.getItem(TOP_KEY));
    setSide(savedSide === "left" ? "left" : "right");
    const defaultTop = Math.round(window.innerHeight * 0.55);
    const initTop = Number.isFinite(savedTop) && savedTop > 0 ? savedTop : defaultTop;
    setTopPx(clampTop(initTop));
  }, []);

  useEffect(() => {
    const onResize = () => setTopPx((t) => clampTop(t));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile({ name: "", avatar: null });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({ name: data.full_name || "", avatar: data.avatar_url || null });
    })();
  }, [user]);

  // close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  function clampTop(t: number) {
    if (typeof window === "undefined") return t;
    const max = window.innerHeight - BOTTOM_RESERVED;
    return Math.max(TOP_MIN, Math.min(t, max));
  }

  const isActive = useCallback(
    (to: string) => {
      const p = location.pathname;
      if (to === "/") return p === "/";
      return p === to || p.startsWith(to + "/");
    },
    [location.pathname]
  );

  const quickNav = [
    { to: "/", label: "হোম", icon: Home, tint: "from-primary/15 to-primary/5 text-primary" },
    { to: "/courses", label: "কোর্স", icon: GraduationCap, tint: "from-accent/20 to-accent/5 text-accent" },
    { to: "/books", label: "বই", icon: BookOpen, tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
    { to: "/quizzes", label: "কুইজ", icon: HelpCircle, tint: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400" },
  ];

  const moreLinks = [
    { to: "/blog", label: "ব্লগ", icon: Newspaper },
    { to: "/about", label: "আমাদের সম্পর্কে", icon: Info },
    { to: "/contact", label: "যোগাযোগ", icon: Phone },
  ];

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

  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const rect = fabRef.current?.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: topPx,
      moved: false,
      pointerId: e.pointerId,
    };
    if (rect) setLeftPx(rect.left);
    setAnimateSnap(false);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragState.current.moved = true;
    setTopPx(clampTop(dragState.current.startTop + dy));
    setLeftPx((prev) => {
      if (prev == null) return prev;
      const next = prev + (e.clientX - dragState.current.startX);
      dragState.current.startX = e.clientX;
      const max = window.innerWidth - FAB_SIZE - 4;
      return Math.max(4, Math.min(next, max));
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    const moved = dragState.current.moved;
    if (moved) {
      const half = window.innerWidth / 2;
      const center = (leftPx ?? e.clientX) + FAB_SIZE / 2;
      const newSide: "left" | "right" = center < half ? "left" : "right";
      setAnimateSnap(true);
      setSide(newSide);
      setLeftPx(null);
      localStorage.setItem(SIDE_KEY, newSide);
      localStorage.setItem(TOP_KEY, String(topPx));
    } else {
      setLeftPx(null);
      setOpen((o) => !o);
    }
  };

  if (typeof window === "undefined") return null;

  const sideClasses =
    side === "left"
      ? "left-0 rounded-r-3xl border-r data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
      : "right-0 rounded-l-3xl border-l data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right";

  return (
    <>
      {/* Floating draggable FAB — always on top, clickable even when sheet open */}
      <button
        ref={fabRef}
        type="button"
        aria-label={open ? "মেনু বন্ধ করুন" : "মেনু খুলুন (টেনে সরানো যাবে)"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragging(false)}
        className={`md:hidden fixed z-[70] flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background/60 backdrop-blur active:scale-95 motion-reduce:active:scale-100 ${
          animateSnap ? "transition-[left,right,top,transform] duration-300 ease-out motion-reduce:transition-none" : ""
        } ${dragging ? "cursor-grabbing scale-105" : "cursor-grab"}`}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          top: topPx,
          left: leftPx != null ? leftPx : side === "left" ? EDGE_INSET : undefined,
          right: leftPx != null ? undefined : side === "right" ? EDGE_INSET : undefined,
          touchAction: "none",
        }}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        {!open && (
          <GripVertical
            className={`pointer-events-none absolute h-3 w-3 opacity-60 ${
              side === "left" ? "right-0.5" : "left-0.5"
            }`}
          />
        )}
      </button>

      {/* Non-modal Sheet so the FAB stays interactive */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
        {open && (
          <button
            type="button"
            aria-label="মেনু বন্ধ করুন"
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
          />
        )}
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            onInteractOutside={(e) => e.preventDefault()}
            className={`md:hidden fixed top-0 bottom-0 z-50 w-[85vw] max-w-sm flex flex-col overflow-hidden border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl outline-none ${sideClasses}`}
          >
            <DialogPrimitive.Title className="sr-only">মেনু</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              মূল নেভিগেশন এবং অ্যাকাউন্ট অপশন
            </DialogPrimitive.Description>

            {/* Header / profile */}
            <div className="relative px-5 pt-6 pb-5 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 font-display font-bold text-foreground"
                >
                  <img
                    src={settings.logo_url || "/favicon.webp"}
                    alt={settings.site_name}
                    className="h-8 w-8 rounded-lg"
                  />
                  <span className="text-base truncate">{settings.site_name}</span>
                </Link>
              </div>

              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 transition-colors hover:bg-secondary/60"
                >
                  <Avatar className="h-11 w-11 border border-border">
                    {profile.avatar ? <AvatarImage src={profile.avatar} alt={profile.name} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile.name || "ইউজার"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ) : (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-3">
                  <p className="text-sm font-semibold text-foreground">স্বাগতম! 👋</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    পড়াশোনা শুরু করতে লগইন বা রেজিস্টার করুন।
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      <LogIn className="h-3.5 w-3.5" /> লগইন
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-accent px-3 py-2 text-xs font-semibold text-primary-foreground shadow shadow-primary/20"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> রেজিস্টার
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Quick nav grid */}
              <p className="mt-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                দ্রুত যাও
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickNav.map((q) => {
                  const Icon = q.icon;
                  const active = isActive(q.to);
                  return (
                    <Link
                      key={q.to}
                      to={q.to}
                      onClick={() => setOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.97] motion-reduce:active:scale-100 ${
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:border-border bg-background/40"
                      }`}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${q.tint}`}>
                        <Icon className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{q.label}</span>
                      {active && (
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* More */}
              <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                আরও
              </p>
              <div className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden divide-y divide-border/40">
                {moreLinks.map((l) => {
                  const Icon = l.icon;
                  const active = isActive(l.to);
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 text-sm transition-colors ${
                        active ? "bg-primary/5 text-primary" : "text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/70 text-foreground/80">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 font-medium">{l.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>

              {/* Account */}
              {user && (
                <>
                  <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    অ্যাকাউন্ট
                  </p>
                  <div className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden divide-y divide-border/40">
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-sm text-foreground hover:bg-secondary/60"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <LayoutDashboard className="h-4 w-4" />
                      </span>
                      <span className="flex-1 font-medium">ড্যাশবোর্ড</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 text-sm text-foreground hover:bg-secondary/60"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <span className="flex-1 font-medium">অ্যাডমিন প্যানেল</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-3 py-3 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-left font-medium">লগআউট</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer — theme switch */}
            <div className="border-t border-border/40 bg-background/60 px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">থিম</span>
                <button
                  onClick={toggleTheme}
                  className="relative flex h-9 w-[88px] items-center rounded-full border border-border/60 bg-secondary/60 p-1 text-xs font-semibold"
                  aria-label="থিম পরিবর্তন"
                >
                  <span className="absolute top-1 h-7 w-[40px] rounded-full bg-background shadow transition-all duration-300 left-1 dark:left-[44px]" />
                  <span className="relative z-10 flex h-7 w-[40px] items-center justify-center text-foreground">
                    <Sun className="h-3.5 w-3.5" />
                  </span>
                  <span className="relative z-10 flex h-7 w-[40px] items-center justify-center text-foreground">
                    <Moon className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
};

export default FloatingMenuFab;

import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
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
  GripVertical,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const SIDE_KEY = "floatingMenuSide";
const TOP_KEY = "floatingMenuTop";
const FAB_SIZE = 48;
const EDGE_INSET = 12;
const TOP_MIN = 80;
const BOTTOM_RESERVED = 160; // bottom nav + safe area

const FloatingMenuFab = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [topPx, setTopPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animateSnap, setAnimateSnap] = useState(true);

  const fabRef = useRef<HTMLButtonElement | null>(null);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    startTop: 0,
    moved: false,
    pointerId: 0,
  });

  // Init from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedSide = localStorage.getItem(SIDE_KEY);
    const savedTop = Number(localStorage.getItem(TOP_KEY));
    setSide(savedSide === "left" ? "left" : "right");
    const defaultTop = Math.round(window.innerHeight * 0.55);
    const initTop = Number.isFinite(savedTop) && savedTop > 0 ? savedTop : defaultTop;
    setTopPx(clampTop(initTop));
  }, []);

  // Re-clamp on resize
  useEffect(() => {
    const onResize = () => setTopPx((t) => clampTop(t));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: topPx,
      moved: false,
      pointerId: e.pointerId,
    };
    setAnimateSnap(false);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragState.current.moved = true;
    setTopPx(clampTop(dragState.current.startTop + dy));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setDragging(false);
    const moved = dragState.current.moved;
    if (moved) {
      const half = window.innerWidth / 2;
      const newSide: "left" | "right" = e.clientX < half ? "left" : "right";
      setAnimateSnap(true);
      setSide(newSide);
      localStorage.setItem(SIDE_KEY, newSide);
      localStorage.setItem(TOP_KEY, String(topPx));
    } else {
      // treat as click
      setOpen(true);
    }
  };

  if (typeof window === "undefined") return null;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        aria-label="মেনু খুলুন (টেনে সরানো যাবে)"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragging(false)}
        className={`md:hidden fixed z-[60] flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background/60 backdrop-blur active:scale-95 motion-reduce:active:scale-100 ${
          animateSnap ? "transition-[left,right,top,transform] duration-300 ease-out motion-reduce:transition-none" : ""
        } ${dragging ? "cursor-grabbing scale-105" : "cursor-grab"}`}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          top: topPx,
          left: side === "left" ? EDGE_INSET : undefined,
          right: side === "right" ? EDGE_INSET : undefined,
          touchAction: "none",
        }}
      >
        <Menu className="h-5 w-5" />
        <GripVertical
          className={`pointer-events-none absolute h-3 w-3 opacity-60 ${
            side === "left" ? "right-0.5" : "left-0.5"
          }`}
        />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={side}
          className="w-[85vw] sm:max-w-sm h-full overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className={side === "left" ? "text-left" : "text-right"}>
              মেনু
            </SheetTitle>
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
                      active
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "text-foreground hover:bg-secondary"
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
    </>
  );
};

export default FloatingMenuFab;

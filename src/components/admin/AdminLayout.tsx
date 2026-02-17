import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  BookOpen, GraduationCap, Users, ShoppingCart, Settings,
  LayoutDashboard, HelpCircle, LogOut, Menu, X, ChevronRight, ChevronDown, Star, FileText, MessageCircle, Mail, CreditCard, Truck, Image,
  Globe, Home, Phone, Megaphone, Package, MailCheck, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/hero", label: "Hero Banner", icon: Image },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/courses", label: "Courses", icon: GraduationCap },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/quizzes", label: "Quizzes", icon: HelpCircle },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/comments", label: "Comments", icon: MessageCircle },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
];

const settingsSubLinks = [
  { hash: "branding", label: "সাইট ব্র্যান্ডিং", icon: Globe },
  { hash: "homepage", label: "হোমপেজ সেকশন", icon: Home },
  { hash: "logos", label: "লোগো ও আইকন", icon: Image },
  { hash: "pixel", label: "Meta Pixel", icon: Megaphone },
  { hash: "contact", label: "যোগাযোগ তথ্য", icon: Phone },
  { hash: "contact-page", label: "কন্টাক্ট পেজ", icon: FileText },
  { hash: "newsletter-settings", label: "নিউজলেটার", icon: Mail },
  { hash: "about", label: "About পেজ", icon: Info },
  { hash: "courier", label: "কুরিয়ার সেটিংস", icon: Package },
  { hash: "smtp", label: "ইমেইল (SMTP)", icon: MailCheck },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === "/admin/settings");
  const { settings } = useSiteSettings();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <img src={settings.admin_logo_url || "/favicon.webp"} alt={settings.site_name} className="h-8 w-8 rounded-lg" />
            Admin Panel
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          {/* Settings with sub-menu */}
          <div>
            <button
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                if (!settingsOpen) {
                  navigate("/admin/settings");
                  setSidebarOpen(false);
                }
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === "/admin/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </button>
            {settingsOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                {settingsSubLinks.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = location.hash === `#${sub.hash}`;
                  return (
                    <Link
                      key={sub.hash}
                      to={`/admin/settings#${sub.hash}`}
                      onClick={() => {
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        isSubActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <SubIcon className="h-3.5 w-3.5" />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
            <ChevronRight className="h-4 w-4" /> View Site
          </Link>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1">
        <header className="flex h-16 items-center border-b border-border bg-card px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="mr-4 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {location.pathname === "/admin/settings" ? "Settings" : sidebarLinks.find((l) => l.to === location.pathname)?.label || "Admin"}
          </h2>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

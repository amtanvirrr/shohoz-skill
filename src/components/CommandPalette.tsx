import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Newspaper,
  Info,
  Phone,
  LayoutDashboard,
  ShieldCheck,
  Moon,
  Sun,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Result = {
  id: string;
  title: string;
  type: "course" | "book" | "quiz" | "blog";
  slug: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const like = `%${q}%`;
      const [c, b, qz, bl] = await Promise.all([
        supabase.from("courses").select("id,title,slug").ilike("title", like).eq("is_published", true).limit(4),
        supabase.from("books").select("id,title,slug").ilike("title", like).eq("is_published", true).limit(4),
        supabase.from("quizzes").select("id,title,slug").ilike("title", like).eq("is_published", true).limit(4),
        supabase.from("blog_posts").select("id,title,slug").ilike("title", like).eq("is_published", true).limit(4),
      ]);
      if (cancelled) return;
      const merged: Result[] = [
        ...(c.data || []).map((x: any) => ({ id: x.id, title: x.title, slug: x.slug, type: "course" as const })),
        ...(b.data || []).map((x: any) => ({ id: x.id, title: x.title, slug: x.slug, type: "book" as const })),
        ...(qz.data || []).map((x: any) => ({ id: x.id, title: x.title, slug: x.slug, type: "quiz" as const })),
        ...(bl.data || []).map((x: any) => ({ id: x.id, title: x.title, slug: x.slug, type: "blog" as const })),
      ];
      setResults(merged);
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  };

  const typeToPath = (r: Result) => {
    switch (r.type) {
      case "course":
        return `/course/${r.slug}`;
      case "book":
        return `/book/${r.slug}`;
      case "quiz":
        return `/quiz/${r.slug}`;
      case "blog":
        return `/blog/${r.slug}`;
    }
  };

  const typeLabel = (t: Result["type"]) =>
    t === "course" ? "কোর্স" : t === "book" ? "বই" : t === "quiz" ? "কুইজ" : "ব্লগ";

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="খুঁজুন কোর্স, বই, কুইজ, ব্লগ..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.trim().length < 2 ? "টাইপ করে খুঁজুন..." : "কোনো ফলাফল পাওয়া যায়নি"}
        </CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading="ফলাফল">
              {results.map((r) => (
                <CommandItem key={`${r.type}-${r.id}`} value={`${r.title} ${r.type}`} onSelect={() => go(typeToPath(r))}>
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {typeLabel(r.type)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="পেইজ">
          <CommandItem onSelect={() => go("/")}>
            <Home /> হোম
          </CommandItem>
          <CommandItem onSelect={() => go("/courses")}>
            <GraduationCap /> কোর্স
          </CommandItem>
          <CommandItem onSelect={() => go("/books")}>
            <BookOpen /> বই
          </CommandItem>
          <CommandItem onSelect={() => go("/quizzes")}>
            <HelpCircle /> কুইজ
          </CommandItem>
          <CommandItem onSelect={() => go("/blog")}>
            <Newspaper /> ব্লগ
          </CommandItem>
          <CommandItem onSelect={() => go("/about")}>
            <Info /> আমাদের সম্পর্কে
          </CommandItem>
          <CommandItem onSelect={() => go("/contact")}>
            <Phone /> যোগাযোগ
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="অ্যাকাউন্ট">
          {user ? (
            <>
              <CommandItem onSelect={() => go("/dashboard")}>
                <LayoutDashboard /> ড্যাশবোর্ড
              </CommandItem>
              {isAdmin && (
                <CommandItem onSelect={() => go("/admin")}>
                  <ShieldCheck /> অ্যাডমিন প্যানেল
                </CommandItem>
              )}
              <CommandItem
                onSelect={async () => {
                  onOpenChange(false);
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut /> লগআউট
              </CommandItem>
            </>
          ) : (
            <>
              <CommandItem onSelect={() => go("/login")}>
                <LogIn /> লগইন
              </CommandItem>
              <CommandItem onSelect={() => go("/register")}>
                <UserPlus /> রেজিস্টার
              </CommandItem>
            </>
          )}
          <CommandItem
            onSelect={() => {
              toggleTheme();
              onOpenChange(false);
            }}
          >
            <Sun className="hidden dark:block" />
            <Moon className="block dark:hidden" />
            থিম পরিবর্তন
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

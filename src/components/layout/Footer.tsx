import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Send, CheckCircle, Sparkles, Heart, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import paymentMethodsImg from "@/assets/payment-methods.webp";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { settings } = useSiteSettings();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("সঠিক ইমেইল দিন");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: trimmed });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন!");
      } else {
        toast.error("সাবস্ক্রিপশনে সমস্যা হয়েছে");
      }
      return;
    }
    setSubscribed(true);
    setEmail("");
    toast.success("সফলভাবে সাবস্ক্রাইব হয়েছে!");
  };

  return (
    <footer className="footer-safe border-t border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Newsletter Section */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="container relative mx-auto px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-lg shadow-primary/30">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {settings.newsletter_title || "নিউজলেটার"}
            </h3>
            <p className="mt-3 text-muted-foreground">
              নতুন কোর্স, আর্টিকেল এবং স্কিল ডেভেলপমেন্ট টিপস সরাসরি আপনার ইনবক্সে পান।
            </p>
            {subscribed ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success/15 px-6 py-3 text-sm font-medium text-success animate-fade-in">
                <CheckCircle className="h-5 w-5" /> ধন্যবাদ! আপনি সাবস্ক্রাইব করেছেন।
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Input
                  type="email"
                  placeholder="আপনার ইমেইল দিন..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-full border-border bg-card/80 backdrop-blur px-5 shadow-sm sm:w-80"
                  required
                />
                <Button type="submit" disabled={loading} className="h-12 rounded-full px-8 gap-2 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
                  <Send className="h-4 w-4" />
                  {loading ? "সাবস্ক্রাইব হচ্ছে..." : "সাবস্ক্রাইব"}
                </Button>
              </form>
            )}
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              আমরা স্প্যাম পাঠাই না।
            </p>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="group inline-flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <img src={settings.footer_logo_url || "/favicon.webp"} alt={settings.site_name} className="h-8 w-8 rounded-lg transition-transform group-hover:scale-110 group-hover:rotate-3" />
              <span className="transition-colors group-hover:text-primary">{settings.site_name}</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {settings.site_description}
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">দ্রুত লিংক</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/courses" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>কোর্স
              </Link>
              <Link to="/books" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>বই
              </Link>
              <Link to="/about" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>আমাদের সম্পর্কে
              </Link>
              <Link to="/contact" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>যোগাযোগ
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">সাপোর্ট</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/contact" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>হেল্প সেন্টার
              </Link>
              <Link to="/privacy" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>প্রাইভেসি পলিসি
              </Link>
              <Link to="/terms" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>ব্যবহারের শর্তাবলী
              </Link>
              <Link to="/refund" className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="inline-block w-0 overflow-hidden transition-all group-hover:w-3 group-hover:mr-1">→</span>রিটার্ন ও রিফান্ড পলিসি
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">যোগাযোগ</h4>
            <div className="mt-3 flex flex-col gap-2">
              <a href={`mailto:${settings.contact_email}`} className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <span className="break-all">{settings.contact_email}</span>
              </a>
              <a href={`tel:${settings.contact_phone}`} className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                {settings.contact_phone}
              </a>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <span className="whitespace-pre-line pt-1">
                  {settings.registered_address || settings.contact_address}
                </span>
              </div>
              {settings.trade_license_number && (
                <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-success" />
                  ট্রেড লাইসেন্স নং: <span className="font-medium text-foreground">{settings.trade_license_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accepted payment methods banner — matches footer content width */}
        <div className="mt-10 w-full bg-white rounded-md overflow-hidden">
          <img
            src={settings.payment_banner_url || paymentMethodsImg}
            alt="Accepted payment methods"
            loading="lazy"
            className="block w-full h-auto"
          />
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <div>{settings.copyright_text || `© ${new Date().getFullYear()} সর্বস্বত্ব সংরক্ষিত।`}</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

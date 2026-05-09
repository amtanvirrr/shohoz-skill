import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import paymentMethodsImg from "@/assets/payment-methods.png";

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
    <footer className="border-t border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Newsletter Section */}
      <div className="border-b border-border/50 bg-primary/5">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {settings.newsletter_title || "নিউজলেটার"}
            </h3>
            <p className="mt-3 text-muted-foreground">
              নতুন কোর্স, আর্টিকেল এবং স্কিল ডেভেলপমেন্ট টিপস সরাসরি আপনার ইনবক্সে পান।
            </p>
            {subscribed ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-3 text-sm font-medium text-primary">
                <CheckCircle className="h-5 w-5" /> ধন্যবাদ! আপনি সাবস্ক্রাইব করেছেন।
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Input
                  type="email"
                  placeholder="আপনার ইমেইল দিন..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-full border-border bg-card px-5 sm:w-80"
                  required
                />
                <Button type="submit" disabled={loading} className="h-12 rounded-full px-8 gap-2">
                  <Send className="h-4 w-4" />
                  {loading ? "সাবস্ক্রাইব হচ্ছে..." : "সাবস্ক্রাইব"}
                </Button>
              </form>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              আমরা স্প্যাম পাঠাই না। যেকোনো সময় আনসাবস্ক্রাইব করতে পারবেন।
            </p>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <img src={settings.footer_logo_url || "/favicon.webp"} alt={settings.site_name} className="h-8 w-8 rounded-lg" />
              {settings.site_name}
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              {settings.site_description}
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">দ্রুত লিংক</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">কোর্স</Link>
              <Link to="/books" className="text-sm text-muted-foreground hover:text-primary transition-colors">বই</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">আমাদের সম্পর্কে</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">যোগাযোগ</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">সাপোর্ট</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">হেল্প সেন্টার</Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">প্রাইভেসি পলিসি</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">ব্যবহারের শর্তাবলী</Link>
              <Link to="/refund" className="text-sm text-muted-foreground hover:text-primary transition-colors">রিটার্ন ও রিফান্ড পলিসি</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">যোগাযোগ</h4>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {settings.contact_email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {settings.contact_phone}
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="whitespace-pre-line">
                  {settings.registered_address || settings.contact_address}
                </span>
              </div>
              {settings.trade_license_number && (
                <div className="text-xs text-muted-foreground">
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

        <div className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {settings.copyright_text || `© ${new Date().getFullYear()} সর্বস্বত্ব সংরক্ষিত।`}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

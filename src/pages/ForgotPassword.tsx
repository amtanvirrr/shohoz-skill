import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "ইমেইল দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "ইমেইল পাঠানো হয়েছে", description: "আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।" });
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">পাসওয়ার্ড রিসেট</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            আপনার ইমেইল দিন, আমরা রিসেট লিংক পাঠাব
          </p>

          {sent ? (
            <div className="mt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                আপনার ইমেইলে একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। দয়া করে আপনার ইমেইল চেক করুন।
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-2">লগইনে ফিরে যান</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">ইমেইল</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">লগইনে ফিরে যান</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

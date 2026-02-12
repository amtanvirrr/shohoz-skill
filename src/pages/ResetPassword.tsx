import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "পাসওয়ার্ড মিলছে না", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "পাসওয়ার্ড আপডেট হয়েছে!", description: "নতুন পাসওয়ার্ড দিয়ে লগইন করুন।" });
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">নতুন পাসওয়ার্ড সেট করুন</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            আপনার নতুন পাসওয়ার্ড দিন
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">নতুন পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="কমপক্ষে ৬ অক্ষর"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "আপডেট হচ্ছে..." : "পাসওয়ার্ড আপডেট করুন"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

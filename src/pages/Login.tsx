import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "লগইন ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "স্বাগতম!" });
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">লগইন</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">আপনার অ্যাকাউন্টে লগইন করুন</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">ইমেইল</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "লগইন হচ্ছে..." : "লগইন"}
            </Button>
          </form>

          <p className="mt-3 text-center text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link>
          </p>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            অ্যাকাউন্ট নেই?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">রেজিস্টার করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

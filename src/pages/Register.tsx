import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.email || !form.password) {
      toast({ title: "সব প্রয়োজনীয় ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "পাসওয়ার্ড মিলছে না", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.fullName,
      phone: form.phone,
    });
    setLoading(false);
    if (error) {
      toast({ title: "রেজিস্ট্রেশন ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "রেজিস্ট্রেশন সফল!", description: "আপনার ইমেইলে ভেরিফিকেশন লিংক পাঠানো হয়েছে। দয়া করে চেক করুন।" });
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">রেজিস্টার</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">নতুন অ্যাকাউন্ট তৈরি করুন</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">পূর্ণ নাম *</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">মোবাইল নম্বর *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label htmlFor="email">ইমেইল *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">পাসওয়ার্ড *</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন *</Label>
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "রেজিস্টার"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">লগইন করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

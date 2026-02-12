import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Register = () => {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast({ title: "নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.fullName,
      phone: form.phone,
    });
    setLoading(false);
    if (error) {
      toast({ title: "রেজিস্ট্রেশন ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "OTP কোড পাঠানো হয়েছে!", description: "আপনার ইমেইল চেক করুন।" });
      setStep("otp");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast({ title: "৬ সংখ্যার OTP কোড দিন", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: form.email,
      token: otp,
      type: "signup",
    });
    setVerifying(false);
    if (error) {
      toast({ title: "ভেরিফিকেশন ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফলভাবে ভেরিফাইড! 🎉" });
      navigate("/");
    }
  };

  if (step === "otp") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="mx-auto w-full max-w-md px-4">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-center font-display text-2xl font-bold text-foreground">ইমেইল ভেরিফিকেশন</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{form.email}</span> এ পাঠানো ৬ সংখ্যার কোডটি দিন
            </p>

            <div className="mt-6 flex flex-col items-center gap-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <Button onClick={handleVerifyOtp} className="w-full" disabled={verifying || otp.length < 6}>
                {verifying ? "ভেরিফাই হচ্ছে..." : "ভেরিফাই করুন"}
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              কোড পাননি?{" "}
              <button
                type="button"
                onClick={() => setStep("form")}
                className="font-medium text-primary hover:underline"
              >
                আবার চেষ্টা করুন
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">রেজিস্ট্রেশন</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">নতুন অ্যাকাউন্ট তৈরি করুন</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">পুরো নাম *</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">মোবাইল নম্বর</Label>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "রেজিস্টার করুন"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ইতোমধ্যে অ্যাকাউন্ট আছে?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">লগইন</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

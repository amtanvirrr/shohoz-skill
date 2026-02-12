import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Login = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "স্বাগতম!" });
      navigate("/");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) {
      toast({ title: "ইমেইল দিন", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: otpEmail });
    setOtpLoading(false);
    if (error) {
      toast({ title: "OTP পাঠানো ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "OTP কোড পাঠানো হয়েছে!", description: "আপনার ইমেইল চেক করুন।" });
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast({ title: "৬ সংখ্যার OTP কোড দিন", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otp,
      type: "email",
    });
    setOtpLoading(false);
    if (error) {
      toast({ title: "ভেরিফিকেশন ব্যর্থ", description: error.message, variant: "destructive" });
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

          <Tabs defaultValue="password" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">পাসওয়ার্ড</TabsTrigger>
              <TabsTrigger value="otp">OTP কোড</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
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
            </TabsContent>

            <TabsContent value="otp">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <Label htmlFor="otpEmail">ইমেইল</Label>
                    <Input id="otpEmail" type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} className="mt-1" placeholder="you@example.com" />
                  </div>
                  <Button type="submit" className="w-full" disabled={otpLoading}>
                    {otpLoading ? "OTP পাঠানো হচ্ছে..." : "OTP কোড পাঠান"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{otpEmail}</span> এ পাঠানো কোডটি দিন
                  </p>
                  <div className="flex justify-center">
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
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full" disabled={otpLoading || otp.length < 6}>
                    {otpLoading ? "ভেরিফাই হচ্ছে..." : "ভেরিফাই করুন"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-primary"
                  >
                    আবার কোড পাঠান
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            অ্যাকাউন্ট নেই?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">রেজিস্টার করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

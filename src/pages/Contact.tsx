import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Contact = () => {
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    toast({ title: "Message Sent!", description: "We'll get back to you soon." });
    setForm({ name: "", phone: "", email: "", message: "" });
  };

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">আমাদের সাথে যোগাযোগ করুন</p>

          <div className="mt-10 grid gap-10 lg:grid-cols-5">
            <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1.5" />
              </div>
              <Button type="submit" size="lg">Send Message</Button>
            </form>

            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">Get in Touch</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {settings.contact_email || "info@shikhonhub.com"}
                  </div>
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {settings.contact_phone || "+880 1XXX-XXXXXX"}
                  </div>
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {settings.contact_address || "Dhaka, Bangladesh"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

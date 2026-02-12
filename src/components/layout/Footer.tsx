import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <img src="/favicon.webp" alt="Shohoz Skill" className="h-8 w-8 rounded-lg" />
              Shohoz Skill
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              আপনার শেখার সেরা প্ল্যাটফর্ম। কোর্স, বই, এবং আরও অনেক কিছু এক জায়গায়।
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">Quick Links</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">Courses</Link>
              <Link to="/books" className="text-sm text-muted-foreground hover:text-primary transition-colors">Books</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">Support</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</Link>
              <span className="text-sm text-muted-foreground">Privacy Policy</span>
              <span className="text-sm text-muted-foreground">Terms of Service</span>
              <span className="text-sm text-muted-foreground">Refund Policy</span>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">Contact</h4>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                info@shikhonhub.com
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                +880 1XXX-XXXXXX
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Dhaka, Bangladesh
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ShikhonHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Globe, Youtube } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    support: [
      { label: "Safety info", href: "/learn-more#safety" },
      { label: "Cancellations", href: "/learn-more#cancellation" },
    ],
    hosting: [
      { label: "Host your home", href: "/host" },
      { label: "Learn More", href: "/learn-more" },
    ],
    about: [
      { label: "About Us", href: "/learn-more#about" },
      { label: "Contact", href: "/learn-more#support" },
    ],
  };

  return (
    <footer className="border-t border-border bg-background">
      <div className="container max-w-7xl py-8 md:py-12">
        {/* Main Links Grid - Better wrapping on mobile */}
        <div className="grid grid-cols-2 gap-y-8 gap-x-4 md:grid-cols-4 lg:grid-cols-4 mb-10">
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-foreground">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-foreground">Hosting</h3>
            <ul className="space-y-2">
              {footerLinks.hosting.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-foreground">Digital Ridr</h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials moved here for mobile visibility */}
          <div className="col-span-1">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-foreground">Connect</h3>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/digitalridr_apartments?igsh=MTVxejdpM3hqcmtkaA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://youtube.com/@digitalridrapartments?si=n4IkittzTFT5pq3V" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="https://www.facebook.com/share/1ASPcahzey/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://www.tiktok.com/@digitalridr_apartments?_r=1&_t=ZS-93pOANsWeIO" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Clean & Compact */}
        <div className="pt-6 border-t border-border flex flex-col-reverse md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-medium text-muted-foreground">
            <span>© {currentYear} Digital Ridr</span>
            <span className="hidden md:inline">·</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("digitalrider:open-cookie-preferences"))}
              className="hover:text-foreground"
            >
              Cookie settings
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary transition-colors">
              <Globe className="h-4 w-4 text-primary" />
              English (NG)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

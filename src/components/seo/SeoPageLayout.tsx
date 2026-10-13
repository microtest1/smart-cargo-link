import { Link } from "react-router-dom";
import { ArrowRight, Phone, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import amoligaLogo from "@/assets/amoliga-logo.png";

interface SeoPageLayoutProps {
  children: React.ReactNode;
}

export function SeoPageLayout({ children }: SeoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={amoligaLogo} alt="Amoliga Elite Freight & Logistics" className="h-10 w-auto object-contain" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/track">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Search className="mr-2 h-4 w-4" />
                Track Shipment
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="accent" size="sm">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="gradient-hero relative overflow-hidden rounded-3xl p-8 text-primary-foreground md:p-12">
            <div className="relative z-10 text-center">
              <h2 className="font-display mb-4 text-2xl font-bold md:text-3xl">Ready to ship with Amoliga Elite?</h2>
              <p className="mx-auto mb-6 max-w-xl text-primary-foreground/80">
                Create a free account to get your shipping mark, send goods to our China warehouse and track every stage
                to Ghana.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/signup">
                  <Button variant="accent" size="xl" className="shadow-glow">
                    Create Free Account
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button variant="outline" size="xl">
                    <Search className="mr-2 h-5 w-5" />
                    Track a Shipment
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/80">
                <a href="tel:+233307001743" className="flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4" /> +233 30 700 1743
                </a>
                <a href="tel:+233208878817" className="flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4" /> +233 20 887 8817
                </a>
                <a href="mailto:aeflogistics@gmail.com" className="flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4" /> aeflogistics@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <span>Manager: Elizabeth Amoliga</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/freight-forwarding-ghana" className="hover:text-accent">
              Services
            </Link>
            <Link to="/resources" className="hover:text-accent">
              Shipping Guides
            </Link>
            <Link to="/privacy-policy" className="hover:text-accent">
              Privacy Policy
            </Link>
          </div>
          <span>© {new Date().getFullYear()} Amoliga Elite Freight & Logistics</span>
        </div>
      </footer>
    </div>
  );
}

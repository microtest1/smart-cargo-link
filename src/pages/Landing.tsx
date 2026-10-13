import { useState } from "react";
import { Package, PackageOpen, Truck, Globe, Shield, ArrowRight, ChevronDown, Phone, Mail, Search, Warehouse, X, ArrowLeftRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import amoligaLogo from "@/assets/amoliga-logo.png";
import { Seo, SITE_URL, SITE_NAME } from "@/components/seo/Seo";
import { seoPages } from "@/content/seoPages";

export default function Landing() {
  const [showWarehouseBanner, setShowWarehouseBanner] = useState(true);



  return (
    <>
      <Seo
        title="China to Ghana Shipping & Freight Forwarding | Amoliga Elite"
        description="Ship from China to Ghana with Amoliga Elite Freight & Logistics — sea freight, air freight, cargo consolidation, China warehouse intake, delivery in Ghana and live tracking."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: SITE_NAME,
          url: SITE_URL,
          email: "aeflogistics@gmail.com",
          telephone: "+233307001743",
          address: { "@type": "PostalAddress", addressCountry: "GH" },
          areaServed: [
            { "@type": "Country", name: "Ghana" },
            { "@type": "Country", name: "China" },
          ],
          description:
            "Freight forwarding and logistics company shipping cargo from China to Ghana by sea and air, with China warehouse consolidation and delivery across Ghana.",
        }}
      />
    <div className="min-h-screen bg-background">
      {/* Warehouse Notice Banner */}
      {showWarehouseBanner && (
        <div className="bg-primary text-primary-foreground relative z-30">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <Link
              to="/china-warehouse-addresses"
              className="flex flex-1 items-center gap-2 text-left text-sm font-medium hover:underline"
            >
              <Package className="w-4 h-4 flex-shrink-0" />
              <span>📦 China Warehouse Addresses – Click to View &amp; Copy</span>
            </Link>
            <button onClick={() => setShowWarehouseBanner(false)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative z-20 flex items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-3">
            <img 
              src={amoligaLogo} 
              alt="Amoliga Elite Freight & Logistics" 
              className="h-12 md:h-14 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link to="/china-warehouse-addresses">
              <Button variant="outline" size="sm">
                <Warehouse className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Get the Right Warehouse Address</span>
                <span className="sr-only sm:hidden">Warehouse Addresses</span>
              </Button>
            </Link>
            <Link to="/track">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Search className="w-4 h-4 mr-2" />
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
          </div>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20 text-center relative z-10">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 right-10 w-80 h-80 bg-cargo-blue/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cargo-teal/3 rounded-full blur-3xl" />
          </div>

          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              Ghana ↔ China Shipping Made Simple
            </span>
          </div>

          <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl max-w-4xl mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Reliable Shipping from{" "}
            <span className="bg-gradient-to-r from-cargo-orange to-cargo-gold bg-clip-text text-transparent">China to Ghana & West Africa</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mb-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Business & Personal Shipping Services. Your trusted partner for seamless logistics within 45 days.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <a href="tel:+233307001743" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Phone className="w-4 h-4" />
              +233 30 700 1743
            </a>
            <a href="tel:+233208878817" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Phone className="w-4 h-4" />
              +233 020 887 8817
            </a>
            <a href="mailto:aeflogistics@gmail.com" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Mail className="w-4 h-4" />
              aeflogistics@gmail.com
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/track">
              <Button variant="hero" size="xl">
                <Search className="w-5 h-5 mr-2" />
                Track Your Shipment
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" size="xl">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Buy Yuan + Repacking Request Banners */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <a href="https://wa.link/uo00f7" target="_blank" rel="noopener noreferrer">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50/90 via-yellow-50/90 to-orange-50/90 px-5 py-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/20 dark:border-amber-800/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500">
                  <ArrowLeftRight className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">Buy Chinese Yuan</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  <Sparkles className="h-2 w-2" />
                  New
                </span>
              </div>
            </a>
            <a href="https://forms.gle/4vHq2uZGDMAGvrwu5" target="_blank" rel="noopener noreferrer">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/90 to-green-50/90 px-5 py-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-green-950/20 dark:border-emerald-800/40">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
                  <PackageOpen className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Repacking Request</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  <Sparkles className="h-2 w-2" />
                  New
                </span>
              </div>
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">
              Why Choose Amoliga Elite?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete logistics solution designed for businesses and individuals shipping between Ghana and China.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Package,
                title: "Real-Time Tracking",
                description: "Track your packages from origin to destination with live updates",
                color: "bg-cargo-orange/10 text-cargo-orange",
              },
              {
                icon: Globe,
                title: "45 Days Delivery",
                description: "Reliable shipping from China to Ghana & West Africa within 45 days",
                color: "bg-cargo-blue/10 text-cargo-blue",
              },
              {
                icon: Truck,
                title: "Warehouse Network",
                description: "Dedicated warehouse addresses in China and Ghana for easy shipping",
                color: "bg-cargo-teal/10 text-cargo-teal",
              },
              {
                icon: Shield,
                title: "Secure & Reliable",
                description: "Your cargo is protected with our trusted logistics network",
                color: "bg-success/10 text-success",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* China Warehouse Addresses CTA */}
      <section id="china-warehouse-section" className="bg-background px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Warehouse className="h-4 w-4" />
            China Warehouse
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl">
            China Warehouse Addresses
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            All of our China warehouse addresses are kept in one place, arranged and ready to copy for your supplier.
          </p>
          <Link to="/china-warehouse-addresses">
            <Button size="lg" variant="accent">
              <Warehouse className="mr-2 h-5 w-5" />
              Get the Right Warehouse Address
            </Button>
          </Link>
        </div>
      </section>


      {/* Services & Guides Links */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-display mb-4 text-3xl font-bold md:text-4xl">Our China to Ghana Shipping Services</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Explore how each service works, what it costs to consider, and which option fits your cargo.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seoPages.map((page) => (
              <li key={page.slug}>
                <Link
                  to={page.slug}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card p-4 text-sm font-medium transition-colors hover:border-accent"
                >
                  {page.h1}
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to importing?{" "}
            <Link to="/resources" className="text-accent underline">
              Read our China to Ghana shipping guides
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="gradient-hero rounded-3xl p-8 md:p-12 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="font-display font-bold text-2xl md:text-3xl mb-4">
                Ready to Ship with Amoliga Elite?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Join businesses and individuals who trust Amoliga Elite Freight & Logistics for their Ghana-China shipping needs.
              </p>
              <Link to="/signup">
                <Button variant="accent" size="xl" className="shadow-glow">
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={amoligaLogo} 
              alt="Amoliga Elite Freight & Logistics" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
            <span>Manager: Elizabeth Amoliga</span>
            <span className="hidden md:inline">•</span>
            <a href="mailto:aeflogistics@gmail.com" className="hover:text-accent transition-colors">
              aeflogistics@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/resources" className="hover:text-accent transition-colors">Shipping Guides</Link>
            <Link to="/privacy-policy" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <span>© {new Date().getFullYear()} Amoliga Elite Freight & Logistics</span>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}

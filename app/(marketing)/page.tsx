/**
 * Landing page for Parency Legal
 * Phase 12.1: Legal-focused marketing page for family law attorneys
 *
 * AI-powered document management for family law discovery
 */

import LegalHero from "./components/legal-hero";
import LegalFeatures from "./components/legal-features";
import HowItWorks from "./components/how-it-works";
import Testimonials from "./components/testimonials";
import LegalCTA from "./components/legal-cta";
import LegalFooter from "./components/legal-footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-6 lg:py-32 relative bg-gradient-to-b from-background to-background/95">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5OTk5OTkiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNi02aDZ2LTZoLTZ2NnptLTEyIDEyaDZ2LTZoLTZ2NnptLTYtNmg2di02aC02djZ6bS02LTZoNnYtNmgtNnY2em0xMi0xMmg2di02aC02djZ6bTYtNmg2VjZoLTZ2NnptLTYtNnY2aDZWNmgtNnptLTYgMTJoNnYtNmgtNnY2em0tNi02aDZWNmgtNnY2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50 mix-blend-soft-light pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <LegalHero />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 md:px-6 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <LegalFeatures />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 md:px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          <HowItWorks />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 md:px-6 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <Testimonials />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 bg-background">
        <div className="container mx-auto max-w-4xl">
          <LegalCTA />
        </div>
      </section>

      {/* Footer */}
      <LegalFooter />
    </div>
  );
}

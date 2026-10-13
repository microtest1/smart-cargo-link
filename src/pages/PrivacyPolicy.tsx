import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="font-display font-bold text-lg">Privacy Policy</h1>
        <div className="w-20" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="font-display font-bold text-3xl mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: February 23, 2026</p>
        </div>

        {/* 1. Introduction */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to <strong className="text-foreground">Amoliga Elite Freight &amp; Logistics</strong>. This Privacy Policy describes how we collect, use, store, and protect your personal and usage data when you use our web and mobile application.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our application provides logistics, shipping, cargo tracking, invoicing, and delivery services. By using our services, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">We collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Personal Information:</strong> Name, phone number, and email address provided during registration.</li>
            <li><strong className="text-foreground">Account Information:</strong> Login credentials (email and password) and your unique customer tracking code.</li>
            <li><strong className="text-foreground">Shipment &amp; Tracking Information:</strong> Tracking numbers, container data, item descriptions, quantities, and dimensions.</li>
            <li><strong className="text-foreground">Payment-Related Information:</strong> Transaction references and payment confirmation details only. We do not store credit/debit card numbers, PINs, or mobile money credentials.</li>
            <li><strong className="text-foreground">Location Information:</strong> Delivery addresses or typed location data when you request delivery services.</li>
            <li><strong className="text-foreground">Device &amp; Usage Data:</strong> Basic analytics such as device type, browser information, and app performance data to improve our services.</li>
          </ul>
        </section>

        {/* 3. How We Use Information */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Create and manage your user account</li>
            <li>Track shipments, containers, and cargo items</li>
            <li>Generate invoices and receipts for your orders</li>
            <li>Process payments through third-party payment providers (e.g., Hubtel)</li>
            <li>Send notifications and SMS updates about your shipments</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Improve app functionality, performance, and user experience</li>
          </ul>
        </section>

        {/* 4. Sharing of Information */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">4. Sharing of Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do <strong className="text-foreground">not sell</strong> your personal data to any third party. Your data may only be shared with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Service Providers:</strong> Payment processors (Hubtel) and SMS notification providers, strictly for processing transactions and delivering updates.</li>
            <li><strong className="text-foreground">Warehouse Partners:</strong> Shipping and warehouse partners solely for the purpose of order fulfillment and delivery.</li>
            <li><strong className="text-foreground">Legal Authorities:</strong> When required by applicable law, regulation, or legal process.</li>
          </ul>
        </section>

        {/* 5. Children's Privacy */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">5. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our application is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected data from a child under 13, we will take immediate steps to delete such information from our systems.
          </p>
        </section>

        {/* 6. Data Security */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">6. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We take the security of your data seriously and implement appropriate technical and organizational measures to protect it, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure server infrastructure with access controls</li>
            <li>Regular security reviews and monitoring</li>
            <li>Payment details are handled securely by our third-party payment providers and are never stored on our servers</li>
          </ul>
        </section>

        {/* 7. Data Retention */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your personal data for as long as your account is active or as needed to provide our services. Shipment and transaction records may be retained for up to 5 years for legal and operational purposes. You may request deletion of your personal data at any time by contacting us.
          </p>
        </section>

        {/* 8. User Rights */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">8. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Access</strong> the personal data we hold about you</li>
            <li><strong className="text-foreground">Correct</strong> any inaccurate or incomplete information</li>
            <li><strong className="text-foreground">Request deletion</strong> of your account and all associated personal data</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            To exercise any of these rights, please contact us using the information provided below.
          </p>
        </section>

        {/* 9. Third-Party Services */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">9. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">Our application integrates with the following third-party services:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Hubtel:</strong> Payment processing and SMS notifications</li>
            <li><strong className="text-foreground">Google Forms &amp; Google Sheets:</strong> Warehouse update submissions</li>
            <li><strong className="text-foreground">Google Maps:</strong> Delivery location services (if applicable)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Each third-party service operates under its own privacy policy. We encourage you to review their respective policies.
          </p>
        </section>

        {/* 10. Changes to This Policy */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">10. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify users of any significant changes through the application or via email. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* 11. Contact Information */}
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-xl">11. Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us:
          </p>
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="font-semibold">Amoliga Elite Freight &amp; Logistics</p>
            <p className="text-muted-foreground">
              Email: <a href="mailto:aeflogistics@gmail.com" className="text-accent hover:underline">aeflogistics@gmail.com</a>
            </p>
            <p className="text-muted-foreground">
              Phone: <a href="tel:+233307001743" className="text-accent hover:underline">+233 30 700 1743</a> / <a href="tel:+233208878817" className="text-accent hover:underline">+233 020 887 8817</a>
            </p>
          </div>
        </section>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Amoliga Elite Freight &amp; Logistics. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}

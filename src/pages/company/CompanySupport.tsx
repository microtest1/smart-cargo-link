import { useCompanyAuth } from "@/hooks/useCompanyAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Mail, Phone, HelpCircle } from "lucide-react";

export default function CompanySupport() {
  const { session } = useCompanyAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/company-admin")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg">Support</h1>
            <p className="text-xs text-muted-foreground">
              Get help and manage support requests
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Coming Soon */}
        <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-16 h-16 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">
              Support Tickets Coming Soon
            </h2>
            <p className="text-muted-foreground mb-6">
              We're building a comprehensive support ticket system. In the meantime,
              you can contact support directly.
            </p>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Need Help?
            </CardTitle>
            <CardDescription>Contact our support team directly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">
                  support@amoliga.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">
                  Available Monday - Friday, 9am - 5pm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">
                How do I add a new shipment?
              </h4>
              <p className="text-sm text-muted-foreground">
                Go to the Shipments page and click "Add Shipment" to create a new
                shipment entry for your customers.
              </p>
            </div>
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">
                How do I notify customers about their shipments?
              </h4>
              <p className="text-sm text-muted-foreground">
                Use the Notifications page to send updates to your customers
                using their unique customer code.
              </p>
            </div>
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">
                How do I update company settings?
              </h4>
              <p className="text-sm text-muted-foreground">
                Navigate to Company Settings from the sidebar to update your
                warehouse addresses and contact information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function CompletePhoneForm() {
  const [phone, setPhone] = useState("+233");
  const [isLoading, setIsLoading] = useState(false);
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const isValidPhone = (value: string) => {
    return /^\+\d{10,15}$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidPhone(phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number in international format (e.g. +233XXXXXXXXX).",
        variant: "destructive",
      });
      return;
    }

    if (!profile) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ phone })
      .eq("id", profile.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: "Phone number added!",
        description: "Your registration is now complete.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Package className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground text-sm">
            Please add your phone number to complete registration
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Mobile Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-11 h-12 rounded-xl"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                International format required (e.g. +233XXXXXXXXX). Used for shipment &amp; delivery SMS alerts.
              </p>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading || !isValidPhone(phone)}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Registration
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 p-4 bg-accent/5 rounded-xl border border-accent/20">
          <p className="text-xs text-center text-muted-foreground">
            Your phone number is required to receive shipment updates, warehouse notifications, and delivery alerts via SMS.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignupForm, SignupData } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignup = async (data: SignupData) => {
    setIsLoading(true);
    
    const { error } = await signUp(data.email, data.password, data.fullName, data.phone);
    
    setIsLoading(false);

    if (error) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Your unique tracking code has been generated. Welcome to Smart Cargo Connect!",
      });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("auth.back")}
          </Button>
        </Link>
        <LanguageSelector />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Package className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2">{t("auth.createAccount")}</h1>
            <p className="text-muted-foreground text-sm">{t("auth.signUpSubtitle")}</p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card">
            <SignupForm onSubmit={handleSignup} isLoading={isLoading} />
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="mt-4">
              <GoogleSignInButton />
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-accent/5 rounded-xl border border-accent/20">
            <p className="text-xs text-center text-muted-foreground">
              Upon registration, you'll receive a unique code like{" "}
              <span className="font-mono font-semibold text-accent">AEF_YOURNAME</span>{" "}
              for all your shipments.
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("auth.agreeSignUp")}{" "}
            <Link to="/privacy-policy" className="text-accent hover:underline">{t("footer.privacy")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

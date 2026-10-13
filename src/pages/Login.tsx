import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { toast } = useToast();
  const { signIn, user, isManager, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Wait until roles have finished loading so admins land on /admin
    if (user && !authLoading) {
      if (next) {
        window.location.href = next;
      } else if (isManager) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, isManager, navigate, next]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    setIsLoading(false);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Package className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to track your shipments</p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card">
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="mt-4">
              <GoogleSignInButton />
            </div>
          </div>

          {/* Company Admin Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Are you a company administrator?</p>
            <Link to="/company-login">
              <Button variant="outline" className="w-full">
                Company Admin Login
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

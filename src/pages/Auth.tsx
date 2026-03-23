import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    dob: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // LOGIN logic
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        const returnTo = searchParams.get("returnTo");
        // Prevent redirect loop if returnTo is auth page
        const safeReturnTo = (returnTo && !returnTo.includes('/auth')) ? returnTo : "/dashboard";
        navigate(safeReturnTo, { replace: true });
      } else {
        // SIGNUP logic - Multi-step handled in UI, this is final submission
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName || "User",
              date_of_birth: formData.dob,
              phone_number: formData.phone,
            },
          },
        });
        if (error) throw error;

        // Success: Redirect to Verification immediately
        // await supabase.auth.signOut(); // Removed to allow auto-login

        toast.success("Account created! Let's verify your identity.");
        navigate("/verify-identity");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.email || !formData.password) {
        toast.error("Please fill in email and password.");
        return;
      }
      setStep(2);
    }
  };

  const prevStep = () => setStep(1);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!formData.email) {
        toast.error("Please enter your email address.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === "Google") {
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo = (returnTo && !returnTo.includes('/auth')) ? returnTo : "/dashboard";
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${safeReturnTo}`,
        }
      });
      
      if (error) {
        toast.error(error.message || "Failed to initialize Google login");
      }
    } else {
      toast.info(`${provider} login will be available soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <main className="container flex items-center justify-center py-12 md:py-24">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="/assets/digitalridr-logo.PNG"
                alt="Digital Ridr - Travels & Apartments"
                className="h-10 md:h-15 w-auto"
              />
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card mx-4 md:mx-0">
            <h1 className="mb-2 text-center text-2xl font-bold">
              {isForgotPassword ? "Reset Password" : isLogin ? "Welcome back" : "Create an account"}
            </h1>
            <p className="mb-6 text-center text-muted-foreground">
              {isForgotPassword
                ? "Enter your email to receive a password reset link."
                : isLogin
                  ? "Log in to continue to Digital Ridr"
                  : "Sign up to start your adventure in Lagos"}
            </p>

            {/* Social Buttons */}
            {(isLogin || step === 1) && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full gap-3"
                  onClick={() => handleSocialLogin("Google")}
                  type="button"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            )}

            {!isLogin && (
              <div className="mb-6 flex flex-col gap-2">
                <div className="flex h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full bg-primary transition-all duration-300 ease-out ${step === 1 ? 'w-1/2' : 'w-full'}`} />
                </div>
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span className={step >= 1 ? "text-primary transition-colors" : ""}>Step 1: Account</span>
                  <span className={step >= 2 ? "text-primary transition-colors" : ""}>Step 2: Profile</span>
                </div>
              </div>
            )}

            {(isLogin || step === 1) && (
              <div className="my-6 flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
            )}

            {/* Form */}
            <form onSubmit={isForgotPassword ? handleForgotPassword : isLogin ? handleSubmit : (step === 1 ? nextStep : handleSubmit)} className="space-y-4">

              {/* LOGIN or SIGNUP STEP 1 or FORGOT PASSWORD */}
              {(isLogin || step === 1 || isForgotPassword) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {!isForgotPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {!isLogin && <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>}
                    </div>
                  )}
                </>
              )}

              {/* SIGNUP STEP 2: PERSONAL INFO */}
              {!isLogin && step === 2 && !isForgotPassword && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Make sure this matches your government ID.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      className="h-12 rounded-xl bg-muted/30 border-border/50"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground"></p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="h-12 rounded-xl bg-muted/30 border-border/50"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground"></p>
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
                      I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>, and I consent to the collection of my data as described.
                    </label>
                  </div>
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                {!isLogin && step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="h-12 w-12 rounded-xl shrink-0 border-border/50"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : isForgotPassword ? (
                    "Send Reset Link"
                  ) : isLogin ? (
                    "Log in"
                  ) : step === 1 ? (
                    "Continue"
                  ) : (
                    "Agree and continue"
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isForgotPassword ? (
                <button
                  onClick={() => setIsForgotPassword(false)}
                  className="font-medium text-primary hover:underline"
                  type="button"
                >
                  Back to login
                </button>
              ) : isLogin ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="font-medium text-primary hover:underline"
                    type="button"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="font-medium text-primary hover:underline"
                    type="button"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;

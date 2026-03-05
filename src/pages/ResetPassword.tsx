import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { toast } from "sonner";

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            toast.success("Password updated successfully! Please log in with your new password.");
            await supabase.auth.signOut(); // Ensure they are signed out to force a clean login with the new password
            navigate("/auth");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 font-sans selection:bg-primary/20">
            <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                        <Shield className="h-8 w-8" />
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
                    <h1 className="mb-2 text-center text-2xl font-bold">Set new password</h1>
                    <p className="mb-6 text-center text-muted-foreground">
                        Please enter your new password below.
                    </p>

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                            <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                ) : (
                                    "Update Password"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

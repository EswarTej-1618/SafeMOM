import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordApi } from "@/lib/api";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid reset link. Please request a new one.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await resetPasswordApi(token, password);
            if (res.ok) {
                setSuccess(true);
            } else {
                setError(res.error || "Reset failed. The link may have expired.");
            }
        } catch {
            setError("Network error. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <section className="min-h-screen flex items-center justify-center px-6 lg:px-12 pt-20 pb-12">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-32 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-32 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/role-select")}
                        className="gap-2 text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Button>

                    <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                        {!token ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-destructive" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Invalid Link
                                </h1>
                                <p className="text-muted-foreground mb-6">
                                    This password reset link is invalid. Please request a new one.
                                </p>
                                <Button onClick={() => navigate("/forgot-password")} className="rounded-xl">
                                    Request New Link
                                </Button>
                            </div>
                        ) : success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-health-good/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-health-good" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Password Reset!
                                </h1>
                                <p className="text-muted-foreground mb-6">
                                    Your password has been updated successfully. You can now log in
                                    with your new password.
                                </p>
                                <Button onClick={() => navigate("/role-select")} className="rounded-xl">
                                    Go to Login
                                </Button>
                            </motion.div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Reset Password
                                    </h1>
                                    <p className="text-muted-foreground mt-2">
                                        Enter your new password below.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-11 pr-11 h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="pl-11 h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                                            {error}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 rounded-xl text-base font-medium"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                        {loading ? "Resetting..." : "Reset Password"}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </motion.div>
            </section>
        </div>
    );
};

export default ResetPassword;

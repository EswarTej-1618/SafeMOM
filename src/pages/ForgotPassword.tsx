import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordApi } from "@/lib/api";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }
        setLoading(true);
        try {
            const res = await forgotPasswordApi(email.trim());
            if (res.ok) {
                setSent(true);
            } else {
                setError(res.error || "Something went wrong.");
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
                        {sent ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-health-good/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-health-good" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Check Your Email
                                </h1>
                                <p className="text-muted-foreground mb-6">
                                    If an account exists with <strong>{email}</strong>, we've sent a
                                    password reset link. Check your inbox (and spam folder).
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate("/role-select")}
                                    className="rounded-xl"
                                >
                                    Back to Login
                                </Button>
                            </motion.div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Forgot Password?
                                    </h1>
                                    <p className="text-muted-foreground mt-2">
                                        Enter your email and we'll send you a link to reset your
                                        password.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
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
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : null}
                                        {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;

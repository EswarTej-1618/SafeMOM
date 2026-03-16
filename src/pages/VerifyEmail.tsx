import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { verifyEmailApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const VerifyEmail = () => {
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();
    const { reloadUser } = useAuth();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    // Store user role so the redirect button knows where to send the user
    const [userRole, setUserRole] = useState<"mother" | "doctor" | "asha" | "partner" | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link.");
            return;
        }

        verifyEmailApi(token)
            .then(async (res) => {
                if (res.ok) {
                    setStatus("success");
                    setMessage(res.message || "Email verified successfully!");

                    // Extract role from the response so we can redirect correctly
                    const role = res.user?.role ?? null;
                    setUserRole(role);

                    // Reload user in AuthContext so protected routes see the verified session
                    try {
                        await reloadUser();
                    } catch {
                        // Non-fatal: user can still log in manually
                    }

                    // Auto-redirect after a brief moment so the user sees the success screen
                    const dest =
                        role === "doctor"
                            ? "/doctor-patients"
                            : role === "asha"
                                ? "/patient-details"
                                : role === "mother"
                                    ? "/mother-dashboard"
                                    : role === "partner"
                                        ? "/partner-dashboard"
                                        : null;

                    if (dest) {
                        setTimeout(() => navigate(dest, { replace: true }), 2500);
                    }
                } else {
                    setStatus("error");
                    setMessage(res.error || "Verification failed. The link may have expired.");
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("Network error. Is the server running?");
            });
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Returns the correct dashboard path for the "Go to Dashboard" button */
    function getDashboardPath() {
        if (userRole === "doctor") return "/doctor-patients";
        if (userRole === "asha") return "/patient-details";
        if (userRole === "mother") return "/mother-dashboard";
        if (userRole === "partner") return "/partner-dashboard";
        // Fallback: send to login with the correct role pre-selected
        return userRole ? `/login?role=${userRole}` : "/login";
    }

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
                    <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-center">
                        {status === "loading" && (
                            <div className="py-8">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Verifying your email...
                                </h1>
                                <p className="text-muted-foreground">Please wait a moment.</p>
                            </div>
                        )}

                        {status === "success" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-4"
                            >
                                <div className="w-20 h-20 rounded-full bg-health-good/20 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-10 h-10 text-health-good" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Email Verified! 🎉
                                </h1>
                                <p className="text-muted-foreground mb-2">{message}</p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Redirecting you to your dashboard...
                                </p>
                                <Button
                                    onClick={() => navigate(getDashboardPath(), { replace: true })}
                                    className="rounded-xl h-12 px-8"
                                >
                                    Go to Dashboard
                                </Button>
                            </motion.div>
                        )}

                        {status === "error" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-4"
                            >
                                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="w-10 h-10 text-destructive" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Verification Failed
                                </h1>
                                <p className="text-muted-foreground mb-6">{message}</p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate("/role-select")}
                                        className="rounded-xl"
                                    >
                                        Go to Login
                                    </Button>
                                    <Button
                                        onClick={() => navigate("/role-select")}
                                        className="rounded-xl"
                                    >
                                        Sign Up Again
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </section>
        </div>
    );
};

export default VerifyEmail;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    RefreshCw,
    CheckCircle2,
    XCircle,
    TrendingUp,
    AlertTriangle,
    Heart,
    Activity,
    Bell,
    Clock,
    User,
    Shield,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/Navbar";
import { getStoredToken } from "@/lib/api";

interface Notification {
    id: string;
    timestamp: string;
    status: "success" | "failed";
    riskLevel: string;
    recipient: string;
    summary: string;
    messagePreview: string;
    messageId?: string;
    error?: string;
}

interface Stats {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    riskLevelCounts: Record<string, number>;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function NotificationHistory() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = getStoredToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const statsRes = await fetch(`${API_BASE}/api/notification-stats`, { headers });
            const statsData = await statsRes.json();
            if (statsData.ok) {
                setStats(statsData.stats);
            } else if (statsData.error) {
                throw new Error(statsData.error);
            }

            const historyRes = await fetch(`${API_BASE}/api/notification-history?limit=50`, { headers });
            const historyData = await historyRes.json();
            if (historyData.ok) {
                setNotifications(historyData.notifications);
            } else if (historyData.error) {
                throw new Error(historyData.error);
            }
        } catch (err) {
            console.error("Error loading notification history:", err);
            setError("Failed to load notification history. Make sure the server is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return "Just now";
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        }
        return date.toLocaleString();
    };

    const getRiskConfig = (riskLevel: string) => {
        const level = riskLevel.toLowerCase();
        if (level === "risky") {
            return {
                badge: "bg-red-500/10 text-red-400 border-red-500/30",
                icon: AlertTriangle,
                color: "text-red-400"
            };
        }
        if (level === "high") {
            return {
                badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
                icon: AlertTriangle,
                color: "text-orange-400"
            };
        }
        if (level === "moderate") {
            return {
                badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                icon: Activity,
                color: "text-yellow-400"
            };
        }
        return {
            badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
            icon: Heart,
            color: "text-emerald-400"
        };
    };

    return (
        <div className="min-h-screen bg-background pt-20 pb-12 px-4 md:px-8">
            <Navbar />
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <Bell className="w-7 h-7 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl font-bold text-foreground flex items-center gap-2">
                                            Notification History
                                        </CardTitle>
                                        <CardDescription className="text-base mt-1.5 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Healthcare Alert Monitoring System
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button
                                    onClick={loadData}
                                    disabled={loading}
                                    className="bg-primary hover:bg-primary/90 gap-2"
                                    size="lg"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                </motion.div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="text-muted-foreground font-medium flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            Total Alerts
                                        </CardDescription>
                                        <Activity className="w-5 h-5 text-primary/40" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-primary">
                                        {stats.total}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">All notifications sent</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-emerald-500/50 transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="text-muted-foreground font-medium flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Successful
                                        </CardDescription>
                                        <Heart className="w-5 h-5 text-emerald-500/40" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-emerald-500">
                                        {stats.successful}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Delivered successfully</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-red-500/50 transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="text-muted-foreground font-medium flex items-center gap-2">
                                            <XCircle className="w-4 h-4" />
                                            Failed
                                        </CardDescription>
                                        <AlertTriangle className="w-5 h-5 text-red-500/40" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-red-500">
                                        {stats.failed}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Delivery failures</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="text-muted-foreground font-medium flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Success Rate
                                        </CardDescription>
                                        <Zap className="w-5 h-5 text-primary/40" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-primary">
                                        {stats.successRate}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">System reliability</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {/* Notifications List */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground">
                                    Recent Notifications
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3" />
                                    Last 50 email alerts sent by the system
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-500 font-medium mb-4">{error}</p>
                                <Button onClick={loadData} variant="outline">
                                    Try Again
                                </Button>
                            </motion.div>
                        )}

                        {loading && !error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <RefreshCw className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                                <p className="text-muted-foreground">Loading notifications...</p>
                            </motion.div>
                        )}

                        {!loading && !error && notifications.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <Mail className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                                <p className="text-lg font-medium text-foreground">No notifications yet</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Email alerts will appear here when high-risk conditions are detected
                                </p>
                            </motion.div>
                        )}

                        {!loading && !error && notifications.length > 0 && (
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {notifications.map((notif, index) => {
                                            const riskConfig = getRiskConfig(notif.riskLevel);
                                            const RiskIcon = riskConfig.icon;

                                            return (
                                                <motion.div
                                                    key={notif.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className={`rounded-xl border p-4 transition-all hover:border-primary/50 ${notif.status === "success"
                                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                                        : "border-red-500/20 bg-red-500/5"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                                                        <div className="flex gap-2 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${riskConfig.badge} border font-semibold uppercase text-xs px-2.5 py-0.5 flex items-center gap-1`}
                                                            >
                                                                <RiskIcon className="w-3 h-3" />
                                                                {notif.riskLevel}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`${notif.status === "success"
                                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                                    : "bg-red-500/10 text-red-400 border-red-500/30"
                                                                    } border font-medium text-xs px-2.5 py-0.5 flex items-center gap-1`}
                                                            >
                                                                {notif.status === "success" ? (
                                                                    <>
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        Delivered
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <XCircle className="w-3 h-3" />
                                                                        Failed
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTimestamp(notif.timestamp)}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5 text-sm">
                                                        <div className="flex items-start gap-2">
                                                            <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recipient</span>
                                                                <p className="text-foreground font-medium">{notif.recipient}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-2">
                                                            <Activity className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vitals Summary</span>
                                                                <p className="text-foreground font-medium">{notif.summary}</p>
                                                            </div>
                                                        </div>

                                                        {notif.messagePreview && (
                                                            <div className="flex items-start gap-2">
                                                                <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                                <div className="flex-1">
                                                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Assessment</span>
                                                                    <p className="text-muted-foreground text-sm leading-relaxed">{notif.messagePreview}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {notif.messageId && (
                                                            <div className="pt-2 border-t border-border/30">
                                                                <p className="text-xs text-muted-foreground font-mono">
                                                                    <strong className="text-foreground">Message ID:</strong> {notif.messageId}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {notif.error && (
                                                            <div className="pt-2 border-t border-red-500/20">
                                                                <div className="flex items-start gap-2 text-red-400">
                                                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                                    <div className="flex-1">
                                                                        <span className="text-xs font-medium uppercase tracking-wide">Error</span>
                                                                        <p className="text-sm">{notif.error}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

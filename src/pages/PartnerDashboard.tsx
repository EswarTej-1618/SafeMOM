import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogOut,
  User,
  Mail,
  Calendar,
  Activity,
  Heart,
  Droplets,
  Scale,
  Stethoscope,
  AlertTriangle,
  Clock,
  Loader2,
  LinkIcon,
  MessageSquare,
} from "lucide-react";
import PartnerIcon from "@/components/icons/PartnerIcon";
import Navbar from "@/components/Navbar";
import { PregnancyCalendar } from "@/components/PregnancyCalendar";
import { VitalsTrends } from "@/components/VitalsTrends";
import { LiveLocationCard } from "@/components/LiveLocationCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMotherDataApi, getMotherChatHistoryApi } from "@/lib/api";
import { recordProfileView } from "@/lib/patientApi";
import type { ApiUser } from "@/lib/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function bpStatus(
  systolic: number,
  diastolic: number
): { label: string; className: string } {
  if (systolic >= 140 || diastolic >= 90)
    return { label: "High", className: "text-destructive" };
  if (systolic >= 120 || diastolic >= 80)
    return { label: "Elevated", className: "text-[hsl(var(--health-warning))]" };
  return { label: "Normal", className: "text-[hsl(var(--health-good))]" };
}

const VitalCard = ({
  label,
  value,
  unit,
  statusLabel,
  statusClass,
}: {
  label: string;
  value: string | number | undefined;
  unit?: string;
  statusLabel?: string;
  statusClass?: string;
}) => (
  <div className="rounded-xl bg-muted/50 p-3">
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <p className="font-medium text-foreground text-sm">
      {value != null ? `${value}${unit ? " " + unit : ""}` : "—"}
    </p>
    {statusLabel && (
      <p className={cn("text-xs font-medium mt-0.5", statusClass)}>{statusLabel}</p>
    )}
  </div>
);

const PartnerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mother, setMother] = useState<ApiUser | null>(null);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFilter, setChatFilter] = useState<"all" | "week" | "month" | "high" | "risky">("all");

  const fetchMotherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMotherDataApi();
      if (res.ok) {
        setLinked(res.linked);
        setMother(res.linked ? res.mother : null);

        if (res.linked && res.mother?._id) {
          recordProfileView(res.mother._id).catch(console.error);
        }

        // Also fetch chat history if linked
        if (res.linked) {
          setChatLoading(true);
          getMotherChatHistoryApi()
            .then((chatRes) => {
              if (chatRes.ok) setChatHistory(chatRes.history ?? []);
            })
            .catch(() => {})
            .finally(() => setChatLoading(false));
        }
      } else {
        setError(res.error || "Failed to fetch data");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMotherData();
  }, [fetchMotherData]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const vitals = mother?.vitals;
  const hasBP =
    vitals?.bloodPressureSystolic != null &&
    vitals?.bloodPressureDiastolic != null;
  const bpStat = hasBP
    ? bpStatus(vitals!.bloodPressureSystolic!, vitals!.bloodPressureDiastolic!)
    : null;

  // Dynamically compute current gestation week
  let currentGestation = mother?.gestationWeek;
  if (mother?.pregnancyStartDate) {
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Math.floor(
      (Date.now() - new Date(mother.pregnancyStartDate).getTime()) / msInWeek
    );
    currentGestation = Math.min(40, Math.max(0, elapsed));
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-12 max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                {user?.avatar && (
                  <AvatarImage src={user.avatar} alt={user.name} className="object-cover rounded-xl" />
                )}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <PartnerIcon className="w-8 h-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {user?.name ?? "Partner"}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Partner / Husband Dashboard
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <Card className="rounded-2xl">
              <CardContent className="pt-6 pb-6">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" className="mt-3" onClick={fetchMotherData}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Not linked state */}
          {!loading && !error && !linked && (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <LinkIcon className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">
                    Not linked yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Ask your partner to go to her dashboard → Partner tab and add your
                    email to link you to her account.
                  </p>
                </div>
                <Badge variant="secondary" className="mt-1">
                  {user?.email}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Linked: show mother's profile */}
          {!loading && !error && linked && mother && (
            <>
              {/* Mother profile header card */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-4 mb-5">
                    <Avatar className="h-14 w-14 rounded-xl">
                      {mother.avatar && (
                        <AvatarImage
                          src={mother.avatar}
                          alt={mother.name}
                          className="object-cover rounded-xl"
                        />
                      )}
                      <AvatarFallback className="rounded-xl bg-primary/20 text-primary text-lg">
                        {getInitials(mother.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground text-lg">
                        {mother.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{mother.email}</p>
                    </div>
                    <Badge className="ml-auto capitalize bg-primary/10 text-primary border-primary/20">
                      {currentGestation ?? "—"} wks pregnant
                    </Badge>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground">
                        Age: {mother.age ?? "—"} · Blood group:{" "}
                        {mother.bloodGroup || "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{mother.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground">
                        Gestation: {currentGestation ?? "—"} weeks ·{" "}
                        {mother.pregnancyNumber === 1
                          ? "First"
                          : mother.pregnancyNumber === 2
                          ? "Second"
                          : mother.pregnancyNumber != null
                          ? `${mother.pregnancyNumber}th`
                          : "—"}{" "}
                        pregnancy
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pregnancy week calendar */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">
                      Pregnancy Calendar
                    </h2>
                  </div>
                  <PregnancyCalendar 
                    pregnancyStartDate={mother.pregnancyStartDate} 
                    gestationWeek={currentGestation} 
                    appointments={mother.appointments as any[]} 
                  />
                </CardContent>
              </Card>

              {/* Vitals */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Health Vitals</h2>
                  </div>
                  {vitals && Object.values(vitals).some((v) => v != null) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {vitals.weightKg != null && (
                        <VitalCard label="Weight" value={vitals.weightKg} unit="kg" />
                      )}
                      {hasBP && (
                        <VitalCard
                          label="Blood Pressure"
                          value={`${vitals!.bloodPressureSystolic} / ${vitals!.bloodPressureDiastolic}`}
                          unit="mmHg"
                          statusLabel={bpStat?.label}
                          statusClass={bpStat?.className}
                        />
                      )}
                      {vitals.hemoglobin != null && (
                        <VitalCard
                          label="Hemoglobin"
                          value={vitals.hemoglobin}
                          unit="g/dL"
                          statusLabel={vitals.hemoglobin < 10 ? "Low" : vitals.hemoglobin < 11 ? "Borderline" : "Normal"}
                          statusClass={vitals.hemoglobin < 10 ? "text-destructive" : vitals.hemoglobin < 11 ? "text-[hsl(var(--health-warning))]" : "text-[hsl(var(--health-good))]"}
                        />
                      )}
                      {vitals.bloodSugarMgDl != null && (
                        <VitalCard label="Blood Sugar" value={vitals.bloodSugarMgDl} unit="mg/dL" />
                      )}
                      {vitals.heartRateBpm != null && (
                        <VitalCard label="Heart Rate" value={vitals.heartRateBpm} unit="bpm" />
                      )}
                      {vitals.spo2Percent != null && (
                        <VitalCard label="SpO₂" value={vitals.spo2Percent} unit="%" />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No vitals recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Vitals Trends Graph (Read Only) */}
              <div className="mt-8">
                <VitalsTrends />
              </div>

              {/* Live Location */}
              <div className="mt-8">
                <LiveLocationCard />
              </div>

              {/* Medical Profile */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Medical Profile</h2>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground mb-0.5">Chronic conditions</p>
                      <p className="text-muted-foreground">
                        {mother.chronicConditions?.length
                          ? mother.chronicConditions.join(", ")
                          : "None"}
                        {mother.otherCondition
                          ? `; Other: ${mother.otherCondition}`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-0.5">Medication</p>
                      <p className="text-muted-foreground">
                        {mother.onMedication
                          ? mother.medicationNames || "Yes (names not provided)"
                          : "No"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointments */}
              {(mother.appointments as any[])?.filter((a) => a.status !== "cancelled").length > 0 && (
                <Card className="rounded-2xl overflow-hidden">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                      <h2 className="font-semibold text-foreground">Appointments</h2>
                    </div>
                    <div className="space-y-2">
                      {(mother.appointments as any[])
                        .filter((a) => a.status !== "cancelled")
                        .map((appt: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {appt.purpose}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(appt.date).toLocaleDateString([], {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <Badge
                              variant={
                                appt.status === "completed" ? "secondary" : "outline"
                              }
                              className="capitalize text-xs shrink-0"
                            >
                              {appt.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Chat History */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">AI Chat History</h2>
                    <Badge variant="secondary" className="ml-auto text-xs">Read-only</Badge>
                  </div>

                  {/* Filter pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(["all", "week", "month", "high", "risky"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setChatFilter(f)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                          chatFilter === f
                            ? f === "high"
                              ? "bg-destructive text-white border-destructive"
                              : f === "risky"
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {f === "all" ? "All" : f === "week" ? "This Week" : f === "month" ? "This Month" : f === "high" ? "⚠ High Risk" : "⚡ Risky"}
                      </button>
                    ))}
                  </div>

                  {chatLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  {!chatLoading && (() => {
                    const now = Date.now();
                    const msInDay = 86400000;
                    const filtered = chatHistory.filter((session: any) => {
                      if (chatFilter === "all") return true;
                      const created = new Date(session.createdAt).getTime();
                      if (chatFilter === "week") return now - created <= 7 * msInDay;
                      if (chatFilter === "month") return now - created <= 30 * msInDay;
                      const risks = (session.messages ?? []).map((m: any) => m.riskLevel);
                      if (chatFilter === "high") return risks.includes("high");
                      if (chatFilter === "risky") return risks.includes("risky");
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          {chatHistory.length === 0 ? "No chat sessions recorded yet." : "No sessions match this filter."}
                        </p>
                      );
                    }

                    return (
                      /* Fixed-height outer scroll container */
                      <div className="overflow-y-auto max-h-[640px] space-y-4 pr-1">
                        {filtered.map((session: any) => {
                          const hasHigh = session.messages?.some((m: any) => m.riskLevel === "high");
                          const hasRisky = session.messages?.some((m: any) => m.riskLevel === "risky");
                          const hasRisk = hasHigh || hasRisky;
                          return (
                            <div
                              key={session._id}
                              className={cn(
                                "rounded-xl border p-4 space-y-3",
                                hasHigh
                                  ? "border-destructive/50 bg-destructive/5"
                                  : hasRisky
                                  ? "border-orange-400/40 bg-orange-500/5"
                                  : "border-border/50 bg-muted/30"
                              )}
                            >
                              {/* Session header */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
                                  {session.title || "Chat Session"}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      session.mode === "vitals"
                                        ? "border-accent/50 text-accent"
                                        : "border-primary/50 text-primary"
                                    )}
                                  >
                                    {session.mode === "vitals" ? "Vitals Q&A" : "General Chat"}
                                  </Badge>
                                  {hasHigh && (
                                    <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/30">
                                      ⚠ High Risk
                                    </Badge>
                                  )}
                                  {!hasHigh && hasRisky && (
                                    <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/30">
                                      ⚡ Risky
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Session date */}
                              <p className="text-xs text-muted-foreground">
                                {new Date(session.createdAt).toLocaleString([], {
                                  weekday: "short", month: "short", day: "numeric",
                                  year: "numeric", hour: "2-digit", minute: "2-digit",
                                })}
                              </p>

                              {/* Messages — fixed inner height */}
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {(session.messages ?? []).map((msg: any, i: number) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "rounded-lg px-3 py-2 text-sm border",
                                      msg.isBot
                                        ? "bg-muted/60 border-border/40 text-foreground"
                                        : msg.riskLevel === "high"
                                        ? "bg-destructive/10 border-destructive/30 text-foreground"
                                        : msg.riskLevel === "risky"
                                        ? "bg-orange-500/10 border-orange-400/30 text-foreground"
                                        : "bg-primary/10 border-primary/20 text-foreground"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-xs font-semibold opacity-70">
                                        {msg.isBot ? "SafeMom AI" : "Your Partner"}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {msg.riskLevel && (
                                          <Badge
                                            className={cn(
                                              "text-[10px] px-1.5 py-0 h-4 capitalize",
                                              msg.riskLevel === "high"
                                                ? "bg-destructive/20 text-destructive border-destructive/40"
                                                : msg.riskLevel === "risky"
                                                ? "bg-orange-500/20 text-orange-400 border-orange-400/40"
                                                : "bg-muted text-muted-foreground"
                                            )}
                                          >
                                            {msg.riskLevel}
                                          </Badge>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                          {msg.timestamp
                                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                                hour: "2-digit", minute: "2-digit",
                                              })
                                            : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-sm leading-snug">{msg.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>


              {/* Read-only notice */}

              <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  This is a read-only view. Only your partner can edit her profile and
                  health data.
                </span>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PartnerDashboard;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, LogOut, Stethoscope, MessageCircle, Clock, MoreVertical, Check, Users, Calendar, Loader2, Baby } from "lucide-react";
import Navbar from "@/components/Navbar";
import { AshaDashboard } from "@/components/AshaDashboard";
import { PregnancyCalendar } from "@/components/PregnancyCalendar";
import { VitalsTrends } from "@/components/VitalsTrends";
import { LiveLocationCard } from "@/components/LiveLocationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { AddNewMotherDialog, type NewMotherFormData } from "@/components/AddNewMotherDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { fetchLinkedPatients, linkPatient, fetchPatientRiskHistory, fetchPatientFullChatHistory, recordProfileView, updatePregnancyStartDate } from "@/lib/patientApi";
import {
  patientsByPriority,
  type Patient,
  type RiskLevel,
} from "@/data/patients";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const riskColors: Record<RiskLevel, string> = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--health-warning))",
  low: "hsl(var(--health-good))",
};

const riskDotClass: Record<RiskLevel, string> = {
  high: "bg-destructive",
  medium: "bg-[hsl(var(--health-warning))]",
  low: "bg-[hsl(var(--health-good))]",
};

const riskLabelClass: Record<RiskLevel, string> = {
  high: "text-destructive font-semibold",
  medium: "text-[hsl(var(--health-warning))]",
  low: "text-[hsl(var(--health-good))]",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Returns true if the id looks like a real MongoDB ObjectId (24-char hex), not a demo id like 'p1'. */
function isMongoPatient(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

function journeyToChartData(patient: Patient) {
  const order: Record<RiskLevel, number> = { high: 2, medium: 1, low: 0 };
  
  if (!patient.journey || patient.journey.length === 0) {
    return [
      {
        week: patient.weeksPregnant.toString(),
        risk: order[patient.riskLevel],
        riskLabel: patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1),
        details: "Current assessment based on available data."
      }
    ];
  }

  return patient.journey.map((j) => ({
    week: j.week.toString(),
    risk: order[j.riskLevel],
    riskLabel: j.riskLevel.charAt(0).toUpperCase() + j.riskLevel.slice(1),
    ...j,
  }));
}

const PatientDetails = () => {
  const { user, logout, isAsha } = useAuth();
  const { toast } = useToast();
  const locationState = (typeof window !== 'undefined' && window.history.state?.usr) || {};
  const preSelectedId = locationState?.selectedPatientId as string | undefined;
  const [patients, setPatients] = useState<Patient[]>(patientsByPriority || []);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all");

  // Scheduling state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePurpose, setSchedulePurpose] = useState("");

  // Pregnancy Start Date (LMP) state
  const [pregnancyStartDialogOpen, setPregnancyStartDialogOpen] = useState(false);
  const [pregnancyStartInputDate, setPregnancyStartInputDate] = useState("");
  const [isSettingStartDate, setIsSettingStartDate] = useState(false);

  const selectedPatient = selected ?? patients[0] ?? null;
  const chartData = selectedPatient ? journeyToChartData(selectedPatient) : [];

  useEffect(() => {
    if (selectedPatient?.id) {
      recordProfileView(selectedPatient.id).catch(console.error);
    }
  }, [selectedPatient?.id]);

  const filteredPatients = patients.filter(
    (p) => filterRisk === "all" || p.riskLevel === filterRisk
  );

  const loadPatients = async () => {
    if (!user?.id) return;
    try {
      const linkedUserIds = await fetchLinkedPatients(user.id);

      const formatted: Patient[] = await Promise.all(
        linkedUserIds.map(async (link: any) => {
          let riskLevel: "low" | "medium" | "high" = "low";
          let riskReasons: string[] = [];
          let allKeyFactors: string[] = [];

          try {
            const risks = await fetchPatientRiskHistory(link._id);
            if (risks && risks.length > 0) {
              riskLevel = "high";
              riskReasons = risks.map((session: any) => {
                const messages = session.messages || [];
                const highRiskIndex = messages.findIndex((m: any) => m.riskLevel === "high" || m.riskLevel === "risky");

                if (session.mode === "vitals") {
                  const aiMessage = (session.vitalsResult || "").replace(/\*\*/g, '');
                  // Try to find the exact concern sentence instead of the greeting
                  const sentences = aiMessage.split(/[\.\n]/);
                  const concernSentences = sentences.filter((s: string) =>
                    s.toLowerCase().includes('elevated') ||
                    s.toLowerCase().includes('swelling') ||
                    s.toLowerCase().includes('headache') ||
                    s.toLowerCase().includes('concern') ||
                    s.toLowerCase().includes('bleeding')
                  );

                  let exactConcern = "";
                  if (concernSentences.length > 0) {
                    exactConcern = ` - Concern: ${concernSentences[0].trim()}`;
                    allKeyFactors.push("Abnormal Vitals / Symptoms");
                  } else {
                    allKeyFactors.push("Abnormal Vitals");
                  }

                  return `[Vitals Q/A] High-risk vitals reading on ${new Date(session.createdAt).toLocaleDateString()}${exactConcern}`;
                }

                // Chat Mode
                if (highRiskIndex > 0) {
                  const userMessage = messages[highRiskIndex - 1];
                  const text = (userMessage.text || "").trim();

                  if (text.length > 0) {
                    if (text.length <= 60) {
                      allKeyFactors.push(text.charAt(0).toUpperCase() + text.slice(1));
                    } else {
                      allKeyFactors.push("Reported high-risk symptom");
                    }
                    return `[Normal Chat] Reported symptom: "${text}"`;
                  }
                }

                // Fallback: if highRiskIndex is 0 or -1, but the session itself was flagged or we just need the user's last message
                if (messages && messages.length > 0) {
                  const userMessages = messages.filter((m: any) => !m.isBot);
                  if (userMessages.length > 0) {
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const text = (lastUserMsg.text || "").trim();
                    if (text.length > 0) {
                      allKeyFactors.push("Reported high-risk symptom");
                      return `[Normal Chat] Reported symptom: "${text}"`;
                    }
                  }
                }

                // Fallback
                allKeyFactors.push("High-risk chatbot interaction");
                return `[Normal Chat] ${session.title || "High-risk chatbot interaction"}`;
              });

              allKeyFactors = Array.from(new Set(allKeyFactors)).filter(Boolean);
              riskReasons = Array.from(new Set(riskReasons)).filter(Boolean);
            }
          } catch (e) {
            console.error("Failed to fetch risk history", e);
          }

          let journey: { week: number; riskLevel: "low" | "medium" | "high"; details: string }[] = [];
          try {
            const allHistory = await fetchPatientFullChatHistory(link._id);
            if (allHistory && allHistory.length > 0 && link.pregnancyStartDate) {
               const startDate = new Date(link.pregnancyStartDate).getTime();
               const weekMap = new Map<number, { riskLevel: "low" | "medium" | "high", details: string }>();
               
               allHistory.forEach((session: any) => {
                  const chatDate = new Date(session.createdAt || Date.now()).getTime();
                  let week = Math.floor((chatDate - startDate) / (1000 * 60 * 60 * 24 * 7));
                  if (week < 1) week = 1;

                  let sessionRisk: "low" | "medium" | "high" = "low";
                  let details = "Routine checkup";

                  const hasHigh = session.messages?.some((m: any) => m.riskLevel === "high" || m.riskLevel === "risky");
                  const hasMedium = session.messages?.some((m: any) => m.riskLevel === "moderate" || m.riskLevel === "medium");

                  if (hasHigh) {
                    sessionRisk = "high";
                    details = "High risk factors detected in chat/vitals.";
                  } else if (hasMedium) {
                    sessionRisk = "medium";
                    details = "Moderate risk factors flagged for review.";
                  } else {
                    sessionRisk = "low";
                    details = "Vitals and symptoms normal.";
                  }

                  const exist = weekMap.get(week);
                  if (!exist) {
                     weekMap.set(week, { riskLevel: sessionRisk, details });
                  } else {
                     const order: Record<"low" | "medium" | "high", number> = { low: 0, medium: 1, high: 2 };
                     if (order[sessionRisk] > order[exist.riskLevel]) {
                        weekMap.set(week, { riskLevel: sessionRisk, details });
                     }
                  }
               });

               journey = Array.from(weekMap.entries()).map(([w, data]) => ({
                  week: w,
                  riskLevel: data.riskLevel,
                  details: data.details
               })).sort((a, b) => a.week - b.week);
            }
          } catch (e) {
            console.error("Failed to fetch full history", e);
          }

          return {
            id: link._id,
            name: link.name,
            avatarUrl: link.avatar,
            age: link.age || 25,
            weeksPregnant: link.gestationWeek || 0,
            pregnancyStartDate: link.pregnancyStartDate,
            appointments: link.appointments || [],
            bloodType: link.bloodGroup || "-",
            riskLevel: riskLevel,
            keyFactors: allKeyFactors.length ? allKeyFactors : (riskLevel === "high" ? ["High-risk interaction detected"] : ["Routine checkup"]),
            recommendation: riskLevel === "high" ? "Immediate follow-up required." : "Continue routine monitoring.",
            riskReasons: riskReasons.length ? riskReasons : ["No high risk flags"],
            riskRecommendations: riskLevel === "high" ? ["Evaluate patient physically", "Review symptoms"] : ["Monitor"],
            vitals: { headcahe: false, swelling: false },
            journey: journey
          } as unknown as Patient; // Cast to unknown then patient since we don't have all data shapes filled exactly yet
        })
      );

      const allPatients = [...patientsByPriority, ...formatted];

      // Sort so high risk is at the top
      allPatients.sort((a, b) => {
        if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
        if (a.riskLevel !== 'high' && b.riskLevel === 'high') return 1;
        return 0;
      });

      setPatients(allPatients);
      if (allPatients.length > 0 && !selected) {
        // If navigated from DoctorPatientList with a specific patient, pre-select them
        const preMatch = preSelectedId ? allPatients.find(p => p.id === preSelectedId) : null;
        setSelected(preMatch || allPatients[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [user]);

  const handleAddMother = async (data: NewMotherFormData) => {
    if (!user?.id) return;
    setIsLinking(true);
    try {
      await linkPatient(user.id, data.email, data.name);
      toast({
        title: "Success",
        description: "Patient linked successfully",
      });
      setAddDialogOpen(false);
      loadPatients(); // Reload the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link patient",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !scheduleDate || !schedulePurpose) return;

    setIsScheduling(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/patient/${selectedPatient.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: scheduleDate,
          purpose: schedulePurpose
        })
      });

      if (!response.ok) {
        throw new Error("Failed to schedule visit");
      }

      toast({
        title: "Visit Scheduled",
        description: `Successfully scheduled a visit for ${selectedPatient.name}.`,
      });
      setScheduleDialogOpen(false);
      setScheduleDate("");
      setSchedulePurpose("");
      // Optionally reload patient data to get fresh appointments
    } catch (err: any) {
      toast({
        title: "Schedule Failed",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUpdatePregnancyStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !pregnancyStartInputDate) return;

    setIsSettingStartDate(true);
    try {
      await updatePregnancyStartDate(selectedPatient.id, pregnancyStartInputDate);
      toast({
        title: "Date Updated",
        description: `Successfully updated the pregnancy start date for ${selectedPatient.name}.`,
      });
      setPregnancyStartDialogOpen(false);
      loadPatients(); // Reload to update gestation weeks globally
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSettingStartDate(false);
    }
  };

  useEffect(() => {
    if (selectedPatient?.pregnancyStartDate) {
      setPregnancyStartInputDate(new Date(selectedPatient.pregnancyStartDate).toISOString().split('T')[0]);
    } else {
      setPregnancyStartInputDate("");
    }
  }, [selectedPatient?.id]);

  // ASHA worker view: patient list, summary cards, Add New Mother
  if (isAsha) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 lg:px-8 pt-24 pb-12">
          <AshaDashboard ashaName={user?.name ?? "Rani Devi"} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 lg:px-8 pt-24 pb-12">
        {/* Header: Clinician Dashboard */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinician Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              High-risk patients and overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Avatar className="h-9 w-9">
                {user?.avatar && <AvatarImage src={user.avatar} alt="Doctor" className="object-cover" />}
                <AvatarFallback className="bg-primary/20 text-primary">
                  <Stethoscope className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name ?? "Doctor"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="ml-2 rounded-full"
                onClick={() => setAddDialogOpen(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-foreground ml-2"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Patient Assessment Section - symptom/vital input + risk status */}
        {selectedPatient && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {selectedPatient.avatarUrl && <AvatarImage src={selectedPatient.avatarUrl} alt={selectedPatient.name} className="object-cover" />}
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {getInitials(selectedPatient.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-base font-medium text-foreground">
                  Patient: {selectedPatient.name}, {selectedPatient.weeksPregnant} weeks pregnant
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setScheduleDialogOpen(true)}>
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Schedule Visit</span>
                </Button>
{isMongoPatient(selectedPatient.id) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-primary border-primary/20 hover:bg-primary/5" 
                  onClick={() => setPregnancyStartDialogOpen(true)}
                >
                  <Baby className="w-4 h-4" />
                  <span className="hidden sm:inline">Set LMP Date</span>
                </Button>
                )}
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Messages">
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="History">
                  <Clock className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="More options">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Pregnancy Journey */}
              <div className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedPatient.name} – Pregnancy Journey
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Risk level over pregnancy weeks
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="h-[220px] w-full flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="week"
                            padding={{ left: 20, right: 20 }}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          />
                          <YAxis
                            domain={[0, 2]}
                            ticks={[0, 1, 2]}
                            tickFormatter={(v) =>
                              v === 0 ? "Low" : v === 1 ? "Medium" : "High"
                            }
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          />
                          <Tooltip
                            content={({ active, payload }) =>
                              active && payload?.length ? (
                                <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow">
                                  <p className="font-medium">{payload[0].payload.week}</p>
                                  <p className="text-muted-foreground capitalize">
                                    {payload[0].payload.riskLabel} Risk
                                  </p>
                                </div>
                              ) : null
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="risk"
                            stroke={riskColors[selectedPatient.riskLevel]}
                            strokeWidth={2}
                            isAnimationActive={false}
                            dot={{ r: 4, fill: riskColors[selectedPatient.riskLevel] }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="text-muted-foreground">
                        Current: {selectedPatient.weeksPregnant} weeks · Risk:{" "}
                        <span className={riskLabelClass[selectedPatient.riskLevel]}>
                          {selectedPatient.riskLevel}
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPatient.journey[selectedPatient.journey.length - 1]?.details ??
                        "No additional details."}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      Follow-up: {selectedPatient.recommendation}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Risk status + Next steps */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                      Risk Status
                    </p>
                    <div className="flex flex-col items-center justify-center py-4">
                      <div
                        className={`flex items-center justify-center w-32 h-32 rounded-full text-white font-bold text-lg ${selectedPatient.riskLevel === "high"
                          ? "bg-destructive"
                          : selectedPatient.riskLevel === "medium"
                            ? "bg-[hsl(var(--health-warning))]"
                            : "bg-[hsl(var(--health-good))]"
                          }`}
                      >
                        {selectedPatient.riskLevel === "high"
                          ? "HIGH RISK"
                          : selectedPatient.riskLevel === "medium"
                            ? "MEDIUM RISK"
                            : "LOW RISK"}
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Concerns: {selectedPatient.keyFactors.join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-foreground mb-3">Next Steps:</p>
                    <div
                      className={`rounded-lg px-4 py-3 text-sm font-medium text-white ${selectedPatient.riskLevel === "high"
                        ? "bg-destructive"
                        : selectedPatient.riskLevel === "medium"
                          ? "bg-[hsl(var(--health-warning))]"
                          : "bg-[hsl(var(--health-good))]"
                        }`}
                    >
                      {selectedPatient.recommendation}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Vitals Trends Graph */}
            <div className="mt-8">
              <VitalsTrends />
            </div>

            {/* Live Location for Emergency */}
            <div className="mt-8 h-80">
              <LiveLocationCard />
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch gap-6">
          {/* Left: High-Risk Patients list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">High-Risk Patients</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sorted by priority (high → medium → low)
                </p>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1 mb-4 pb-2 border-b border-border shrink-0">
                  <Button variant={filterRisk === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRisk("all")} className="text-xs h-7 px-2">All</Button>
                  <Button variant={filterRisk === "high" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRisk("high")} className="text-xs h-7 px-2 text-destructive">High</Button>
                  <Button variant={filterRisk === "medium" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRisk("medium")} className="text-xs h-7 px-2 text-[hsl(var(--health-warning))]">Med</Button>
                  <Button variant={filterRisk === "low" ? "secondary" : "ghost"} size="sm" onClick={() => setFilterRisk("low")} className="text-xs h-7 px-2 text-[hsl(var(--health-good))]">Low</Button>
                </div>
                <ul className="flex-1 max-h-[500px] overflow-y-auto pr-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                  {filteredPatients.length > 0 ? filteredPatients.map((patient) => {
                    const isSelected = selectedPatient?.id === patient.id;
                    return (
                      <li key={patient.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(patient)}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isSelected
                            ? "bg-secondary border border-border"
                            : "hover:bg-muted/50 border border-transparent"
                            }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${riskDotClass[patient.riskLevel]}`}
                            aria-hidden
                          />
                          <span className="flex-1 min-w-0 font-medium text-foreground truncate">
                            {patient.name}
                          </span>
                          <span
                            className={`text-xs shrink-0 capitalize ${riskLabelClass[patient.riskLevel]}`}
                          >
                            {patient.riskLevel} risk
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 text-muted-foreground ${isSelected ? "text-primary" : ""
                              }`}
                          />
                        </button>
                      </li>
                    );
                  }) : <p className="text-sm text-muted-foreground p-4">No patients linked yet.</p>}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Patient Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Patient Overview</CardTitle>
                {selectedPatient && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {selectedPatient.avatarUrl && <AvatarImage src={selectedPatient.avatarUrl} alt={selectedPatient.name} className="object-cover" />}
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {getInitials(selectedPatient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPatient.weeksPregnant} weeks pregnant
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={selectedPatient.riskLevel === "high" ? "destructive" : "secondary"}
                      className={
                        selectedPatient.riskLevel === "high"
                          ? ""
                          : selectedPatient.riskLevel === "medium"
                            ? "bg-[hsl(var(--health-warning))]/20 text-[hsl(var(--health-warning))] border-0"
                            : "bg-[hsl(var(--health-good))]/20 text-[hsl(var(--health-good))] border-0"
                      }
                    >
                      {selectedPatient.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {selectedPatient ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Key Factors
                      </p>
                      <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
                        {selectedPatient.keyFactors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Recommendation
                      </p>
                      <p
                        className={`text-sm font-medium ${selectedPatient.riskLevel === "high"
                          ? "text-destructive"
                          : "text-foreground"
                          }`}
                      >
                        {selectedPatient.recommendation}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Select a patient from the list.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom: Risk Analysis */}
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6"
          >
            <Card className="w-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedPatient.riskLevel === "high" ? "destructive" : "secondary"}
                    className={
                      selectedPatient.riskLevel === "high"
                        ? ""
                        : selectedPatient.riskLevel === "medium"
                          ? "bg-[hsl(var(--health-warning))]/20 text-[hsl(var(--health-warning))] border-0"
                          : "bg-[hsl(var(--health-good))]/20 text-[hsl(var(--health-good))] border-0"
                    }
                  >
                    {selectedPatient.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Reasons</p>
                    <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                      {selectedPatient.riskReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Recommendations
                    </p>
                    <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                      {selectedPatient.riskRecommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AddNewMotherDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddMother}
          isLoading={isLinking}
        />

        {/* Schedule Visit Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Calendar</DialogTitle>
              <DialogDescription>
                Track {selectedPatient?.name}'s gestation progress and schedule her next appointment.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-foreground">
                {selectedPatient?.weeksPregnant ?? "—"} Weeks Pregnant
              </span>
            </div>

            {/* 40-week Calendar */}
            <PregnancyCalendar
              pregnancyStartDate={selectedPatient?.pregnancyStartDate}
              gestationWeek={selectedPatient?.weeksPregnant}
              appointments={selectedPatient?.appointments as any[]}
            />

            <form onSubmit={handleScheduleVisit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="date">Next Visit Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose / Notes</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Routine checkup, Ultrasound..."
                  required
                  value={schedulePurpose}
                  onChange={(e) => setSchedulePurpose(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isScheduling}>
                  {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Schedule Visit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Set Pregnancy Start Date Dialog */}
        <Dialog open={pregnancyStartDialogOpen} onOpenChange={setPregnancyStartDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Pregnancy Start Date (LMP)</DialogTitle>
              <DialogDescription>
                Enter the Last Menstrual Period (LMP) date for {selectedPatient?.name}. 
                Gestation weeks will be automatically calculated across all dashboards.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePregnancyStart} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="lmp-date">LMP Date</Label>
                <Input
                  id="lmp-date"
                  type="date"
                  required
                  max={new Date().toISOString().split("T")[0]}
                  value={pregnancyStartInputDate}
                  onChange={(e) => setPregnancyStartInputDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setPregnancyStartDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSettingStartDate}>
                  {isSettingStartDate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Date"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default PatientDetails;

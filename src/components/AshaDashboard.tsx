import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle,
  MoreVertical,
  Search,
  UserPlus,
  AlertTriangle,
  Users,
  Bell,
  ChevronRight,
  Droplets,
  ListFilter,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ashaPatients,
  ASHA_VILLAGE,
  DEFAULT_PREGNANT_COUNT,
  DEFAULT_HIGH_RISK_COUNT,
  DEFAULT_NEW_COUNT,
  type AshaPatient,
  type PatientStatusFilter,
  type PregnancyOrder,
} from "@/data/patients";
import { AddNewMotherDialog, type NewMotherFormData } from "./AddNewMotherDialog";
import { cn } from "@/lib/utils";
import { fetchLinkedPatients, linkPatient, fetchPatientRiskHistory } from "@/lib/patientApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatToday() {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Removed formToAshaPatient

interface AshaDashboardProps {
  ashaName: string;
}

export function AshaDashboard({ ashaName }: AshaDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<AshaPatient[]>(ashaPatients || []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PatientStatusFilter>("highRisk");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter === "highRisk") list = list.filter((p) => p.riskLevel === "high");
    else if (filter === "followUp") list = list.filter((p) => p.followUpNeeded);
    // "pregnant" filter shows all (no additional filter)
    return list;
  }, [patients, search, filter]);

  const loadPatients = async () => {
    if (!user?.id) return;
    try {
      const linkedUserIds = await fetchLinkedPatients(user.id);

      const formatted: AshaPatient[] = await Promise.all(
        linkedUserIds.map(async (link: any) => {
          let riskLevel: "low" | "high" = "low";
          let referralText: string | undefined = undefined;

          try {
            const risks = await fetchPatientRiskHistory(link._id);
            if (risks && risks.length > 0) {
              riskLevel = "high";

              let allKeyFactors: string[] = [];
              risks.forEach((session: any) => {
                const messages = session.messages || [];
                const highRiskIndex = messages.findIndex((m: any) => m.riskLevel === "high" || m.riskLevel === "risky");

                if (session.mode === "vitals") {
                  allKeyFactors.push("Abnormal Vitals / Symptoms");
                } else if (highRiskIndex > 0) {
                  const userMessage = messages[highRiskIndex - 1];
                  const text = (userMessage.text || "").trim();
                  if (text.length > 0) {
                    if (text.length <= 60) {
                      allKeyFactors.push(text.charAt(0).toUpperCase() + text.slice(1));
                    } else {
                      allKeyFactors.push("Reported high-risk symptom");
                    }
                  }
                } else if (messages && messages.length > 0) {
                  const userMessages = messages.filter((m: any) => !m.isBot);
                  if (userMessages.length > 0) {
                    const lastUserMsg = userMessages[userMessages.length - 1];
                    const text = (lastUserMsg.text || "").trim();
                    if (text.length > 0) {
                      allKeyFactors.push(text.length <= 60 ? text.charAt(0).toUpperCase() + text.slice(1) : "Reported high-risk symptom");
                    }
                  }
                }
              });

              allKeyFactors = Array.from(new Set(allKeyFactors)).filter(Boolean);
              if (allKeyFactors.length > 0) {
                referralText = allKeyFactors.slice(0, 2).join(", ");
              } else {
                referralText = "High-risk interaction detected";
              }
            }
          } catch (e) {
            console.error("Failed to fetch risk history", e);
          }

          return {
            id: link._id,
            name: link.name,
            age: link.age || 25,
            weeksPregnant: link.gestationWeek || 0,
            bloodType: link.bloodGroup || "-",
            riskLevel: riskLevel,
            pregnancyOrder: "1st" as PregnancyOrder,
            isNew: false,
            followUpNeeded: riskLevel === "high",
            referralText: referralText,
          };
        })
      );

      const allPatients = [...ashaPatients, ...formatted];
      setPatients(allPatients);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [user]);

  const highRiskPatients = useMemo(
    () => patients.filter((p) => p.riskLevel === "high"),
    [patients],
  );

  const pregnantCount = patients.length;
  const highRiskCount = highRiskPatients.length;
  const newCount = patients.filter((p) => p.isNew).length;

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

  return (
    <div className="space-y-6 pb-24">
      {/* Header: ASHA: Rani Devi, Village, Today, icons */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-accent/20 text-accent text-sm">
              {getInitials(ashaName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">ASHA: {ashaName}</p>
            <p className="text-sm text-muted-foreground">Village: {ASHA_VILLAGE}</p>
            <p className="text-xs text-muted-foreground">Today: {formatToday()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Messages">
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="More options">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </motion.header>

      {/* Summary cards: Pregnant, High Risk, New */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--heart))]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[hsl(var(--heart))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pregnant</p>
              <p className="text-lg font-bold text-foreground">{pregnantCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">High Risk</p>
              <p className="text-lg font-bold text-foreground">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--health-good))]/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[hsl(var(--health-good))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">New</p>
              <p className="text-lg font-bold text-foreground">{newCount}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter tabs: All, Pregnant, ▲ High Risk, Follow-up + list filter icon */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all" as const, label: "All", icon: Users },
            { id: "pregnant" as const, label: "Pregnant", icon: Users },
            { id: "highRisk" as const, label: "▲ High Risk", icon: AlertTriangle },
            { id: "followUp" as const, label: "Follow-up", icon: AlertTriangle },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full",
              filter === tab.id && tab.id === "highRisk" && "bg-destructive hover:bg-destructive/90",
            )}
            onClick={() => setFilter(tab.id)}
          >
            {tab.icon && <tab.icon className="w-4 h-4 mr-1" />}
            {tab.label}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Filter or sort list">
          <ListFilter className="w-5 h-5" />
        </Button>
      </div>

      {/* Patient list cards */}
      <ScrollArea className="h-[400px] pr-2">
        <ul className="space-y-3">
          {filteredPatients.map((patient) => (
            <li key={patient.id}>
              <Card
                role="button"
                tabIndex={0}
                className={cn(
                  "overflow-hidden transition-colors cursor-pointer hover:bg-muted/30",
                  patient.riskLevel === "high" &&
                  "border-destructive bg-destructive/5",
                )}
                onClick={() => navigate(`/patient/${patient.id}`, { state: { patient } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/patient/${patient.id}`, { state: { patient } });
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {getInitials(patient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {patient.name} ({patient.age})
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                        {patient.riskLevel === "high" && (
                          <Bell className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span>
                          {patient.weeksPregnant} weeks
                          {patient.bloodType !== "-" ? ` • ${patient.bloodType}` : ""}
                          {patient.extraLabel ? ` • ${patient.extraLabel}` : ""}
                          {patient.hbStatus === "low" ? " Hb: Low" : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {patient.riskLevel === "high" && patient.referralText && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            HIGH RISK
                            <Droplets className="w-3.5 h-3.5" />
                            {patient.referralText}
                          </span>
                        )}
                        {patient.followUpNeeded && patient.riskLevel !== "high" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--health-warning))] bg-[hsl(var(--health-warning))]/10 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            FOLLOW-UP NEEDED
                          </span>
                        )}
                        {patient.lastVisit && !patient.referralText && !patient.followUpNeeded && (
                          <span className="text-xs text-muted-foreground">
                            Last Visit: {patient.lastVisit}
                          </span>
                        )}
                        {patient.milestone && (
                          <span className="text-xs text-[hsl(var(--health-good))] ml-auto">
                            {patient.milestone}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* HIGH RISK PATIENTS section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-foreground">
                HIGH RISK PATIENTS ({highRiskCount})
              </h3>
            </div>
            <Button variant="link" className="text-primary p-0 h-auto">
              View All
            </Button>
          </div>
          <ul className="space-y-2">
            {highRiskPatients.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 text-left"
                  onClick={() => navigate(`/patient/${p.id}`, { state: { patient: p } })}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name} {p.referralText ? `· ${p.referralText}` : ""}
                    </p>
                    {!p.referralText && (
                      <p className="text-xs text-muted-foreground">
                        {p.name} ({p.age}) · {p.bloodType} Hb: {p.hbStatus ?? "—"}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* FAB: Add New Mother */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 px-6 gap-2"
            onClick={() => setAddDialogOpen(true)}
          >
            <UserPlus className="w-5 h-5" />
            Add New Mother
          </Button>
        </motion.div>
      </div>

      <AddNewMotherDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddMother}
        isLoading={isLinking}
      />
    </div>
  );
}

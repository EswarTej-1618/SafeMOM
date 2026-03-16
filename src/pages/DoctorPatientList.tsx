import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, LogOut, Search, ChevronRight, Baby, UserPlus, Bell, Trash2, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { fetchLinkedPatients, fetchPatientRiskHistory, unlinkPatient } from "@/lib/patientApi";
import { patientsByPriority, type Patient, type RiskLevel } from "@/data/patients";
import { type ApiUser } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const riskBadgeClass: Record<RiskLevel, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-[hsl(var(--health-warning))]/20 text-[hsl(var(--health-warning))] border-[hsl(var(--health-warning))]/30",
  low: "bg-[hsl(var(--health-good))]/20 text-[hsl(var(--health-good))] border-[hsl(var(--health-good))]/30",
};

const riskDotClass: Record<RiskLevel, string> = {
  high: "bg-destructive",
  medium: "bg-[hsl(var(--health-warning))]",
  low: "bg-[hsl(var(--health-good))]",
};

const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

/** Returns true if an id looks like a Mongo ObjectId (24 hex); demo ids like 'p1' won't match. */
function isMongoId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

/** Convert API user to Patient shape, risk determined later. */
async function apiUserToPatientWithRisk(u: ApiUser): Promise<Patient> {
  let riskLevel: RiskLevel = "low";
  let keyFactors: string[] = [];

  try {
    const risks = await fetchPatientRiskHistory(u._id);
    if (risks && risks.length > 0) {
      riskLevel = "high";
      risks.forEach((session: any) => {
        const messages = session.messages || [];
        if (session.mode === "vitals") {
          keyFactors.push("Abnormal Vitals / Symptoms");
        } else {
          const hiIdx = messages.findIndex((m: any) => m.riskLevel === "high" || m.riskLevel === "risky");
          if (hiIdx > 0) {
            const text = (messages[hiIdx - 1].text || "").trim();
            if (text.length > 0 && text.length <= 60) {
              keyFactors.push(text.charAt(0).toUpperCase() + text.slice(1));
            } else {
              keyFactors.push("Reported high-risk symptom");
            }
          } else {
            keyFactors.push("High-risk chatbot interaction");
          }
        }
      });
      keyFactors = Array.from(new Set(keyFactors)).filter(Boolean);
    }
  } catch {
    // Risk fetch failed; keep as low
  }

  return {
    id: u._id,
    name: u.name,
    avatarUrl: u.avatar,
    weeksPregnant: u.gestationWeek ?? 0,
    riskLevel,
    keyFactors: keyFactors.length ? keyFactors : (riskLevel === "high" ? ["High-risk interaction detected"] : ["Routine checkup"]),
    recommendation: riskLevel === "high" ? "Immediate follow-up required." : "Continue routine monitoring.",
    vitals: {},
    journey: [],
    riskReasons: [],
    riskRecommendations: [],
    pregnancyStartDate: u.pregnancyStartDate,
    appointments: u.appointments ?? [],
  };
}

const DoctorPatientList = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, [user?.id]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      // Start with demo/default patients
      let allPatients: Patient[] = [...patientsByPriority];

      if (user?.id) {
        const apiUsers = await fetchLinkedPatients(user.id);
        if (apiUsers.length > 0) {
          const mapped = await Promise.all(apiUsers.map(apiUserToPatientWithRisk));
          allPatients = [...allPatients, ...mapped];
        }
      }

      // Sort by risk: high → medium → low
      allPatients.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
      setPatients(allPatients);
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation(); // Don't navigate
    if (!isMongoId(patient.id)) {
      toast({ title: "Cannot remove", description: "Default demo patients cannot be removed.", variant: "destructive" });
      return;
    }
    if (!confirm(`Remove ${patient.name} from your patient list? Their account will NOT be deleted.`)) return;

    setDeletingId(patient.id);
    try {
      await unlinkPatient(patient.id);
      setPatients((prev) => prev.filter((p) => p.id !== patient.id));
      toast({ title: "Patient removed", description: `${patient.name} has been unlinked from your list.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove patient", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = patients
    .filter((p) => filterRisk === "all" || p.riskLevel === filterRisk)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const highCount = patients.filter((p) => p.riskLevel === "high").length;
  const medCount = patients.filter((p) => p.riskLevel === "medium").length;
  const lowCount = patients.filter((p) => p.riskLevel === "low").length;

  const handleSelectPatient = (p: Patient) => {
    navigate("/patient-details", { state: { selectedPatientId: p.id } });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background glow orbs — matching SafeMOM aesthetic */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-20 left-1/4 w-[420px] h-[420px] bg-destructive/8 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[320px] h-[320px] bg-primary/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-1/3 w-[300px] h-[300px] bg-[hsl(var(--health-warning))]/6 rounded-full blur-[100px]" />
      </div>
      <Navbar />
      <main className="relative z-10 container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/30 shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold text-base">{user ? getInitials(user.name) : "DR"}</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">My Patients</h1>
              <p className="text-sm text-muted-foreground">
                {patients.length} patients · sorted by risk priority
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/notification-history")}>
              <Bell className="w-4 h-4" /> Alerts
            </Button>
            <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground" onClick={() => logout()}>
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </motion.div>

        {/* Summary strip */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "High Risk",
              count: highCount,
              gradient: "from-destructive/30 to-destructive/10",
              border: "border-destructive/30",
              text: "text-destructive",
              glow: "shadow-[0_0_24px_hsl(var(--destructive)/0.2)]",
            },
            {
              label: "Medium Risk",
              count: medCount,
              gradient: "from-[hsl(var(--health-warning))]/30 to-[hsl(var(--health-warning))]/10",
              border: "border-[hsl(var(--health-warning))]/30",
              text: "text-[hsl(var(--health-warning))]",
              glow: "shadow-[0_0_24px_hsl(var(--health-warning)/0.15)]",
            },
            {
              label: "Low Risk",
              count: lowCount,
              gradient: "from-[hsl(var(--health-good))]/30 to-[hsl(var(--health-good))]/10",
              border: "border-[hsl(var(--health-good))]/30",
              text: "text-[hsl(var(--health-good))]",
              glow: "shadow-[0_0_24px_hsl(var(--health-good)/0.15)]",
            },
          ].map(({ label, count, gradient, border, text, glow }) => (
            <div key={label} className={`rounded-2xl border bg-gradient-to-br ${gradient} ${border} ${glow} p-5 text-center`}>
              <p className={`text-3xl font-bold ${text}`}>{count}</p>
              <p className={`text-xs font-semibold mt-1 ${text} opacity-80`}>{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Search + Filter */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {(["all", "high", "medium", "low"] as const).map((r) => (
              <Button key={r} size="sm" variant={filterRisk === r ? "default" : "outline"} className="rounded-xl capitalize" onClick={() => setFilterRisk(r)}>
                {r}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Loading patients & risk data...</p>
          </div>
        )}

        {/* Patient Cards */}
        {!loading && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No patients found.</p>
              </div>
            )}
            <AnimatePresence>
              {filtered.map((patient, i) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: i * 0.04 }}
                  className={`w-full bg-card rounded-2xl px-5 py-4 border transition-all duration-200 group cursor-pointer hover:shadow-[0_0_18px_hsl(var(--primary)/0.12)] hover:border-primary/30 ${
                    patient.riskLevel === "high"
                      ? "border-destructive/30"
                      : patient.riskLevel === "medium"
                      ? "border-[hsl(var(--health-warning))]/20"
                      : "border-border"
                  }`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar with proper clipping */}
                    <div className="h-11 w-11 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center ring-2 ring-border">
                      {patient.avatarUrl ? (
                        <img
                          src={patient.avatarUrl}
                          alt={patient.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {getInitials(patient.name)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{patient.name}</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${riskBadgeClass[patient.riskLevel]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${riskDotClass[patient.riskLevel]}`} />
                          {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Baby className="w-3.5 h-3.5" />
                          {patient.weeksPregnant} wks pregnant
                        </span>
                        {patient.keyFactors.length > 0 && (
                          <span className="truncate hidden sm:block">
                            {patient.keyFactors.slice(0, 2).join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button — only for real (Mongo) patients */}
                    {isMongoId(patient.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={(e) => handleDelete(e, patient)}
                        disabled={deletingId === patient.id}
                        title="Remove patient from your list"
                      >
                        {deletingId === patient.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorPatientList;

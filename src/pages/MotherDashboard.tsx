import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Phone,
  MapPin,
  User,
  Mail,
  Calendar,
  Pencil,
  Menu,
  HelpCircle,
  ChevronRight,
  Plus,
  UserCircle,
  Stethoscope,
  Droplets,
  Scale,
  Activity,
  AlertTriangle,
  FileText,
  Loader2,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  LogOut,
  Link as LinkIcon,
} from "lucide-react";
import PartnerIcon from "@/components/icons/PartnerIcon";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMotherProfile } from "@/data/patients";
import { getMotherProfileById, getVitalsHistory, saveMotherProfile, type MotherSignupProfile } from "@/data/motherProfiles";
import { generateMotherReport } from "@/lib/gemini";
import { updateProfile, getPartnerStatusApi, removePartnerApi, linkPartnerApi } from "@/lib/api";
import AIChatbot from "@/components/AIChatbot";
import { EditMotherProfileSheet } from "@/components/EditMotherProfileSheet";
import { MaternalReportDisplay } from "@/components/MaternalReportDisplay";
import { fetchChatHistory } from "@/lib/chatApi";
import { ProfileViewsDialog } from "@/components/ProfileViewsDialog";
import { PregnancyCalendar } from "@/components/PregnancyCalendar";
import { LiveLocationCard } from "@/components/LiveLocationCard";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function bpStatus(systolic: number, diastolic: number): { label: string; className: string } {
  if (systolic >= 140 || diastolic >= 90) return { label: "High", className: "text-destructive" };
  if (systolic >= 120 || diastolic >= 80) return { label: "Elevated", className: "text-[hsl(var(--health-warning))]" };
  return { label: "Normal", className: "text-[hsl(var(--health-good))]" };
}

function hbStatus(hb: number): { label: string; className: string } {
  if (hb < 10) return { label: "Low", className: "text-destructive" };
  if (hb < 11) return { label: "Borderline", className: "text-[hsl(var(--health-warning))]" };
  return { label: "Normal", className: "text-[hsl(var(--health-good))]" };
}

const MotherDashboard = () => {
  const { user, reloadUser, logout, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  // Try old localStorage first for backward compat, then fall back to the auth user (MongoDB)
  const storedProfile = useMemo(() => (user ? getMotherProfileById(user.id) : null), [user?.id, refreshKey]);
  const demoProfile = getMotherProfile();

  const [activeTab, setActiveTab] = useState("personal");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRange, setReportRange] = useState("1week");
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [viewsDialogOpen, setViewsDialogOpen] = useState(false);

  // Account tab state
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);

  const [delPassword, setDelPassword] = useState("");
  const [delShowPass, setDelShowPass] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [delDialogOpen, setDelDialogOpen] = useState(false);

  // Partner tab state
  const [partnerLinked, setPartnerLinked] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{ id: string; name: string; email: string; avatar?: string } | null>(null);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [partnerSuccess, setPartnerSuccess] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Load partner status on mount (only for authenticated mothers)
  useEffect(() => {
    if (isAuthMother || isStoredMother) {
      getPartnerStatusApi().then((res) => {
        if (res.ok) {
          setPartnerLinked(res.linked);
          setPartnerInfo(res.linked ? res.partner : null);
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePassword = async () => {
    setCpError(null);
    setCpSuccess(false);
    if (!cpCurrent || !cpNew || !cpConfirm) {
      setCpError("All fields are required.");
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError("New passwords do not match.");
      return;
    }
    if (cpNew.length < 6) {
      setCpError("New password must be at least 6 characters.");
      return;
    }
    setCpLoading(true);
    const res = await changePassword(cpCurrent, cpNew);
    setCpLoading(false);
    if (res.success) {
      setCpSuccess(true);
      setCpCurrent("");
      setCpNew("");
      setCpConfirm("");
    } else {
      setCpError(res.error || "Failed to change password.");
    }
  };

  const handleDeleteAccount = async () => {
    setDelError(null);
    if (!delPassword) {
      setDelError("Please enter your password.");
      return;
    }
    setDelLoading(true);
    const res = await deleteAccount(delPassword);
    setDelLoading(false);
    if (res.success) {
      setDelDialogOpen(false);
      navigate("/");
    } else {
      setDelError(res.error || "Failed to delete account.");
    }
  };

  // Determine data source: localStorage profile → auth user (MongoDB) → demo profile
  const isStoredMother = !!storedProfile;
  const isAuthMother = !isStoredMother && !!user && user.role === "mother";
  const profile = storedProfile ?? (demoProfile ? { patient: demoProfile.patient, detail: demoProfile.detail } : null);

  if (!profile && !isAuthMother) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No profile data available.</p>
      </div>
    );
  }

  const patient = (isStoredMother || isAuthMother) ? null : (profile as { patient: typeof demoProfile.patient; detail: typeof demoProfile.detail }).patient;
  const detail = (isStoredMother || isAuthMother) ? null : (profile as { patient: typeof demoProfile.patient; detail: typeof demoProfile.detail }).detail;
  const vitals = patient?.vitals;
  const bp = vitals?.bloodPressure;
  const bpDisplay = bp ? `${bp.systolic} / ${bp.diastolic}` : "—";
  const bpStat = bp ? bpStatus(bp.systolic, bp.diastolic) : { label: "—", className: "text-muted-foreground" };
  const hb = vitals?.hemoglobin ?? 0;
  const hbStat = hb > 0 ? hbStatus(hb) : { label: "—", className: "text-muted-foreground" };
  const isHighRisk = patient?.riskLevel === "high";
  const highRiskReason = patient?.keyFactors?.[0] ?? "High risk";

  // Display values: prefer auth user data (from MongoDB) over hardcoded demo data
  const displayName = isStoredMother ? (storedProfile as MotherSignupProfile).name : (isAuthMother && user ? user.name : patient!.name);
  const displayAge = isStoredMother ? (storedProfile as MotherSignupProfile).age : (isAuthMother && user ? (user.age ?? "—") : detail!.age);
  const displayBloodType = isStoredMother ? (storedProfile as MotherSignupProfile).bloodGroup : (isAuthMother && user ? (user.bloodGroup ?? "—") : detail!.bloodType);

  const handleGenerateReport = async () => {
    if (!profile) return;
    setReportLoading(true);
    setReportError(null);
    setReportText(null);
    try {
      const profileId = isStoredMother ? storedProfile.id : (user?.id || "unknown");
      
      let history;
      let targetProfile = profile;

      if (isAuthMother && user) {
        // Authenticated users get their history from the API and map their user profile
        const chatHistoryData = await fetchChatHistory(profileId);
        // Filter to only include the history based on selected range
        const filterDate = new Date();
        switch (reportRange) {
          case "1day": filterDate.setDate(filterDate.getDate() - 1); break;
          case "1week": filterDate.setDate(filterDate.getDate() - 7); break;
          case "1month": filterDate.setMonth(filterDate.getMonth() - 1); break;
          case "3months": filterDate.setMonth(filterDate.getMonth() - 3); break;
          case "6months": filterDate.setMonth(filterDate.getMonth() - 6); break;
          default: filterDate.setDate(filterDate.getDate() - 7); break;
        }
        
        // Map chat API response to VitalsHistoryEntry format that Gemini builder expects
        history = chatHistoryData
          .filter((session: any) => {
             if (!session.vitalsResult || session.vitalsResult.trim() === "") return false;
             const sessionDate = new Date(session.createdAt);
             return sessionDate >= filterDate;
          })
          .map((session: any) => ({
            timestamp: new Date(session.createdAt).toLocaleDateString(),
            vitalsSummary: session.vitalsResult,
            riskLevel: session.messages?.[session.messages.length - 1]?.riskLevel || "unknown",
          }));
        
        targetProfile = {
          name: user.name,
          age: user.age?.toString() || "Not provided",
          gestationWeek: user.gestationWeek || "Not provided",
          bloodGroup: user.bloodGroup || "Not set",
          pregnancyNumber: user.pregnancyNumber || "Not provided",
          chronicConditions: user.chronicConditions || [],
          otherCondition: user.otherCondition || "",
          onMedication: user.onMedication || false,
          medicationNames: user.medicationNames || "",
          vitals: user.vitals || {}
        } as unknown as MotherSignupProfile;
      } else {
        // Legacy localStorage fallback
        history = getVitalsHistory(profileId);
      }

      const report = await generateMotherReport(targetProfile as MotherSignupProfile, history);
      setReportText(report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-12 max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Header: profile pic, name, age, blood type, edit, menu, help */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                {(isAuthMother && user?.avatar) && (
                  <AvatarImage src={user.avatar} alt={displayName} className="object-cover rounded-xl" />
                )}
                <AvatarFallback className="rounded-xl bg-primary/20 text-primary text-xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
                  {((isStoredMother && storedProfile) || (isAuthMother && user)) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full ml-1"
                        aria-label="Edit profile"
                        onClick={() => setEditSheetOpen(true)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {/* Profile Views Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                        aria-label="Profile Views"
                        onClick={() => setViewsDialogOpen(true)}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Age: {displayAge} · {displayBloodType}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu">
                <Menu className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Help">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs: Personal Info, Medical Profile, Language, Account */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 rounded-xl bg-muted/50 p-1 py-1.5 h-auto">
              <TabsTrigger value="personal" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Personal
              </TabsTrigger>
              <TabsTrigger value="medical" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Medical
              </TabsTrigger>
              <TabsTrigger value="language" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Language
              </TabsTrigger>
              <TabsTrigger value="partner" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Partner
              </TabsTrigger>
              <TabsTrigger value="account" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-5 space-y-5">
              {(isStoredMother && storedProfile) ? (
                <>
                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Primary info</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </div>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Name: {storedProfile.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Email: {storedProfile.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Age: {storedProfile.age} · Blood group: {storedProfile.bloodGroup || "Not set"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">
                            Gestation: {storedProfile.gestationWeek} weeks · {storedProfile.pregnancyNumber === 1 ? "First" : storedProfile.pregnancyNumber === 2 ? "Second" : `${storedProfile.pregnancyNumber}th`} pregnancy
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Profile vitals */}
                  {(storedProfile.vitals && Object.keys(storedProfile.vitals).length > 0) && (
                    <Card className="rounded-2xl overflow-hidden">
                      <CardContent className="pt-6 pb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-foreground">Health vitals</h2>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {storedProfile.vitals.weightKg != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Weight</p>
                              <p className="font-medium text-foreground text-sm">{storedProfile.vitals.weightKg} kg</p>
                            </div>
                          )}
                          {(storedProfile.vitals.bloodPressureSystolic != null || storedProfile.vitals.bloodPressureDiastolic != null) && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Blood pressure</p>
                              <p className="font-medium text-foreground text-sm">
                                {storedProfile.vitals.bloodPressureSystolic ?? "—"} / {storedProfile.vitals.bloodPressureDiastolic ?? "—"} mmHg
                              </p>
                            </div>
                          )}
                          {storedProfile.vitals.hemoglobin != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Hemoglobin</p>
                              <p className="font-medium text-foreground text-sm">{storedProfile.vitals.hemoglobin} g/dL</p>
                            </div>
                          )}
                          {storedProfile.vitals.bloodSugarMgDl != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Blood sugar</p>
                              <p className="font-medium text-foreground text-sm">{storedProfile.vitals.bloodSugarMgDl} mg/dL</p>
                            </div>
                          )}
                          {storedProfile.vitals.heartRateBpm != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Heart rate</p>
                              <p className="font-medium text-foreground text-sm">{storedProfile.vitals.heartRateBpm} bpm</p>
                            </div>
                          )}
                          {storedProfile.vitals.spo2Percent != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">SpO₂</p>
                              <p className="font-medium text-foreground text-sm">{storedProfile.vitals.spo2Percent}%</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Edit profile to add or update vitals.</p>
                      </CardContent>
                    </Card>
                  )}
                  {(!storedProfile.vitals || Object.keys(storedProfile.vitals || {}).length === 0) && (
                    <Card className="rounded-2xl overflow-hidden border-dashed border-border">
                      <CardContent className="pt-6 pb-6">
                        <p className="text-sm text-muted-foreground mb-2">No vitals entered yet. Add weight, BP, hemoglobin, blood sugar, heart rate, SpO₂ for a complete profile.</p>
                        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Add vitals
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : isAuthMother && user ? (
                <>
                  {/* MongoDB-authenticated mother profile */}
                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Primary info</h3>
                        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </div>
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Name: {user.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Email: {user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">Age: {user.age ?? "—"} · Blood group: {user.bloodGroup || "Not set"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">
                            Gestation: {user.gestationWeek ?? "—"} weeks · {user.pregnancyNumber === 1 ? "First" : user.pregnancyNumber === 2 ? "Second" : `${user.pregnancyNumber ?? 1}th`} pregnancy
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pregnancy Status from MongoDB */}
                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <UserCircle className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">Pregnancy Calendar</h2>
                      </div>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user.gestationWeek ?? "—"} Weeks Pregnant
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Track your 40-week journey and doctor visits
                          </p>
                        </div>
                      </div>
                  <PregnancyCalendar 
                    pregnancyStartDate={user.pregnancyStartDate} 
                    gestationWeek={user.gestationWeek} 
                    appointments={user.appointments} 
                  />
                </CardContent>
              </Card>

              {/* Vitals area for Auth user could be added here similar to stored profile */}

                  {/* Vitals area for Auth user could be added here similar to stored profile */}
                  {(user.vitals && Object.keys(user.vitals).length > 0) ? (
                    <Card className="rounded-2xl overflow-hidden">
                      <CardContent className="pt-6 pb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-foreground">Health vitals</h2>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {user.vitals.weightKg != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Weight</p>
                              <p className="font-medium text-foreground text-sm">{user.vitals.weightKg} kg</p>
                            </div>
                          )}
                          {(user.vitals.bloodPressureSystolic != null || user.vitals.bloodPressureDiastolic != null) && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Blood pressure</p>
                              <p className="font-medium text-foreground text-sm">
                                {user.vitals.bloodPressureSystolic ?? "—"} / {user.vitals.bloodPressureDiastolic ?? "—"} mmHg
                              </p>
                            </div>
                          )}
                          {user.vitals.hemoglobin != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Hemoglobin</p>
                              <p className="font-medium text-foreground text-sm">{user.vitals.hemoglobin} g/dL</p>
                            </div>
                          )}
                          {user.vitals.bloodSugarMgDl != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Blood sugar</p>
                              <p className="font-medium text-foreground text-sm">{user.vitals.bloodSugarMgDl} mg/dL</p>
                            </div>
                          )}
                          {user.vitals.heartRateBpm != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">Heart rate</p>
                              <p className="font-medium text-foreground text-sm">{user.vitals.heartRateBpm} bpm</p>
                            </div>
                          )}
                          {user.vitals.spo2Percent != null && (
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-0.5">SpO₂</p>
                              <p className="font-medium text-foreground text-sm">{user.vitals.spo2Percent}%</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Edit profile to add or update vitals.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="rounded-2xl overflow-hidden border-dashed border-border">
                      <CardContent className="pt-6 pb-6">
                        <p className="text-sm text-muted-foreground mb-2">No vitals entered yet. Add weight, BP, hemoglobin, blood sugar, heart rate, SpO₂ for a complete profile.</p>
                        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Add vitals
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6 space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{detail!.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{detail!.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">Husband: {detail!.husbandName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">
                          {detail!.scheduledVisit} · {detail!.scheduledVisitTime}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <UserCircle className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">Pregnancy Calendar</h2>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {patient!.weeksPregnant} Weeks Pregnant
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due Date: {detail!.dueDate}
                          </p>
                        </div>
                      </div>

                      <PregnancyCalendar 
                        gestationWeek={patient!.weeksPregnant} 
                      />
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Health Indicators card - demo profile only */}
              {!isStoredMother && detail && (
                <>
                  <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">Health Indicators</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Stethoscope className="w-4 h-4" />
                            BP
                          </div>
                          <p className="font-medium text-foreground text-sm">{bpDisplay}</p>
                          <p className={cn("text-xs font-medium", bpStat.className)}>{bpStat.label}</p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Droplets className="w-4 h-4" />
                            Sugar
                          </div>
                          <p className="font-medium text-foreground text-sm">{detail.sugar ?? "—"} mg/dL</p>
                          <p className="text-xs font-medium text-[hsl(var(--health-good))]">Normal</p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Droplets className="w-4 h-4" />
                            Hemoglobin
                          </div>
                          <p className="font-medium text-foreground text-sm">{hb > 0 ? `${hb} g/dL` : "—"}</p>
                          <p className={cn("text-xs font-medium", hbStat.className)}>{hbStat.label}</p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Scale className="w-4 h-4" />
                            Weight
                          </div>
                          <p className="font-medium text-foreground text-sm">{detail.weight ?? "—"} kg</p>
                          <p className="text-xs font-medium text-[hsl(var(--health-warning))]">
                            {detail.weightStatus ?? "—"}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Last Updated: {detail.lastUpdated}</p>
                    </CardContent>
                  </Card>

                  {isHighRisk && patient && (
                    <Card className="rounded-2xl overflow-hidden border-destructive/50 bg-destructive/5">
                      <CardContent className="pt-6 pb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <h2 className="font-semibold text-foreground">
                              HIGH RISK PATIENTS (5)
                            </h2>
                          </div>
                          <Button size="sm" className="rounded-lg gap-1">
                            <Plus className="w-4 h-4" />
                            Add New Visit
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {getInitials(patient.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {highRiskReason} · Last Visit: {detail.lastVisit}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              
              <div className="mt-5">
                <LiveLocationCard />
              </div>
            </TabsContent>

            <TabsContent value="medical" className="mt-5 space-y-5">
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-foreground">Medical Profile</h2>
                    {isStoredMother && storedProfile && (
                      <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)} className="gap-1">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isStoredMother && storedProfile ? (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1">Chronic conditions</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {storedProfile.chronicConditions.length ? storedProfile.chronicConditions.join(", ") : "None"}
                        {storedProfile.otherCondition ? `; Other: ${storedProfile.otherCondition}` : ""}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-1">Medication</p>
                      <p className="text-sm text-muted-foreground">
                        {storedProfile.onMedication ? storedProfile.medicationNames || "Yes (names not provided)" : "No"}
                      </p>
                    </>
                  ) : isAuthMother && user ? (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1">Chronic conditions</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {user.chronicConditions?.length ? user.chronicConditions.join(", ") : "None"}
                        {user.otherCondition ? `; Other: ${user.otherCondition}` : ""}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-1">Medication</p>
                      <p className="text-sm text-muted-foreground">
                        {user.onMedication ? user.medicationNames || "Yes (names not provided)" : "No"}
                      </p>
                    </>
                  ) : patient ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Key factors: {patient.keyFactors.join(", ")}.
                      </p>
                      <p className="text-sm text-foreground mt-2 font-medium">
                        {patient.recommendation}
                      </p>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl overflow-hidden">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h2 className="font-semibold text-foreground">Personal health report</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your personal health report is generated from:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
                      <li>Your profile (personal info, chronic conditions, medications, vitals you entered above)</li>
                      <li>Vitals history from Live Vitals and AI chat (when you click “Analyze my vitals”)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-4">
                      The report is created by AI (Gemini) and is for guidance only — it does not replace a doctor’s advice.
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <Select value={reportRange} onValueChange={setReportRange}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1day">Last 1 Day</SelectItem>
                          <SelectItem value="1week">Last 1 Week</SelectItem>
                          <SelectItem value="1month">Last 1 Month</SelectItem>
                          <SelectItem value="3months">Last 3 Months</SelectItem>
                          <SelectItem value="6months">Last 6 Months</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleGenerateReport}
                        disabled={reportLoading}
                        className="gap-2"
                      >
                        {reportLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>
                    {reportError && (
                      <p className="text-sm text-destructive mt-3">{reportError}</p>
                    )}
                    {reportText && (
                      <div className="mt-4">
                        <MaternalReportDisplay
                          markdown={reportText}
                          patientName={displayName}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="language" className="mt-5">
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <h2 className="font-semibold text-foreground mb-3">Language</h2>
                  <p className="text-sm text-muted-foreground">Preferred language: English</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Partner Tab ────────────────────────────────── */}
            <TabsContent value="partner" className="mt-5 space-y-5">
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PartnerIcon className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Partner / Husband Access</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Give your partner read-only access to your health profile and vitals. They will also receive risk alert emails.
                  </p>

                  {partnerLinked && partnerInfo ? (
                    <>
                      {/* Partner info and Remove button row */}
                      <div className="flex items-center gap-3 w-full">
                        {/* Partner info card */}
                        <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                            {partnerInfo.avatar ? (
                              <img
                                src={partnerInfo.avatar}
                                alt={partnerInfo.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <PartnerIcon className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{partnerInfo.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{partnerInfo.email}</p>
                          </div>
                          <span className="text-xs font-medium text-[hsl(var(--health-good))] bg-[hsl(var(--health-good))]/10 px-2 py-1 rounded-full shrink-0">Linked</span>
                        </div>

                        {/* Remove button — outside the card, right side */}
                        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-2 shrink-0 h-11 px-4" id="remove-partner-btn">
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove partner access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {partnerInfo.name} will no longer be able to view your health data or receive risk alert emails.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async (e) => {
                                e.preventDefault();
                                setPartnerLoading(true);
                                setPartnerError(null);
                                const res = await removePartnerApi();
                                setPartnerLoading(false);
                                if (res.ok) {
                                  setPartnerLinked(false);
                                  setPartnerInfo(null);
                                  setPartnerSuccess("Partner removed successfully.");
                                  setRemoveDialogOpen(false);
                                } else {
                                  setPartnerError(res.error || "Failed to remove partner.");
                                  setRemoveDialogOpen(false);
                                }
                              }}
                              disabled={partnerLoading}
                              className="bg-destructive hover:bg-destructive/90 gap-2"
                            >
                              {partnerLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Removing…</>
                              ) : (
                                <>Remove</>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="partner-email"
                            type="email"
                            placeholder="Partner's registered email address"
                            value={partnerEmail}
                            onChange={(e) => { setPartnerEmail(e.target.value); setPartnerError(null); setPartnerSuccess(null); }}
                            className="pl-9 h-11"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your partner must first create a <strong>Partner / Husband</strong> account on SafeMOM using this email.
                        </p>
                      </div>

                      {partnerError && (
                        <p className="text-sm text-destructive">{partnerError}</p>
                      )}
                      {partnerSuccess && (
                        <p className="text-sm text-[hsl(var(--health-good))]">{partnerSuccess}</p>
                      )}

                      <Button
                        onClick={async () => {
                          if (!partnerEmail.trim()) {
                            setPartnerError("Please enter your partner's email.");
                            return;
                          }
                          setPartnerLoading(true);
                          setPartnerError(null);
                          setPartnerSuccess(null);
                          const res = await linkPartnerApi(partnerEmail.trim());
                          setPartnerLoading(false);
                          if (res.ok) {
                            setPartnerLinked(true);
                            setPartnerInfo(res.partner);
                            setPartnerEmail("");
                            setPartnerSuccess(`${res.partner?.name} linked successfully!`);
                          } else {
                            setPartnerError(res.error || "Failed to link partner.");
                          }
                        }}
                        disabled={partnerLoading}
                        className="gap-2 w-full"
                        id="add-partner-btn"
                      >
                        {partnerLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Linking…</>
                        ) : (
                          <><PartnerIcon className="w-4 h-4" />Add Partner</>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Account Security Tab ─────────────────────────────────── */}
            <TabsContent value="account" className="mt-5 space-y-5">

              {/* Change Password */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Change Password</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Update your login password. You'll need to enter your current password to confirm.</p>

                  {/* Current password */}
                  <div className="relative">
                    <Input
                      id="cp-current"
                      type={cpShowCurrent ? "text" : "password"}
                      placeholder="Current password"
                      value={cpCurrent}
                      onChange={(e) => { setCpCurrent(e.target.value); setCpError(null); setCpSuccess(false); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setCpShowCurrent((v) => !v)}
                      aria-label={cpShowCurrent ? "Hide password" : "Show password"}
                    >
                      {cpShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* New password */}
                  <div className="relative">
                    <Input
                      id="cp-new"
                      type={cpShowNew ? "text" : "password"}
                      placeholder="New password (min 6 characters)"
                      value={cpNew}
                      onChange={(e) => { setCpNew(e.target.value); setCpError(null); setCpSuccess(false); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setCpShowNew((v) => !v)}
                      aria-label={cpShowNew ? "Hide password" : "Show password"}
                    >
                      {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Confirm new password */}
                  <Input
                    id="cp-confirm"
                    type="password"
                    placeholder="Confirm new password"
                    value={cpConfirm}
                    onChange={(e) => { setCpConfirm(e.target.value); setCpError(null); setCpSuccess(false); }}
                  />

                  {cpError && (
                    <p className="text-sm text-destructive">{cpError}</p>
                  )}
                  {cpSuccess && (
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--health-good))]">
                      <CheckCircle2 className="w-4 h-4" />
                      Password changed successfully!
                    </div>
                  )}

                  <Button
                    onClick={handleChangePassword}
                    disabled={cpLoading}
                    className="gap-2"
                  >
                    {cpLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                    ) : (
                      <><Shield className="w-4 h-4" />Update Password</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Login Security */}
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Login Security</h2>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
                      <p className="text-sm font-medium text-foreground">{user?.email ?? "—"}</p>
                    </div>
                    {user?.isEmailVerified ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--health-good))] bg-[hsl(var(--health-good))]/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[hsl(var(--health-warning))] bg-[hsl(var(--health-warning))]/10 px-2 py-1 rounded-full">
                        Not verified
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Session type</p>
                    <p className="text-sm font-medium text-foreground">JWT token — stored in this browser only</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 w-full"
                    onClick={() => { logout(); navigate("/"); }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out of all devices
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone – Delete Account */}
              <Card className="rounded-2xl overflow-hidden border-destructive/40 bg-destructive/5">
                <CardContent className="pt-6 pb-6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <h2 className="font-semibold text-destructive">Delete Account</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action <strong>cannot be undone</strong>.
                  </p>

                  <AlertDialog open={delDialogOpen} onOpenChange={(open) => { setDelDialogOpen(open); if (!open) { setDelPassword(""); setDelError(null); } }}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2 w-full" id="delete-account-btn">
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your account and all data. You cannot undo this. Enter your current password to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="py-2 space-y-2">
                        <div className="relative">
                          <Input
                            id="del-password"
                            type={delShowPass ? "text" : "password"}
                            placeholder="Enter your password"
                            value={delPassword}
                            onChange={(e) => { setDelPassword(e.target.value); setDelError(null); }}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setDelShowPass((v) => !v)}
                            aria-label={delShowPass ? "Hide password" : "Show password"}
                          >
                            {delShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {delError && (
                          <p className="text-sm text-destructive">{delError}</p>
                        )}
                      </div>

                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={delLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                          disabled={delLoading}
                          className="bg-destructive hover:bg-destructive/90 gap-2"
                        >
                          {delLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</>
                          ) : (
                            <><Trash2 className="w-4 h-4" />Yes, delete my account</>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      {((isStoredMother && storedProfile) || (isAuthMother && user)) && (
        <>
          <EditMotherProfileSheet
            initialData={isAuthMother ? user : storedProfile}
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            onSave={async (data) => {
              if (isAuthMother) {
                const res = await updateProfile(data);
                if (res.ok && res.user) {
                  await reloadUser();
                } else {
                  console.error("Failed to update profile", res.error);
                  throw new Error(res.error || "Update failed");
                }
              } else {
                saveMotherProfile(data);
                setRefreshKey((k) => k + 1);
              }
            }}
          />
          <AIChatbot motherProfile={isAuthMother ? (user as any) : storedProfile} />
          <ProfileViewsDialog open={viewsDialogOpen} onOpenChange={setViewsDialogOpen} />
        </>
      )}
    </div>
  );
};

export default MotherDashboard;

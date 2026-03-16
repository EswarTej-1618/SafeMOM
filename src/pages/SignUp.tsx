import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Baby,
  Stethoscope,
  HeartHandshake,
  Calendar,
  Droplets,
  Heart,
  Pill,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { CHRONIC_CONDITIONS } from "@/data/motherProfiles";
import PartnerIcon from "@/components/icons/PartnerIcon";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const roleConfig = {
  mother: {
    title: "Mother / Patient",
    icon: Baby,
    subtitle: "We need a few health details",
  },
  doctor: {
    title: "Doctor",
    icon: Stethoscope,
    subtitle: "Create your doctor account",
  },
  asha: {
    title: "ASHA Worker",
    icon: HeartHandshake,
    subtitle: "Create your ASHA account",
  },
  partner: {
    title: "Partner / Husband",
    icon: PartnerIcon,
    subtitle: "Create your partner account",
  },
};

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [searchParams] = useSearchParams();
  const roleId = (searchParams.get("role") || "mother") as keyof typeof roleConfig;
  const role = roleConfig[roleId] || roleConfig.mother;
  const RoleIcon = role.icon;

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    gestationWeek: "",
    bloodGroup: "",
    pregnancyNumber: "1",
    chronicConditions: [] as string[],
    otherCondition: "",
    onMedication: false,
    medicationNames: "",
  });

  const toggleCondition = (label: string) => {
    setForm((p) => ({
      ...p,
      chronicConditions: p.chronicConditions.includes(label)
        ? p.chronicConditions.filter((c) => c !== label)
        : [...p.chronicConditions, label],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setError("Please fill in name, email, and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Mother-specific validation
    if (roleId === "mother") {
      const age = Number(form.age) || 0;
      const gestationWeek = Number(form.gestationWeek) || 0;
      if (age < 15 || age > 50) {
        setError("Please enter a valid age (15–50).");
        return;
      }
      if (gestationWeek < 1 || gestationWeek > 42) {
        setError("Please enter a valid gestation week (1–42).");
        return;
      }
    }

    setLoading(true);
    try {
      const signupData: Record<string, unknown> = {
        name,
        email,
        password,
        role: roleId,
      };

      if (roleId === "mother") {
        signupData.age = Number(form.age);
        signupData.gestationWeek = Number(form.gestationWeek);
        signupData.bloodGroup = form.bloodGroup || "—";
        signupData.pregnancyNumber = Number(form.pregnancyNumber) || 1;
        signupData.chronicConditions = form.chronicConditions.slice();
        signupData.otherCondition = form.otherCondition.trim();
        signupData.onMedication = form.onMedication;
        signupData.medicationNames = form.onMedication
          ? form.medicationNames.trim()
          : "";
      }

      const result = await signup(signupData as Parameters<typeof signup>[0]);
      if (result.success) {
        setSuccess(true);
        setSuccessMessage(
          result.message || "Account created! Check your email to verify."
        );
      } else {
        setError(result.error || "Sign-up failed.");
      }
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="min-h-screen flex items-center justify-center px-6 pt-20 pb-12">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-32 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-32 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md text-center"
          >
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <div className="w-20 h-20 rounded-full bg-health-good/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-health-good" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Account Created! 🎉
              </h1>
              <p className="text-muted-foreground mb-6">{successMessage}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    if (roleId === "mother") {
                      navigate("/mother-dashboard", { replace: true });
                    } else if (roleId === "partner") {
                      navigate("/partner-dashboard", { replace: true });
                    } else if (roleId === "doctor") {
                      navigate("/doctor-patients", { replace: true });
                    } else {
                      navigate("/patient-details", { replace: true });
                    }
                  }}
                  className="rounded-xl"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    );
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
          className="relative z-10 w-full max-w-lg"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/role-select")}
            className="gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <RoleIcon className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Create account</h1>
                <p className="text-sm text-muted-foreground">
                  {role.title} — {role.subtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <ScrollArea className="max-h-[60vh] pr-3 -mr-3">
                <div className="space-y-6">
                  {/* Account */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Account
                    </h2>
                    <div className="grid gap-2">
                      <Label>Full name</Label>
                      <Input
                        placeholder={
                          roleId === "doctor"
                            ? "e.g. Dr. Meena Sharma"
                            : roleId === "asha"
                              ? "e.g. Rani Devi"
                              : "e.g. Priya Sharma"
                        }
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, email: e.target.value }))
                          }
                          className="pl-10 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••  (min 6 characters)"
                          value={form.password}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, password: e.target.value }))
                          }
                          className="pl-10 pr-10 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mother-specific health fields */}
                  {roleId === "mother" && (
                    <>
                      {/* Primary info */}
                      <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          Primary info
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-1">
                            <Label>Age</Label>
                            <Input
                              type="number"
                              min={15}
                              max={50}
                              placeholder="e.g. 28"
                              value={form.age}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, age: e.target.value }))
                              }
                              className="rounded-xl"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Gestation (weeks)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={42}
                              placeholder="e.g. 24"
                              value={form.gestationWeek}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  gestationWeek: e.target.value,
                                }))
                              }
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label>Blood group</Label>
                          <select
                            value={form.bloodGroup}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                bloodGroup: e.target.value,
                              }))
                            }
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Select</option>
                            {BLOOD_GROUPS.map((bg) => (
                              <option key={bg} value={bg}>
                                {bg}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1">
                          <Label>First time pregnant or 2nd time?</Label>
                          <div className="flex gap-4">
                            {[
                              { value: "1", label: "1st pregnancy" },
                              { value: "2", label: "2nd pregnancy" },
                              { value: "3", label: "3rd or more" },
                            ].map((opt) => (
                              <label
                                key={opt.value}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name="pregnancyNumber"
                                  checked={form.pregnancyNumber === opt.value}
                                  onChange={() =>
                                    setForm((p) => ({
                                      ...p,
                                      pregnancyNumber: opt.value,
                                    }))
                                  }
                                  className="rounded-full border-input"
                                />
                                <span className="text-sm text-foreground">
                                  {opt.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chronic conditions */}
                      <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Do you have any chronic diseases? (select all that apply)
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CHRONIC_CONDITIONS.map((label) => (
                            <label
                              key={label}
                              className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={form.chronicConditions.includes(label)}
                                onCheckedChange={() => toggleCondition(label)}
                              />
                              <span className="text-sm text-foreground">
                                {label}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="grid gap-1">
                          <Label>Other (if not listed)</Label>
                          <Input
                            placeholder="e.g. Migraine, Epilepsy"
                            value={form.otherCondition}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                otherCondition: e.target.value,
                              }))
                            }
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Medication */}
                      <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          Are you using any medication?
                        </h2>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="onMedication"
                              checked={!form.onMedication}
                              onChange={() =>
                                setForm((p) => ({
                                  ...p,
                                  onMedication: false,
                                  medicationNames: "",
                                }))
                              }
                              className="rounded-full"
                            />
                            <span className="text-sm">No</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="onMedication"
                              checked={form.onMedication}
                              onChange={() =>
                                setForm((p) => ({ ...p, onMedication: true }))
                              }
                              className="rounded-full"
                            />
                            <span className="text-sm">Yes</span>
                          </label>
                        </div>
                        {form.onMedication && (
                          <div className="grid gap-1">
                            <Label>Medication names</Label>
                            <Textarea
                              placeholder="e.g. Folic acid, Iron tablets, Thyroid medicine"
                              value={form.medicationNames}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  medicationNames: e.target.value,
                                }))
                              }
                              className="rounded-xl min-h-[80px]"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {loading ? "Creating account..." : "Sign Up & Continue"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => navigate(`/login?role=${roleId}`)}
              >
                Log in
              </button>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default SignUp;

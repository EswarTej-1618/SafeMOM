/**
 * ASHA-only: minimal patient profile with optional high-risk section.
 * Doctor flow is unchanged (stays on PatientDetails).
 */
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Building2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { ashaPatients, type AshaPatient } from "@/data/patients";
import { VitalsTrends } from "@/components/VitalsTrends";
import { LiveLocationCard } from "@/components/LiveLocationCard";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAsha } = useAuth();

  if (!isAsha) {
    navigate("/patient-details", { replace: true });
    return null;
  }

  const statePatient = location.state?.patient as AshaPatient | undefined;
  const patient = statePatient ?? (id ? ashaPatients.find((p) => p.id === id) : undefined) ?? null;
  if (!patient) {
    navigate("/patient-details", { replace: true });
    return null;
  }

  const isHighRisk = patient.riskLevel === "high";
  const reason = patient.riskReason ?? patient.referralText ?? "High risk";
  const recommendation = patient.referralText ?? "Refer to PHC immediately";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/patient-details")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </Button>

          {/* Minimal details card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {getInitials(patient.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">{patient.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {patient.weeksPregnant} weeks pregnant · {patient.age} yrs · {patient.bloodType}
                    {patient.hbStatus ? ` · Hb: ${patient.hbStatus}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vitals Trends Graph */}
          <div className="mt-8">
            <VitalsTrends />
          </div>

          {/* Live Location for Emergency */}
          <div className="mt-8 h-80">
            <LiveLocationCard />
          </div>

          {/* High-risk section: only when profile has high risk (ASHA) */}
          {isHighRisk && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-4"
            >
              <Button className="w-full rounded-lg h-11" size="lg">
                SAVE & CHECK RISK
              </Button>
              <Card className="overflow-hidden">
                <CardContent className="pt-6 pb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    RISK STATUS
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0" />
                        <span className="text-lg font-bold text-destructive">HIGH RISK</span>
                      </div>
                      <p className="text-sm text-foreground">Reason: {reason}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <AlertCircle className="w-4 h-4 text-[hsl(var(--health-warning))] shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {recommendation}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center w-24 h-24 rounded-full bg-destructive text-white font-bold text-sm text-center shrink-0"
                      aria-hidden
                    >
                      HIGH RISK
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                      className="flex-1 rounded-lg gap-2 bg-[hsl(var(--health-good))] hover:bg-[hsl(var(--health-good))]/90 text-white"
                      size="lg"
                    >
                      <Phone className="w-4 h-4" />
                      Call ANM
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-lg gap-2"
                      size="lg"
                    >
                      <Building2 className="w-4 h-4" />
                      Refer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PatientProfile;

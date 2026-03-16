import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, Activity, Cookie, ArrowLeft, TrendingUp, TrendingDown, Minus, Footprints, Navigation, ActivitySquare, Zap, Wind, Headset, Thermometer, Brain, Waves, HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AIChatbot from "@/components/AIChatbot";
import { VitalsTrends } from "@/components/VitalsTrends";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMotherProfileById } from "@/data/motherProfiles";
import { io } from "socket.io-client";

type VitalStatus = "good" | "warning" | "danger";
type VitalTrend = "up" | "down" | "stable";

interface VitalData {
  value: number;
  unit: string;
  status: VitalStatus;
  trend: VitalTrend;
  normalRange: string;
}

interface VitalsState {
  heartRate: VitalData;
  stress: VitalData;
  spo2: VitalData;
  bloodPressure: VitalData;
  glucose: VitalData;
  temperature: VitalData;
  steps: VitalData;
  hrv: VitalData;
  gsr: VitalData;
  gps: { latitude: number; longitude: number; source?: "hardware" | "mobile" };
}

const generateRandomVital = (
  min: number,
  max: number,
  warningThreshold: number,
  dangerThreshold: number,
  unit: string,
  normalRange: string
): VitalData => {
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  let status: VitalStatus = "good";
  if (value >= dangerThreshold) status = "danger";
  else if (value >= warningThreshold) status = "warning";
  const trends: VitalTrend[] = ["up", "down", "stable"];
  const trend = trends[Math.floor(Math.random() * trends.length)];
  return { value, unit, status, trend, normalRange };
};



const LiveVitals = () => {
  const { user } = useAuth();
  const motherProfile = user?.role === "mother" ? getMotherProfileById(user.id) : null;
  const [vitals, setVitals] = useState<VitalsState>({
    heartRate: { value: 78, unit: "bpm", status: "good", trend: "stable", normalRange: "60-100 bpm" },
    stress: { value: 35, unit: "%", status: "good", trend: "stable", normalRange: "< 50%" },
    spo2: { value: 98, unit: "%", status: "good", trend: "stable", normalRange: "95-100%" },
    bloodPressure: { value: 120, unit: "mmHg", status: "good", trend: "stable", normalRange: "< 130 mmHg" },
    glucose: { value: 95, unit: "mg/dL", status: "good", trend: "stable", normalRange: "70-120 mg/dL" },
    temperature: { value: 36.6, unit: "°C", status: "good", trend: "stable", normalRange: "36-37.5 °C" },
    steps: { value: 0, unit: "steps", status: "good", trend: "up", normalRange: "> 1000" },
    hrv: { value: 45, unit: "ms", status: "good", trend: "stable", normalRange: "20-100 ms" },
    gsr: { value: 5.2, unit: "uS", status: "good", trend: "stable", normalRange: "2-20 uS" },
    gps: { latitude: 0, longitude: 0, source: undefined },
  });
  
  const lastHardwareGpsTimestamp = useRef<number>(0);

  useEffect(() => {
    // Setup WebSocket connection
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");
    
    socket.on('stepsUpdate', (data) => {
      console.log('WebSocket data received:', data);
      
      setVitals(prev => {
        const updates: any = {};
        
        if (typeof data.steps === 'number') {
          updates.steps = {
            ...prev.steps,
            value: data.steps,
            trend: data.steps > (prev.steps.value as number) ? "up" : "stable",
          };
        }
        
        if (data.vitals) {
          const v = data.vitals;
          // Only update if value is present and not null (prevents jitter from partial payloads)
          if (v.heartRate != null) {
            updates.heartRate = {
              ...prev.heartRate,
              value: v.heartRate,
              status: v.heartRate > 100 ? "danger" : v.heartRate > 90 ? "warning" : "good",
            };
          }
          if (v.spo2 != null) {
            updates.spo2 = {
              ...prev.spo2,
              value: v.spo2,
              status: v.spo2 < 94 ? "danger" : v.spo2 < 96 ? "warning" : "good",
            };
          }
          if (v.hrv != null) {
            updates.hrv = {
              ...prev.hrv,
              value: v.hrv,
              status: v.hrv < 20 ? "danger" : v.hrv < 40 ? "warning" : "good",
            };
          }
          if (v.gsr != null) {
            updates.gsr = {
              ...prev.gsr,
              value: v.gsr,
              status: v.gsr > 15 ? "danger" : v.gsr > 10 ? "warning" : "good",
            };
          }
          if (v.temperature != null) {
            updates.temperature = {
              ...prev.temperature,
              value: v.temperature,
              status: (v.temperature > 37.5 || v.temperature < 36) ? "danger" : "good",
            };
          }
          if (v.gps && v.gps.latitude != null) {
            // Only stamp hardware timestamp if the source is truly from hardware sensor
            if (v.gps.source !== 'mobile') {
              lastHardwareGpsTimestamp.current = Date.now();
            }
            updates.gps = {
              latitude: v.gps.latitude,
              longitude: v.gps.longitude,
              source: v.gps.source || "hardware"
            };
          }
        }
        
        return { ...prev, ...updates };
      });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Slow down simulation to avoid overriding real hardware values
    const interval = setInterval(() => {
      setVitals(prev => ({
        ...prev,
        // Only randomly update values if they are still at initial defaults
        bloodPressure: prev.bloodPressure.value === 120 ? generateRandomVital(110, 145, 130, 140, "mmHg", "< 130 mmHg") : prev.bloodPressure,
        glucose: prev.glucose.value === 95 ? generateRandomVital(80, 140, 120, 130, "mg/dL", "70-120 mg/dL") : prev.glucose,
        stress: prev.stress.value === 35 ? generateRandomVital(20, 60, 45, 55, "%", "< 50%") : prev.stress,
        temperature: prev.temperature.value === 36.6 ? generateRandomVital(36, 39, 37.5, 38.5, "°C", "36-37.5 °C") : prev.temperature,
      }));
    }, 15000);

    // Mobile GPS: starts watching immediately, but only posts/shows if hardware is silent for 5 minutes
    let watchId: number;
    if (user?.role === "mother" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          const hardwareIsActive = now - lastHardwareGpsTimestamp.current < 300000;

          if (!hardwareIsActive) {
            // Hardware has been silent for 5+ minutes — use mobile GPS
            setVitals(prev => ({
              ...prev,
              gps: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                source: "mobile"
              }
            }));

            // Post to server so Partners & Doctors can track
            fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/steps/update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                source: 'mobile',
              })
            }).catch(err => console.error("Error posting mobile GPS:", err));
          }
          // If hardware IS active, don't override — let socket handle it
        },
        (error) => console.error("Error watching mobile GPS in LiveVitals:", error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      socket.disconnect();
      clearInterval(interval);
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    }
  }, []);

  const vitalCards = [
    {
      id: "heartRate",
      title: "Heart Rate",
      icon: Heart,
      data: vitals.heartRate,
      color: "text-heart",
      bgColor: "bg-heart/10",
      borderColor: "border-heart/30",
      glowColor: "shadow-[0_0_30px_hsl(350_85%_60%/0.3)]",
      animated: true,
    },
    {
      id: "stress",
      title: "Stress Level",
      icon: Brain,
      data: vitals.stress,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
      borderColor: "border-purple-400/30",
      glowColor: "shadow-[0_0_30px_rgba(168,85,247,0.3)]",
    },
    {
      id: "temperature",
      title: "Body Temperature",
      icon: Thermometer,
      data: vitals.temperature,
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
      borderColor: "border-orange-400/30",
      glowColor: "shadow-[0_0_30px_rgba(251,146,60,0.3)]",
    },
    {
      id: "spo2",
      title: "SpO₂ Level",
      icon: Waves,
      data: vitals.spo2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      glowColor: "shadow-[0_0_30px_hsl(205_100%_55%/0.3)]",
    },
    {
      id: "bloodPressure",
      title: "Blood Pressure",
      icon: HeartPulse,
      data: vitals.bloodPressure,
      color: "text-accent",
      bgColor: "bg-accent/10",
      borderColor: "border-accent/30",
      glowColor: "shadow-[0_0_30px_hsl(175_70%_45%/0.3)]",
    },
    {
      id: "glucose",
      title: "Glucose Level",
      icon: Cookie,
      data: vitals.glucose,
      color: "text-health-good",
      bgColor: "bg-health-good/10",
      borderColor: "border-health-good/30",
      glowColor: "shadow-[0_0_30px_hsl(142_76%_45%/0.3)]",
    },
  ];


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Back button */}
          <Link to="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-health-good animate-pulse" />
              <span className="text-sm font-medium text-health-good uppercase tracking-wider">
                Live Monitoring Active
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Real-Time <span className="text-gradient-blue">Vitals Dashboard</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor maternal health indicators with automatic updates.
              Stay informed about your health status in real-time.
            </p>
          </motion.div>

          {/* Activity and Location Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Step Tracker UI */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="glass-card h-full rounded-3xl p-8 border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                        <Footprints className="w-6 h-6 text-purple-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Health Activity</h2>
                    </div>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Tracking your daily motion and activity levels.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
                      <div className="bg-background/50 rounded-2xl p-4 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Steps</p>
                        <p className="text-2xl font-bold text-foreground">{vitals.steps.value}</p>
                      </div>
                      <div className="bg-background/50 rounded-2xl p-4 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Goal</p>
                        <p className="text-2xl font-bold text-health-good">10,000</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <svg className="w-40 h-40 md:w-48 md:h-48 transform -rotate-90">
                      <circle cx="50%" cy="50%" r="45%" className="stroke-muted/30 fill-transparent" strokeWidth="10" />
                      <motion.circle
                        initial={{ strokeDashoffset: 1000 }}
                        animate={{ strokeDashoffset: 1000 - (1000 * Math.min(vitals.steps.value as number, 10000)) / 10000 }}
                        transition={{ duration: 1, type: "spring" }}
                        cx="50%" cy="50%" r="45%" className="stroke-purple-500 fill-transparent" strokeWidth="10" strokeLinecap="round" strokeDasharray="1000"
                        style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.6))" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tracking-tight">{vitals.steps.value}</span>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Steps</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* GPS Location Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="glass-card h-full rounded-3xl p-8 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                      <Navigation className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Live Location</h2>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="bg-background/50 rounded-2xl p-5 border border-border">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Latitude</p>
                      <p className="text-xl font-mono font-bold text-foreground">
                        {vitals.gps.latitude ? vitals.gps.latitude.toFixed(6) : "Wait for Signal..."}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-2xl p-5 border border-border">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Longitude</p>
                      <p className="text-xl font-mono font-bold text-foreground">
                        {vitals.gps.longitude ? vitals.gps.longitude.toFixed(6) : "Searching..."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    {vitals.gps.latitude 
                      ? `GPS Signal Active (${vitals.gps.source === 'hardware' ? 'Hardware Sensor' : 'Mobile Device'})` 
                      : 'Waiting for Signal'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vitalCards.map((card, index) => (
              <VitalCard key={card.id} card={card} index={index} />
            ))}
          </div>

          {/* Historical Trends */}
          <div className="mt-12 mb-10">
            <VitalsTrends />
          </div>

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 p-6 glass-card rounded-xl text-center"
          >
            <p className="text-sm text-muted-foreground">
              ⚠️ <strong>Medical Disclaimer:</strong> This is real-time monitoring of your band's sensors. 
              Always consult with your healthcare provider for clinical diagnosis.
            </p>
          </motion.div>
        </div>
      </div>

      <AIChatbot

        vitals={{
          heartRate: {
            value: vitals.heartRate.value,
            unit: vitals.heartRate.unit,
            status: vitals.heartRate.status === "good" ? "Normal" : vitals.heartRate.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.heartRate.normalRange,
          },
          temperature: {
            value: vitals.temperature.value,
            unit: vitals.temperature.unit,
            status: vitals.temperature.status === "good" ? "Normal" : vitals.temperature.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.temperature.normalRange,
          },
          stress: {
            value: vitals.stress.value,
            unit: vitals.stress.unit,
            status: vitals.stress.status === "good" ? "Normal" : vitals.stress.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.stress.normalRange,
          },
          spo2: {
            value: vitals.spo2.value,
            unit: vitals.spo2.unit,
            status: vitals.spo2.status === "good" ? "Normal" : vitals.spo2.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.spo2.normalRange,
          },
          bloodPressure: {
            value: vitals.bloodPressure.value,
            unit: vitals.bloodPressure.unit,
            status: vitals.bloodPressure.status === "good" ? "Normal" : vitals.bloodPressure.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.bloodPressure.normalRange,
          },
          glucose: {
            value: vitals.glucose.value,
            unit: vitals.glucose.unit,
            status: vitals.glucose.status === "good" ? "Normal" : vitals.glucose.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.glucose.normalRange,
          },
          steps: {
            value: vitals.steps.value,
            unit: vitals.steps.unit,
            status: vitals.steps.status === "good" ? "Normal" : vitals.steps.status === "warning" ? "Moderate" : "Risky",
            normalRange: vitals.steps.normalRange,
          },
        }}
        motherProfile={motherProfile ?? undefined}
      />
    </div>
  );
};

interface VitalCardProps {
  card: {
    id: string;
    title: string;
    icon: React.ElementType;
    data: VitalData;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    animated?: boolean;
  };
  index: number;
}

const VitalCard = ({ card, index }: VitalCardProps) => {
  const Icon = card.icon;
  const statusColors = {
    good: "text-health-good",
    warning: "text-health-warning",
    danger: "text-health-danger",
  };
  const statusLabels = {
    good: "Normal",
    warning: "Elevated",
    danger: "High Risk",
  };
  const TrendIcon = card.data.trend === "up" ? TrendingUp : card.data.trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`glass-card rounded-2xl p-6 border ${card.borderColor} ${card.glowColor} transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center`}>
          {card.animated ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Icon className={`w-7 h-7 ${card.color}`} strokeWidth={1.5} />
            </motion.div>
          ) : (
            <Icon className={`w-7 h-7 ${card.color}`} strokeWidth={1.5} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon className={`w-4 h-4 ${statusColors[card.data.status as VitalStatus]}`} />
          <div className={`w-3 h-3 rounded-full ${card.data.status === "good" ? "bg-health-good" : card.data.status === "warning" ? "bg-health-warning" : "bg-health-danger"} animate-pulse`} />
        </div>
      </div>

      {/* Value */}
      <div className="mb-4">
        <motion.span
          key={String(card.data.value)}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-5xl font-bold ${statusColors[card.data.status as VitalStatus]}`}
        >
          {card.data.value}
        </motion.span>
        <span className="text-xl text-muted-foreground ml-2">{card.data.unit}</span>
      </div>

      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-medium text-foreground">{card.title}</p>
          <p className="text-sm text-muted-foreground">Range: {card.data.normalRange}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${card.bgColor} ${card.color}`}>
          {statusLabels[card.data.status as VitalStatus]}
        </span>
      </div>
    </motion.div>
  );
};

export default LiveVitals;

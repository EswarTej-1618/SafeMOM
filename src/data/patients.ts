export type RiskLevel = "high" | "medium" | "low";

export interface PatientVitals {
  bloodPressure?: { systolic: number; diastolic: number };
  headache?: boolean;
  swelling?: boolean;
  hemoglobin?: number;
}

export interface JourneyPoint {
  week: number;
  riskLevel: RiskLevel;
  details?: string;
}

export interface Appointment {
  date: string | Date;
  purpose: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt?: string | Date;
}

export interface Patient {
  id: string;
  name: string;
  avatarUrl?: string;
  weeksPregnant: number;
  riskLevel: RiskLevel;
  keyFactors: string[];
  recommendation: string;
  vitals: PatientVitals;
  journey: JourneyPoint[];
  riskReasons: string[];
  riskRecommendations: string[];
  pregnancyStartDate?: string | Date;
  appointments?: Appointment[];
}

const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

export function sortPatientsByPriority(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
}

export const dummyPatients: Patient[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    weeksPregnant: 32,
    riskLevel: "high",
    keyFactors: ["Elevated BP", "Swelling", "Low Hemoglobin"],
    recommendation: "Immediate doctor visit required.",
    vitals: {
      bloodPressure: { systolic: 156, diastolic: 100 },
      headache: true,
      swelling: true,
      hemoglobin: 9.2,
    },
    journey: [
      { week: 24, riskLevel: "medium", details: "Medium Risk" },
      { week: 28, riskLevel: "low", details: "Low Risk" },
      { week: 30, riskLevel: "high", details: "High Risk" },
      { week: 32, riskLevel: "high", details: "High Blood Pressure, Headache, Low Hemoglobin" },
    ],
    riskReasons: ["Very high blood pressure", "Headache & swelling", "Low hemoglobin"],
    riskRecommendations: [
      "Seek immediate medical attention.",
      "Visit the nearest clinic or hospital right away.",
    ],
  },
  {
    id: "p2",
    name: "Anita Gupta",
    weeksPregnant: 28,
    riskLevel: "low",
    keyFactors: ["Stable vitals", "Good hemoglobin"],
    recommendation: "Continue routine check-ups.",
    vitals: {
      bloodPressure: { systolic: 118, diastolic: 76 },
      headache: false,
      swelling: false,
      hemoglobin: 11.5,
    },
    journey: [
      { week: 20, riskLevel: "low" },
      { week: 24, riskLevel: "low" },
      { week: 28, riskLevel: "low" },
    ],
    riskReasons: ["All parameters within normal range"],
    riskRecommendations: ["Maintain current care plan.", "Next visit in 2 weeks."],
  },
  {
    id: "p3",
    name: "Suma Patel",
    weeksPregnant: 34,
    riskLevel: "medium",
    keyFactors: ["Mild swelling", "Borderline BP"],
    recommendation: "Monitor closely; consider extra visit in 1 week.",
    vitals: {
      bloodPressure: { systolic: 138, diastolic: 88 },
      headache: false,
      swelling: true,
      hemoglobin: 10.8,
    },
    journey: [
      { week: 28, riskLevel: "low" },
      { week: 32, riskLevel: "medium" },
      { week: 34, riskLevel: "medium", details: "Mild swelling, Borderline BP" },
    ],
    riskReasons: ["Borderline blood pressure", "Mild swelling"],
    riskRecommendations: ["Increase rest.", "Reduce salt intake.", "Recheck BP in 1 week."],
  },
  {
    id: "p4",
    name: "Neha Rao",
    weeksPregnant: 30,
    riskLevel: "medium",
    keyFactors: ["Low hemoglobin", "Fatigue"],
    recommendation: "Iron supplementation; follow-up in 2 weeks.",
    vitals: {
      bloodPressure: { systolic: 122, diastolic: 78 },
      headache: false,
      swelling: false,
      hemoglobin: 9.8,
    },
    journey: [
      { week: 24, riskLevel: "low" },
      { week: 28, riskLevel: "medium" },
      { week: 30, riskLevel: "medium", details: "Low Hemoglobin, Fatigue" },
    ],
    riskReasons: ["Low hemoglobin", "Reported fatigue"],
    riskRecommendations: ["Iron supplements as prescribed.", "Diet rich in iron.", "Recheck Hb in 2 weeks."],
  },
];

export const patientsByPriority = sortPatientsByPriority(dummyPatients);

// --- ASHA worker view: extended patient fields for list/cards ---
export type PregnancyOrder = "1st" | "2nd" | "3rd";
export type PatientStatusFilter = "all" | "pregnant" | "highRisk" | "followUp";

export interface AshaPatient {
  id: string;
  name: string;
  age: number;
  weeksPregnant: number;
  bloodType: string;
  hbStatus?: "normal" | "low" | "high";
  lastVisit?: string;
  riskLevel: RiskLevel;
  referralText?: string;
  riskReason?: string; // e.g. "High BP" for high-risk display (ASHA profile)
  pregnancyOrder: PregnancyOrder;
  isNew: boolean;
  followUpNeeded: boolean;
  milestone?: string; // e.g. "1MM ✓"
  extraLabel?: string; // e.g. "O+ • SM"
}

export const ashaPatients: AshaPatient[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    age: 26,
    weeksPregnant: 32,
    bloodType: "B+",
    hbStatus: "low",
    riskLevel: "high",
    riskReason: "High BP",
    referralText: "Refer to PHC immediately",
    pregnancyOrder: "1st",
    isNew: false,
    followUpNeeded: false,
  },
  {
    id: "p5",
    name: "Sita Devi",
    age: 29,
    weeksPregnant: 28,
    bloodType: "B+",
    hbStatus: "low",
    riskLevel: "medium",
    pregnancyOrder: "2nd",
    isNew: false,
    followUpNeeded: true,
  },
  {
    id: "p6",
    name: "Lakshmi",
    age: 24,
    weeksPregnant: 22,
    bloodType: "O+",
    extraLabel: "SM",
    lastVisit: "10 Jan",
    riskLevel: "low",
    pregnancyOrder: "1st",
    isNew: false,
    followUpNeeded: false,
    milestone: "1MM ✓",
  },
  {
    id: "p2",
    name: "Anita Gupta",
    age: 25,
    weeksPregnant: 28,
    bloodType: "A+",
    hbStatus: "normal",
    lastVisit: "8 Jan",
    riskLevel: "low",
    pregnancyOrder: "1st",
    isNew: false,
    followUpNeeded: false,
  },
  {
    id: "p3",
    name: "Suma Patel",
    age: 30,
    weeksPregnant: 34,
    bloodType: "AB+",
    hbStatus: "normal",
    riskLevel: "medium",
    pregnancyOrder: "2nd",
    isNew: false,
    followUpNeeded: true,
  },
  {
    id: "p4",
    name: "Neha Rao",
    age: 27,
    weeksPregnant: 30,
    bloodType: "B+",
    hbStatus: "low",
    riskLevel: "medium",
    pregnancyOrder: "1st",
    isNew: true,
    followUpNeeded: true,
  },
];

export const ASHA_VILLAGE = "Kothapalli";
export const DEFAULT_PREGNANT_COUNT = 28;
export const DEFAULT_HIGH_RISK_COUNT = 5;
export const DEFAULT_NEW_COUNT = 3;

// --- Mother dashboard: profile details (matches doc/ASHA patient data) ---
export interface MotherProfileDetail {
  patientId: string;
  age: number;
  bloodType: string;
  phone: string;
  address: string;
  husbandName: string;
  scheduledVisit: string; // e.g. "26 Apr 2026 Friday"
  scheduledVisitTime: string; // e.g. "10:00 AM - 12:00 PM"
  lastVisit: string; // e.g. "12 Feb 2026"
  lastUpdated: string; // e.g. "12 Feb"
  dueDate: string; // e.g. "24 May 2026"
  sugar?: number; // mg/dL
  weight?: number; // kg
  weightStatus?: "Normal" | "Moderate Gain" | "Low Gain" | "High Gain";
}

export const motherProfileByPatientId: Record<string, MotherProfileDetail> = {
  p1: {
    patientId: "p1",
    age: 26,
    bloodType: "B+",
    phone: "9876543210",
    address: "Ramapuram Village, Telangana",
    husbandName: "Amit Sharma",
    scheduledVisit: "26 Apr 2026 Friday",
    scheduledVisitTime: "10:00 AM - 12:00 PM",
    lastVisit: "12 Feb 2026",
    lastUpdated: "12 Feb",
    dueDate: "24 May 2026",
    sugar: 98,
    weight: 62,
    weightStatus: "Moderate Gain",
  },
};

/** Demo: get mother's combined profile (patient + detail). Uses Priya (p1) so data matches doc/ASHA. */
export function getMotherProfile(): { patient: Patient; detail: MotherProfileDetail } | null {
  const patient = dummyPatients.find((p) => p.id === "p1") ?? dummyPatients[0];
  const detail = motherProfileByPatientId[patient.id];
  if (!detail) return null;
  return { patient, detail };
}

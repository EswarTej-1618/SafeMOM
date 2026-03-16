import { GoogleGenAI } from "@google/genai/web";
import type { MotherSignupProfile } from "@/data/motherProfiles";
import type { VitalsHistoryEntry } from "@/data/motherProfiles";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

function parseGeminiError(err: unknown): string {
  const msg = String(err instanceof Error ? err.message : err);
  try {
    const jsonStr = msg.includes("{") ? msg.slice(msg.indexOf("{")) : msg;
    const parsed = JSON.parse(jsonStr);
    const code = parsed?.error?.code ?? parsed?.status;
    const detail = String(parsed?.error?.message ?? parsed?.message ?? msg);
    if (code === 404 || detail.includes("NOT_FOUND") || detail.includes("not found")) {
      return "Model not available. Please try again or check your API configuration.";
    }
    if (code === 429 || detail.includes("quota") || detail.includes("RESOURCE_EXHAUSTED")) {
      const retryMatch = detail.match(/(\d+(?:\.\d+)?)\s*s/i);
      const secs = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
      if (secs) {
        return `API quota exceeded. Please wait ${secs} seconds and try again.`;
      }
      return "API quota exceeded. Please try again later or check your Gemini API plan at aistudio.google.com.";
    }
    return detail || "Something went wrong. Please try again.";
  } catch {
    if (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found")) {
      return "Model not available. Please try again or check your API configuration.";
    }
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      const retryMatch = msg.match(/(\d+(?:\.\d+)?)\s*s/i);
      const secs = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
      if (secs) {
        return `API quota exceeded. Please wait ${secs} seconds and try again.`;
      }
      return "API quota exceeded. Please try again later or check your Gemini API plan.";
    }
    return msg || "Failed to analyze. Please try again.";
  }
}

/** Yes/No symptom answers — more info gives more accurate risk assessment */
export interface VitalsSymptoms {
  tired: boolean;
  headacheFever: boolean;
  abdominalPain: boolean;
  swelling: boolean;
  blurredVisionDizziness: boolean;
}

export interface VitalsInput {
  heartRate: { value: number; unit: string; status: string; normalRange: string };
  stress: { value: number; unit: string; status: string; normalRange: string };
  spo2: { value: number; unit: string; status: string; normalRange: string };
  bloodPressure: { value: number; unit: string; status: string; normalRange: string };
  glucose: { value: number; unit: string; status: string; normalRange: string };
  temperature: { value: number; unit: string; status: string; normalRange: string };
  steps?: { value: number; unit: string; status: string; normalRange: string };
  /** Optional symptom answers; include for more accurate results */
  symptoms?: VitalsSymptoms;
}

const SYSTEM_PROMPT = `You are SafeMOM AI, a maternal health assistant. Your role is to:
1. Analyze vital signs (Heart Rate, Stress Level, SpO2, Blood Pressure, Glucose, Temperature) and optional activity levels (Steps)
2. When symptom answers (tired, headache/fever, abdominal pain, swelling, blurred vision/dizziness) are provided, use them to improve risk assessment — more "Yes" answers or concerning combinations can raise risk level
3. Classify overall risk as: **Risky**, **High**, **Moderate**, or **Normal**
4. Provide brief, actionable health suggestions for pregnant women
5. Always include this disclaimer at the end of your response: "⚠️ **Disclaimer:** This is AI-generated guidance only and does not replace professional medical advice. Always consult your healthcare provider for any health concerns."

Guidelines:
- Be supportive, calm, and reassuring
- Keep responses concise (2-4 short paragraphs)
- Focus on maternal health context; consider symptoms together with vitals for the most accurate result
- For Risky: emphasize consulting a doctor soon
- For Moderate: suggest monitoring and lifestyle tips
- For Normal: offer encouragement and general wellness tips
- Use the exact risk labels: Risky, High, Moderate, or Normal`;

function formatVitalsForPrompt(vitals: VitalsInput): string {
  let out = `
Current vitals:
- Heart Rate: ${vitals.heartRate.value} ${vitals.heartRate.unit} (Normal: ${vitals.heartRate.normalRange}) - Status: ${vitals.heartRate.status}
- Stress Level: ${vitals.stress.value}${vitals.stress.unit} (Normal: ${vitals.stress.normalRange}) - Status: ${vitals.stress.status}
- SpO2: ${vitals.spo2.value}${vitals.spo2.unit} (Normal: ${vitals.spo2.normalRange}) - Status: ${vitals.spo2.status}
- Blood Pressure: ${vitals.bloodPressure.value} ${vitals.bloodPressure.unit} (Normal: ${vitals.bloodPressure.normalRange}) - Status: ${vitals.bloodPressure.status}
- Glucose: ${vitals.glucose.value} ${vitals.glucose.unit} (Normal: ${vitals.glucose.normalRange}) - Status: ${vitals.glucose.status}
- Temperature: ${vitals.temperature.value} ${vitals.temperature.unit} (Normal: ${vitals.temperature.normalRange}) - Status: ${vitals.temperature.status}
`.trim();
  if (vitals.steps) {
    out += `\n- Steps: ${vitals.steps.value} ${vitals.steps.unit} (Target: ${vitals.steps.normalRange}) - Status: ${vitals.steps.status}`;
  }
  if (vitals.symptoms) {
    const s = vitals.symptoms;
    out += `

Symptoms (Y/N):
- Feeling tired: ${s.tired ? "Yes" : "No"}
- Headache or fever feeling: ${s.headacheFever ? "Yes" : "No"}
- Abdominal pain: ${s.abdominalPain ? "Yes" : "No"}
- Swelling (hands/feet): ${s.swelling ? "Yes" : "No"}
- Blurred vision or dizziness: ${s.blurredVisionDizziness ? "Yes" : "No"}`;
  }
  return out;
}

export function formatMotherProfileForPrompt(profile: MotherSignupProfile): string {
  const conditions = profile.chronicConditions?.length
    ? profile.chronicConditions.join(", ")
    : "None";
  const other = profile.otherCondition ? `; Other: ${profile.otherCondition}` : "";
  const meds = profile.onMedication
    ? `Yes: ${profile.medicationNames || "(names not provided)"}`
    : "No";
  let out = `
Mother profile (use this for personalized, clear output; take previous history into consideration):
- Name: ${profile.name}; Age: ${profile.age}; Blood group: ${profile.bloodGroup || "Not set"}
- Gestation: ${profile.gestationWeek} weeks; Pregnancy: ${profile.pregnancyNumber === 1 ? "First" : profile.pregnancyNumber === 2 ? "Second" : `${profile.pregnancyNumber}th`} time
- Chronic conditions: ${conditions}${other}
- On medication: ${meds}
`.trim();
  const v = profile.vitals;
  if (v && Object.keys(v).length > 0) {
    const parts: string[] = [];
    if (v.weightKg != null) parts.push(`Weight ${v.weightKg} kg`);
    if (v.bloodPressureSystolic != null || v.bloodPressureDiastolic != null)
      parts.push(`BP ${v.bloodPressureSystolic ?? "—"}/${v.bloodPressureDiastolic ?? "—"} mmHg`);
    if (v.hemoglobin != null) parts.push(`Hemoglobin ${v.hemoglobin} g/dL`);
    if (v.bloodSugarMgDl != null) parts.push(`Blood sugar ${v.bloodSugarMgDl} mg/dL`);
    if (v.heartRateBpm != null) parts.push(`Heart rate ${v.heartRateBpm} bpm`);
    if (v.spo2Percent != null) parts.push(`SpO₂ ${v.spo2Percent}%`);
    if (parts.length > 0) out += `\n- Profile vitals: ${parts.join("; ")}`;
  }
  return out;
}

export async function analyzeVitalsWithGemini(
  vitals: VitalsInput,
  userMessage?: string,
  motherProfile?: MotherSignupProfile | null
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env.local file."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let context = "";
  if (motherProfile) {
    context += formatMotherProfileForPrompt(motherProfile) + "\n\n";
  }
  context += formatVitalsForPrompt(vitals);
  const userPrompt = userMessage?.trim()
    ? `User also asked: "${userMessage}"\n\nAnalyze the vitals above and respond to their question, taking the mother's profile and history into consideration. Give a clear, personalized risk assessment and suggestions.`
    : "Analyze these vitals and provide a clear risk assessment and suggestions, taking the mother's profile into consideration when provided.";

  const fullPrompt = `${context}\n\n${userPrompt}`;

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Gemini. Please try again.");
      }
      return text;
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err);
      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found")
      ) {
        continue;
      }
      throw err;
    }
  }

  const friendlyMessage = parseGeminiError(lastError);
  throw new Error(friendlyMessage);
}

const CHAT_SYSTEM_PROMPT = `You are SafeMOM AI, a friendly maternal health assistant. Your role is to:
- Answer questions about pregnancy, maternal health, and wellness
- Be supportive, calm, and reassuring
- Provide helpful information while emphasizing this is guidance only
- Always recommend consulting healthcare providers for medical decisions
- Keep responses concise and easy to understand
- **CRITICAL**: If the user reports symptoms of a medical emergency (e.g. heavy bleeding, severe pain, decreased fetal movement, extremely high blood pressure), you MUST include the exact phrase "**HIGH RISK**" in your response to trigger our emergency alert system.`;

export async function chatWithGemini(
  userMessage: string,
  history?: Array<{ role: "user" | "model"; text: string }>
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env.local file."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let fullPrompt = userMessage;
  if (history && history.length > 0) {
    const historyText = history
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
      .join("\n\n");
    fullPrompt = `Previous conversation:\n${historyText}\n\nUser: ${userMessage}`;
  }

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction: CHAT_SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from Gemini. Please try again.");
      }
      return text;
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err);
      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found")
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(parseGeminiError(lastError));
}

const REPORT_SYSTEM_PROMPT = `You are SafeMOM AI. Generate a clear, readable maternal health report using the provided mother profile and any vitals history. You MUST strictly adhere to the following markdown format:

**Maternal Health Report for [Mother's Name]**

---

### 1. Mother's Primary Information
- **Name:** [Name]
- **Age:** [Age] years
- **Gestation:** [Gestation] weeks
- **Blood Group:** [Blood Group]
- **Pregnancy Number:** [Pregnancy Number text]

### 2. Chronic Conditions and Medications
- **Chronic Condition:** [List conditions or 'None']
- **Medication:** [List medications or 'None']

### 3. Vitals Summary and Risk Trends
- **Weight:** [If available]
- **Blood Pressure (BP):** [Summary and status]
- **Hemoglobin:** [Summary and status]
- **Blood Sugar:** [Summary and status]
- **Heart Rate:** [Summary and status]
- **Oxygen Saturation (SpO₂):** [Summary and status]

**Recent Chat & Vitals History:**
[List out all provided chat sessions or vitals history events here, including the date, a brief summary of the symptoms/vitals discussed, and the designated Risk Level (Normal, Low, Medium, High). For example:
- **[Date]:** [Summary] - **Risk Level: [Level]**]

[Sentence assessing current vitals overall]

### 4. Overall Assessment and Recommendations

**Overall Assessment:**
[Provide a comprehensive overall assessment that evaluates *all* recorded vitals history to give a complete picture. Focus on highlighting any 'risky' or 'high' risk events from the last week when providing care suggestions.]

**Actionable Recommendations:**
1. **[Short Title]:** [Detailed recommendation based on assessment]
2. [Generate 3-5 recommendations total in this numbered format]

---

⚠️ This report is AI-generated and does not replace professional medical advice. Always consult your healthcare provider.`;

export async function generateMotherReport(
  profile: MotherSignupProfile,
  vitalsHistory?: VitalsHistoryEntry[]
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env.local file."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const profileText = formatMotherProfileForPrompt(profile);
  const historyText =
    vitalsHistory && vitalsHistory.length > 0
      ? "\n\nVitals history (most recent first):\n" +
      vitalsHistory
        .slice(0, 50)
        .map(
          (e) =>
            `- ${e.timestamp}: ${e.vitalsSummary}${e.riskLevel ? ` | Risk: ${e.riskLevel}` : ""}`
        )
        .join("\n")
      : "\n\nNo vitals history recorded yet.";

  const fullPrompt = `${profileText}${historyText}\n\nGenerate a final maternal health report based on the above.`;

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction: REPORT_SYSTEM_PROMPT,
          temperature: 0.5,
          maxOutputTokens: 8192,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini.");
      return text;
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err);
      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found")
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(parseGeminiError(lastError));
}

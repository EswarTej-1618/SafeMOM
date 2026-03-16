/**
 * SafeMom API client for authentication endpoints.
 * Manages JWT token storage and provides typed API calls.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/auth";
const TOKEN_KEY = "safemom_token";

// ─── Token Management ────────────────────────────────────────────────────────
export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

import { type Appointment } from "@/data/patients";

// ─── API Types ───────────────────────────────────────────────────────────────
export interface ApiUser {
    _id: string;
    name: string;
    email: string;
    role: "mother" | "doctor" | "asha" | "partner";
    isEmailVerified: boolean;
    avatar?: string | null;
    age?: number;
    gestationWeek?: number;
    bloodGroup?: string;
    pregnancyNumber?: number;
    chronicConditions?: string[];
    otherCondition?: string;
    onMedication?: boolean;
    medicationNames?: string;
    vitals?: {
        weightKg?: number;
        bloodPressureSystolic?: number;
        bloodPressureDiastolic?: number;
        hemoglobin?: number;
        bloodSugarMgDl?: number;
        heartRateBpm?: number;
        spo2Percent?: number;
    };
    createdAt: string;
    pregnancyStartDate?: string | Date;
    appointments?: Appointment[];
}

export interface AuthResponse {
    ok: boolean;
    token?: string;
    user?: ApiUser;
    message?: string;
    error?: string;
    emailVerified?: boolean;
}

// ─── Generic Fetch Helper ────────────────────────────────────────────────────
async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
            ...((options.headers as Record<string, string>) || {}),
        },
    });
    const data = await res.json();
    if (!res.ok && !data.error) {
        data.error = `Request failed with status ${res.status}`;
    }
    return data;
}

// ─── Auth API Calls ──────────────────────────────────────────────────────────

export async function signupApi(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    age?: number;
    gestationWeek?: number;
    bloodGroup?: string;
    pregnancyNumber?: number;
    chronicConditions?: string[];
    otherCondition?: string;
    onMedication?: boolean;
    medicationNames?: string;
}): Promise<AuthResponse> {
    const result = await apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (result.ok && result.token) {
        setStoredToken(result.token);
    }
    return result;
}

export async function loginApi(
    email: string,
    password: string,
    role: string
): Promise<AuthResponse> {
    const result = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
    });
    if (result.ok && result.token) {
        setStoredToken(result.token);
    }
    return result;
}

export async function getCurrentUser(): Promise<AuthResponse> {
    const data = await apiFetch("/me");
    return data;
}

export async function updateProfile(updateData: Partial<ApiUser>): Promise<AuthResponse> {
    const data = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(updateData),
    });
    return data;
}

export async function getMeApi(): Promise<AuthResponse> {
    const token = getStoredToken();
    if (!token) return { ok: false, error: "No token" };
    return apiFetch("/me");
}

export async function forgotPasswordApi(
    email: string
): Promise<AuthResponse> {
    return apiFetch("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function resetPasswordApi(
    token: string,
    password: string
): Promise<AuthResponse> {
    return apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
    });
}

export async function verifyEmailApi(
    token: string
): Promise<AuthResponse> {
    const result = await apiFetch(`/verify-email/${token}`);
    // Store the token so the session is live immediately after verification
    if (result.ok && result.token) {
        setStoredToken(result.token);
    }
    return result;
}

export async function resendVerificationApi(): Promise<AuthResponse> {
    return apiFetch("/resend-verification", { method: "POST" });
}

export async function changePasswordApi(
    currentPassword: string,
    newPassword: string
): Promise<AuthResponse> {
    return apiFetch("/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export async function deleteAccountApi(password: string): Promise<AuthResponse> {
    return apiFetch("/account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
    });
}

// ─── Partner API Calls ───────────────────────────────────────────────────────
const PARTNER_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/partner";

async function partnerFetch(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${PARTNER_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
            ...((options.headers as Record<string, string>) || {}),
        },
    });
    const data = await res.json();
    if (!res.ok && !data.error) {
        data.error = `Request failed with status ${res.status}`;
    }
    return data;
}

export async function linkPartnerApi(partnerEmail: string) {
    return partnerFetch("/link", {
        method: "POST",
        body: JSON.stringify({ partnerEmail }),
    });
}

export async function removePartnerApi() {
    return partnerFetch("/remove", { method: "DELETE" });
}

export async function getPartnerStatusApi() {
    return partnerFetch("/status");
}

export async function getMotherDataApi() {
    return partnerFetch("/mother-data");
}

export async function getMotherChatHistoryApi() {
    return partnerFetch("/chat-history");
}

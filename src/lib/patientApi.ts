import { getStoredToken, type ApiUser } from "./api";

const API_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/patient";

function authHeaders(): Record<string, string> {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function linkPatient(clinicianId: string, email: string, name: string) {
    const res = await fetch(`${API_URL}/link`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ clinicianId, email, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to link patient");
    return data.patient;
}

export async function fetchLinkedPatients(clinicianId: string): Promise<ApiUser[]> {
    try {
        const res = await fetch(`${API_URL}/linked/${clinicianId}`, {
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to fetch linked patients");
        const data = await res.json();
        return data.patients || [];
    } catch (err) {
        console.error("[Patient API]", err);
        return [];
    }
}

export async function fetchPatientRiskHistory(patientId: string) {
    const CHAT_API_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/chat";
    try {
        const res = await fetch(`${CHAT_API_URL}/patient/${patientId}/risks`, {
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to fetch patient risk history");
        const data = await res.json();
        return data.history || [];
    } catch (err) {
        console.error("[Patient API]", err);
        return [];
    }
}

export async function fetchPatientFullChatHistory(patientId: string) {
    const CHAT_API_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/chat";
    try {
        const res = await fetch(`${CHAT_API_URL}/history/${patientId}`, {
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to fetch patient full chat history");
        const data = await res.json();
        return data.history || [];
    } catch (err) {
        console.error("[Patient API]", err);
        return [];
    }
}

export async function recordProfileView(patientId: string) {
    try {
        const res = await fetch(`${API_URL}/${patientId}/view`, {
            method: "POST",
            headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to record view");
        return true;
    } catch (err) {
        console.error("[Patient API] Record view failed:", err);
        return false;
    }
}

export type ProfileViewEntry = {
    _id: string;
    motherId: string;
    viewerId: string;
    viewerName: string;
    viewerAvatar?: string;
    viewerRole: "doctor" | "asha" | "partner";
    viewedAt: string;
};

export async function getProfileViews(): Promise<ProfileViewEntry[]> {
    try {
        const res = await fetch(`${API_URL}/profile-views`, {
            headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch views");
        return data.views || [];
    } catch (err) {
        console.error("[Patient API] Fetch views failed:", err);
        return [];
    }
}
export async function updatePregnancyStartDate(patientId: string, pregnancyStartDate: string) {
    const res = await fetch(`${API_URL}/${patientId}/pregnancy-start-date`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ pregnancyStartDate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update pregnancy start date");
    return data.patient;
}

export async function unlinkPatient(patientId: string) {
    const res = await fetch(`${API_URL}/unlink`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ patientId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to unlink patient");
    return data;
}

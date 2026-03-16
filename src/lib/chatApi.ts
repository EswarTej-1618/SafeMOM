import { getStoredToken } from "./api";

const API_URL = (import.meta.env.VITE_API_URL ?? "") + "/api/chat";

function authHeaders(): Record<string, string> {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchChatHistory(userId: string) {
    if (!userId) return [];
    try {
        const res = await fetch(`${API_URL}/history/${userId}`, {
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to fetch chat history");
        const data = await res.json();
        return data.history || [];
    } catch (err) {
        console.error("[Chat API]", err);
        return [];
    }
}

export async function saveChatSession(userId: string, sessionData: any) {
    if (!userId) return null;
    try {
        const res = await fetch(`${API_URL}/save/${userId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders(),
            },
            body: JSON.stringify(sessionData),
        });
        if (!res.ok) throw new Error("Failed to save chat session");
        const data = await res.json();
        return data.session;
    } catch (err) {
        console.error("[Chat API]", err);
        return null;
    }
}

export async function deleteChatSession(sessionId: string) {
    if (!sessionId) return false;
    try {
        const res = await fetch(`${API_URL}/session/${sessionId}`, {
            method: "DELETE",
            headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to delete chat session");
        const data = await res.json();
        return data.ok;
    } catch (err) {
        console.error("[Chat API]", err);
        return false;
    }
}

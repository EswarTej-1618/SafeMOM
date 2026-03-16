import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  loginApi,
  signupApi,
  getMeApi,
  removeStoredToken,
  getStoredToken,
  changePasswordApi,
  deleteAccountApi,
  type ApiUser,
} from "@/lib/api";
import { type Appointment } from "@/data/patients";

export type UserRole = "mother" | "doctor" | "asha" | "partner";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatar?: string | null;
  // Mother-specific
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
  pregnancyStartDate?: string | Date;
  appointments?: Appointment[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isDoctor: boolean;
  isAsha: boolean;
  isMother: boolean;
  isPartner: boolean;
  login: (
    email: string,
    password: string,
    role: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
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
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  reloadUser: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function apiUserToAuthUser(u: ApiUser): AuthUser {
  return {
    id: u._id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    isEmailVerified: u.isEmailVerified,
    avatar: u.avatar,
    age: u.age,
    gestationWeek: u.gestationWeek,
    bloodGroup: u.bloodGroup,
    pregnancyNumber: u.pregnancyNumber,
    chronicConditions: u.chronicConditions,
    otherCondition: u.otherCondition,
    onMedication: u.onMedication,
    medicationNames: u.medicationNames,
    vitals: u.vitals,
    pregnancyStartDate: u.pregnancyStartDate,
    appointments: u.appointments,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: check for stored token and restore session
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getMeApi()
      .then((res) => {
        if (res.ok && res.user) {
          setUser(apiUserToAuthUser(res.user));
        } else {
          removeStoredToken();
        }
      })
      .catch(() => {
        removeStoredToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await loginApi(email, password, role);
        if (res.ok && res.user) {
          setUser(apiUserToAuthUser(res.user));
          return { success: true };
        }
        return { success: false, error: res.error || "Login failed" };
      } catch {
        return { success: false, error: "Network error. Is the server running?" };
      }
    },
    []
  );

  const signup = useCallback(
    async (data: {
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
    }): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        const res = await signupApi(data);
        if (res.ok && res.user) {
          setUser(apiUserToAuthUser(res.user));
          return { success: true, message: res.message };
        }
        return { success: false, error: res.error || "Signup failed" };
      } catch {
        return { success: false, error: "Network error. Is the server running?" };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    removeStoredToken();
  }, []);

  const reloadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await getMeApi();
      if (res.ok && res.user) {
        setUser(apiUserToAuthUser(res.user));
      } else {
        removeStoredToken();
      }
    } catch (err) {
      console.error("Failed to reload user", err);
    }
  }, []);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await changePasswordApi(currentPassword, newPassword);
        if (res.ok) return { success: true };
        return { success: false, error: res.error || "Failed to change password" };
      } catch {
        return { success: false, error: "Network error. Is the server running?" };
      }
    },
    []
  );

  const deleteAccount = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await deleteAccountApi(password);
        if (res.ok) {
          setUser(null);
          removeStoredToken();
          return { success: true };
        }
        return { success: false, error: res.error || "Failed to delete account" };
      } catch {
        return { success: false, error: "Network error. Is the server running?" };
      }
    },
    []
  );

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    isDoctor: user?.role === "doctor",
    isAsha: user?.role === "asha",
    isMother: user?.role === "mother",
    isPartner: user?.role === "partner",
    login,
    signup,
    logout,
    reloadUser,
    changePassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

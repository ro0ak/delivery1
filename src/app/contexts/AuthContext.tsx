import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

export type UserRole =
  | "super_admin"
  | "branch_manager"
  | "branch_employee"
  | "driver"
  | "accountant"
  | "operations";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  branchId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextValue {
  session: Session | null;
  authUser: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(value: unknown): UserRole {
  const allowedRoles: UserRole[] = [
    "super_admin",
    "branch_manager",
    "branch_employee",
    "driver",
    "accountant",
    "operations",
  ];

  if (
    typeof value === "string" &&
    allowedRoles.includes(value as UserRole)
  ) {
    return value as UserRole;
  }

  return "branch_employee";
}

async function getUserProfile(
  user: SupabaseUser,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, branch_id, avatar_url, is_active",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
  }

  return {
    id: user.id,
    email: data?.email || user.email || "",
    fullName:
      data?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "مستخدم",
    phone: data?.phone || null,
    role: normalizeRole(data?.role || user.user_metadata?.role),
    branchId: data?.branch_id || null,
    avatarUrl: data?.avatar_url || null,
    isActive: data?.is_active ?? true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setSession(currentSession);

      if (currentSession?.user) {
        const loadedProfile = await getUserProfile(currentSession.user);

        if (!loadedProfile.isActive) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          return;
        }

        setProfile(loadedProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      window.setTimeout(() => {
        void getUserProfile(nextSession.user).then((loadedProfile) => {
          if (!loadedProfile.isActive) {
            void supabase.auth.signOut();
            setProfile(null);
            return;
          }

          setProfile(loadedProfile);
          setLoading(false);
        });
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return {
          success: false,
          message: "أدخل البريد الإلكتروني وكلمة المرور.",
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          message: "بيانات الدخول غير صحيحة أو أن الحساب غير مفعل.",
        };
      }

      if (!data.user) {
        return {
          success: false,
          message: "تعذر تسجيل الدخول. حاول مرة أخرى.",
        };
      }

      const loadedProfile = await getUserProfile(data.user);

      if (!loadedProfile.isActive) {
        await supabase.auth.signOut();

        return {
          success: false,
          message: "هذا الحساب متوقف. تواصل مع الإدارة.",
        };
      }

      setProfile(loadedProfile);

      return {
        success: true,
      };
    },
    [],
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
    }

    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const loadedProfile = await getUserProfile(session.user);
    setProfile(loadedProfile);
  }, [session]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!profile) {
        return false;
      }

      return roles.includes(profile.role);
    },
    [profile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user || null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user && profile),
      login,
      logout,
      refreshProfile,
      hasRole,
    }),
    [
      session,
      profile,
      loading,
      login,
      logout,
      refreshProfile,
      hasRole,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

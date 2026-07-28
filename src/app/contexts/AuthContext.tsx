import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
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
  role?: UserRole;
}

interface AuthContextValue {
  session: Session | null;
  authUser: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

const allowedRoles: UserRole[] = [
  "super_admin",
  "branch_manager",
  "branch_employee",
  "driver",
  "accountant",
  "operations",
];

function normalizeRole(value: unknown): UserRole {
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
      `
        id,
        email,
        full_name,
        phone,
        role,
        branch_id,
        avatar_url,
        is_active
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load user profile:",
      error.message,
    );
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
    role: normalizeRole(
      data?.role || user.user_metadata?.role,
    ),
    branchId: data?.branch_id || null,
    avatarUrl: data?.avatar_url || null,
    isActive: data?.is_active ?? true,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        return;
      }

      const loadedProfile = await getUserProfile(
        nextSession.user,
      );

      if (!loadedProfile.isActive) {
        await supabase.auth.signOut();

        setSession(null);
        setProfile(null);

        return;
      }

      setProfile(loadedProfile);
    },
    [],
  );

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

      await applySession(currentSession);
    } catch (error) {
      console.error(
        "Failed to restore session:",
        error,
      );

      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) {
          return;
        }

        window.setTimeout(() => {
          if (!mounted) {
            return;
          }

          void applySession(nextSession).finally(() => {
            if (mounted) {
              setLoading(false);
            }
          });
        }, 0);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, loadSession]);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<LoginResult> => {
      const normalizedEmail = email
        .trim()
        .toLowerCase();

      if (!normalizedEmail || !password) {
        return {
          success: false,
          message:
            "أدخل البريد الإلكتروني وكلمة المرور.",
        };
      }

      try {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (error) {
          return {
            success: false,
            message:
              "بيانات الدخول غير صحيحة أو أن الحساب غير مفعل.",
          };
        }

        if (!data.user || !data.session) {
          return {
            success: false,
            message:
              "تعذر تسجيل الدخول. حاول مرة أخرى.",
          };
        }

        const loadedProfile = await getUserProfile(
          data.user,
        );

        if (!loadedProfile.isActive) {
          await supabase.auth.signOut();

          setSession(null);
          setProfile(null);

          return {
            success: false,
            message:
              "هذا الحساب متوقف. تواصل مع الإدارة.",
          };
        }

        setSession(data.session);
        setProfile(loadedProfile);

        return {
          success: true,
          role: loadedProfile.role,
        };
      } catch (error) {
        console.error("Login error:", error);

        return {
          success: false,
          message:
            "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.",
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error.message,
        );
      }
    } finally {
      setSession(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    try {
      const loadedProfile = await getUserProfile(
        session.user,
      );

      if (!loadedProfile.isActive) {
        await logout();
        return;
      }

      setProfile(loadedProfile);
    } catch (error) {
      console.error(
        "Failed to refresh profile:",
        error,
      );
    }
  }, [logout, session]);

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
      isAuthenticated: Boolean(
        session?.user && profile,
      ),
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
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}

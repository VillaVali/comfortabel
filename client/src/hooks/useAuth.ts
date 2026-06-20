import { useEffect, useState, useCallback } from "react";

export type AuthRole = "user" | "comfortabel_employee" | "manager" | "admin";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: AuthRole;
  isActive: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setState({ user: data, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || "Inloggen mislukt" };
        }
        setState({ user: data, loading: false });
        return {};
      } catch {
        return { error: "Verbindingsfout. Probeer opnieuw." };
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string, inviteToken?: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email, password, inviteToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || "Registratie mislukt" };
        }
        setState({ user: data, loading: false });
        return {};
      } catch {
        return { error: "Verbindingsfout. Probeer opnieuw." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setState({ user: null, loading: false });
    window.location.href = "/";
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === "admin",
    // Manager = admin | manager (may manage users + write A/B fields).
    isManager: state.user?.role === "admin" || state.user?.role === "manager",
    // Staff = admin | manager | comfortabel_employee (access the back office).
    isStaff:
      state.user?.role === "admin" ||
      state.user?.role === "manager" ||
      state.user?.role === "comfortabel_employee",
    login,
    register,
    logout,
    refetch: fetchMe,
  };
}

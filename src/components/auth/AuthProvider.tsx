"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMyUsername, getProfile } from "@/lib/data";
import { auth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { Profile } from "@/lib/types";

export type AuthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "error"; message: string }
  | { status: "needsProfile"; user: User }
  | { status: "ready"; user: User; username: string; profile: Profile };

interface AuthContextValue {
  state: AuthState;
  /** Re-reads the account after onboarding or a profile save. */
  refresh: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAccount(user: User): Promise<AuthState> {
  const username = await getMyUsername(user.uid);
  if (!username) {
    return { status: "needsProfile", user };
  }
  const profile = await getProfile(username);
  return profile ? { status: "ready", user, username, profile } : { status: "needsProfile", user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(isFirebaseConfigured ? { status: "loading" } : { status: "unconfigured" });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }
    let active = true;
    const unsubscribe = onAuthStateChanged(auth(), async (user) => {
      if (!user) {
        setState({ status: "signedOut" });
        return;
      }
      try {
        const next = await loadAccount(user);
        if (active) {
          setState(next);
        }
      } catch (error) {
        if (active) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Couldn't load your account." });
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const user = auth().currentUser;
    if (user) {
      setState(await loadAccount(user));
    }
  }, []);

  const setProfile = useCallback((profile: Profile) => {
    setState((s) => (s.status === "ready" ? { ...s, profile } : s));
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth());
  }, []);

  const value = useMemo(() => ({ state, refresh, setProfile, logout }), [state, refresh, setProfile, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

/** Only same-site paths are honoured, so ?next= can't bounce people to another site. */
export function safeNext(raw: string | null, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw;
}

import { create } from "zustand";

export type SuperAdminUser = {
  id: string;
  email: string;
  name: string;
  superAdmin: true;
};

const SA_USER_KEY = "sa_user";
const SA_TOKEN_KEY = "sa_token";

export function getStoredSaToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SA_TOKEN_KEY);
}

function loadAdmin(): SuperAdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SA_USER_KEY);
    return raw ? (JSON.parse(raw) as SuperAdminUser) : null;
  } catch {
    return null;
  }
}

type SuperAdminAuthState = {
  admin: SuperAdminUser | null;
  hydrated: boolean;
  setSession: (admin: SuperAdminUser, token: string) => void;
  clear: () => void;
  hydrate: () => void;
};

export const useSuperAdminStore = create<SuperAdminAuthState>((set) => ({
  admin: null,
  hydrated: false,
  setSession: (admin, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SA_USER_KEY, JSON.stringify(admin));
      localStorage.setItem(SA_TOKEN_KEY, token);
    }
    set({ admin });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SA_USER_KEY);
      localStorage.removeItem(SA_TOKEN_KEY);
    }
    set({ admin: null });
  },
  hydrate: () => {
    const admin = loadAdmin();
    const token = getStoredSaToken();
    if (admin && !token) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SA_USER_KEY);
      }
      set({ admin: null, hydrated: true });
      return;
    }
    set({ admin, hydrated: true });
  },
}));

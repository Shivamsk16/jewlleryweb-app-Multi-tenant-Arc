import { create } from "zustand";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  tenantId: string;
  tenantSlug: string;
  memberRole: string;
};

const USER_KEY = "user";
const TOKEN_KEY = "token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setSession: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  hydrate: () => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setSession: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);
    }
    set({ user });
  },
  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    }
    set({ user });
  },
  hydrate: () => {
    const user = loadUser();
    const token = getStoredToken();
    if (user && !token) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(USER_KEY);
      }
      set({ user: null, hydrated: true });
      return;
    }
    set({ user, hydrated: true });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    set({ user: null });
  },
}));

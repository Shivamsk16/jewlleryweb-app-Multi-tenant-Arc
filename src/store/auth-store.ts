import { create } from "zustand";

type MeResponse = {
  user: User | null;
  token: string | null;
  isImpersonating: boolean;
  impersonatedBy: string | null;
  tenantName: string | null;
  expiresAt: string | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  tenantId: string;
  tenantSlug: string;
  memberRole: string;
};

export type ImpersonationState = {
  isImpersonating: boolean;
  impersonatedBy: string | null;
  tenantName: string | null;
  expiresAt: string | null;
};

const USER_KEY = "user";
const TOKEN_KEY = "token";
const IMPERSONATION_KEY = "impersonation";

const defaultImpersonation: ImpersonationState = {
  isImpersonating: false,
  impersonatedBy: null,
  tenantName: null,
  expiresAt: null,
};

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

function loadImpersonation(): ImpersonationState {
  if (typeof window === "undefined") return defaultImpersonation;
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return defaultImpersonation;
    return { ...defaultImpersonation, ...(JSON.parse(raw) as ImpersonationState) };
  } catch {
    return defaultImpersonation;
  }
}

function persistSession(user: User, token: string, impersonation: ImpersonationState) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
  if (impersonation.isImpersonating) {
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonation));
  } else {
    localStorage.removeItem(IMPERSONATION_KEY);
  }
}

function clearPersistedSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem("impersonation_token");
}

type AuthState = {
  user: User | null;
  impersonation: ImpersonationState;
  hydrated: boolean;
  setSession: (user: User, token: string, impersonation?: Partial<ImpersonationState>) => void;
  setUser: (user: User | null) => void;
  applyMeResponse: (data: MeResponse) => void;
  hydrate: () => Promise<void>;
  clear: () => void;
  clearImpersonation: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  impersonation: defaultImpersonation,
  hydrated: false,

  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    }
    set({ user });
  },

  setSession: (user, token, impersonation) => {
    const imp: ImpersonationState = impersonation?.isImpersonating
      ? {
          isImpersonating: true,
          impersonatedBy: impersonation.impersonatedBy ?? null,
          tenantName: impersonation.tenantName ?? null,
          expiresAt: impersonation.expiresAt ?? null,
        }
      : defaultImpersonation;

    if (typeof window !== "undefined") {
      persistSession(user, token, imp);
    }
    set({ user, impersonation: imp });
  },

  applyMeResponse: (data) => {
    if (!data.user || !data.token) {
      set({ user: null, impersonation: defaultImpersonation, hydrated: true });
      return;
    }

    const imp: ImpersonationState = data.isImpersonating
      ? {
          isImpersonating: true,
          impersonatedBy: data.impersonatedBy,
          tenantName: data.tenantName,
          expiresAt: data.expiresAt,
        }
      : defaultImpersonation;

    if (typeof window !== "undefined") {
      persistSession(data.user, data.token, imp);
    }
    set({ user: data.user, impersonation: imp, hydrated: true });
  },

  hydrate: async () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }

    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as MeResponse;
        if (data.user && data.token) {
          const imp: ImpersonationState = data.isImpersonating
            ? {
                isImpersonating: true,
                impersonatedBy: data.impersonatedBy,
                tenantName: data.tenantName,
                expiresAt: data.expiresAt,
              }
            : defaultImpersonation;
          persistSession(data.user, data.token, imp);
          set({ user: data.user, impersonation: imp, hydrated: true });
          return;
        }
      }
    } catch {
      /* fall through to local storage */
    }

    const user = loadUser();
    const token = getStoredToken();
    const impersonation = loadImpersonation();

    if (user && !token) {
      clearPersistedSession();
      set({ user: null, impersonation: defaultImpersonation, hydrated: true });
      return;
    }

    set({ user, impersonation: user ? impersonation : defaultImpersonation, hydrated: true });
  },

  clear: () => {
    if (typeof window !== "undefined") clearPersistedSession();
    set({ user: null, impersonation: defaultImpersonation });
  },

  clearImpersonation: () => {
    if (typeof window !== "undefined") clearPersistedSession();
    set({ user: null, impersonation: defaultImpersonation });
  },
}));

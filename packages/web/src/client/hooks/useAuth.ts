import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string; homeId: string } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => {
  const stored = localStorage.getItem("pp_token");
  const storedUser = localStorage.getItem("pp_user");

  return {
    token: stored,
    user: storedUser ? JSON.parse(storedUser) : null,
    setAuth: (token, user) => {
      localStorage.setItem("pp_token", token);
      localStorage.setItem("pp_user", JSON.stringify(user));
      set({ token, user });
    },
    logout: () => {
      localStorage.removeItem("pp_token");
      localStorage.removeItem("pp_user");
      set({ token: null, user: null });
    },
  };
});

// Convenience hook that works like the old API
export const useAuth = () => useAuthStore((state) => state);

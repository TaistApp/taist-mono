import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import api from "./api";

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token")
  );
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify the token is still valid
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get("/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        setToken(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post("/login", { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem("admin_token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem("admin_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

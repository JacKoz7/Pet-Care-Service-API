"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { getIdToken, signOut } from "firebase/auth";

interface User {
  email: string | null;
  uid: string | null;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, loading] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const fetchTokenAndRoles = useCallback(
    async (forceRefresh = false) => {
      if (!firebaseUser) {
        setUser(null);
        setToken(null);
        return;
      }

      try {
        const idToken = await getIdToken(firebaseUser, forceRefresh);
        setToken(idToken);

        const response = await fetch("/api/user/me", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to fetch user data");
        }

        const roles = [];
        if (data.user.isAdmin) roles.push("admin");
        if (data.user.isServiceProvider) roles.push("service_provider");
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          roles,
        });
      } catch (error: unknown) {
        console.error("Error fetching token or roles:", error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        alert(`Authentication error: ${errorMessage}. Signing you out.`);
        await signOut(auth);
        setUser(null);
        setToken(null);
      }
    },
    [firebaseUser]
  );

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      await fetchTokenAndRoles(true);
    }
  }, [firebaseUser, fetchTokenAndRoles]);

  useEffect(() => {
    if (firebaseUser) {
      if (!firebaseUser.emailVerified) {
        setUser(null);
        setToken(null);
        return;
      }

      fetchTokenAndRoles();

      // Set up token refresh interval
      const interval = setInterval(() => {
        fetchTokenAndRoles();
      }, 10 * 60 * 1000); // Refresh every 10 minutes

      return () => clearInterval(interval);
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem("userEmail");
    }
  }, [firebaseUser, fetchTokenAndRoles]);

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

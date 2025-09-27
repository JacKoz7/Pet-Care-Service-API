"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getIdToken } from "firebase/auth";

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

  const fetchTokenAndRoles = async () => {
    if (!firebaseUser) return;

    try {
      const idToken = await getIdToken(firebaseUser);
      setToken(idToken);

      const response = await fetch("/api/user/me", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        const roles = [];
        if (data.user.isAdmin) roles.push("admin");
        if (data.user.isServiceProvider) roles.push("service_provider");
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          roles,
        });
      } else {
        throw new Error(data.error || "Failed to fetch user roles");
      }
    } catch (error) {
      console.error("Error fetching token or roles:", error);
      setUser(null);
      setToken(null);
      alert(`Authentication error: ${error.message}. Please sign in again.`);
      // Optionally sign out here: await signOut(auth);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      if (!firebaseUser.emailVerified) {
        setUser(null);
        setToken(null);
        return;
      }
      fetchTokenAndRoles();
      const interval = setInterval(fetchTokenAndRoles, 10 * 60 * 1000); // Refresh every 10 minutes
      return () => clearInterval(interval);
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem("userEmail");
    }
  }, [firebaseUser]);

  const refreshUser = async () => {
    await fetchTokenAndRoles();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
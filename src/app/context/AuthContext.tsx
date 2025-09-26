// src/app/context/AuthContext.tsx
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, loading] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser) {
      if (!firebaseUser.emailVerified) {
        setUser(null);
        setToken(null);
        return;
      }

      // Fetch the ID token and decode roles
      const fetchTokenAndRoles = async () => {
        try {
          const idToken = await getIdToken(firebaseUser);
          setToken(idToken);

          // Fetch user data from /api/user/me to get roles
          const response = await fetch("/api/user/me", {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            const roles = [];
            if (data.user.isAdmin) roles.push("admin");
            if (data.user.isServiceProvider) roles.push("service_provider"); // Assuming isServiceProvider exists in schema
            setUser({
              email: firebaseUser.email,
              uid: firebaseUser.uid,
              roles,
            });
          } else {
            console.error("Failed to fetch user roles:", data.error);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching token or roles:", error);
          setUser(null);
        }
      };

      fetchTokenAndRoles();
      // Set up token refresh
      const interval = setInterval(() => {
        fetchTokenAndRoles();
      }, 10 * 60 * 1000); // Refresh every 10 minutes

      return () => clearInterval(interval);
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem("userEmail");
    }
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
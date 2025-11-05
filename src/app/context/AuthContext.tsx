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
import VerificationModal from "../components/VerificationModal";

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
  verificationError: string | null;
  setVerificationError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  refreshUser: async () => {},
  verificationError: null,
  setVerificationError: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, loading] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const fetchTokenAndRoles = useCallback(async () => {
    if (!firebaseUser) {
      setUser(null);
      setToken(null);
      return;
    }

    if (!firebaseUser.emailVerified) {
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const idToken = await getIdToken(firebaseUser);
      setToken(idToken);

      const response = await fetch("/api/user/me", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn("Email not verified - blocking access");
          const errorData = await response.json();
          setVerificationError(
            errorData.error || "Email not verified. Please verify your email."
          );
          await auth.signOut();
          return;
        }
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
      if (
        !(error instanceof Error) ||
        !error.message.includes("Email not verified")
      ) {
        alert(
          `Authentication error: ${
            error instanceof Error ? error.message : "Unknown error"
          }. Please sign in again.`
        );
      }
      setUser(null);
      setToken(null);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) {
      setUser(null);
      setToken(null);
      localStorage.removeItem("userEmail");
      return;
    }

    fetchTokenAndRoles();
    const interval = setInterval(fetchTokenAndRoles, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [firebaseUser, fetchTokenAndRoles]);

  const refreshUser = useCallback(async () => {
    await fetchTokenAndRoles();
  }, [fetchTokenAndRoles]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        refreshUser,
        verificationError,
        setVerificationError,
      }}
    >
      {children}
      {verificationError && (
        <VerificationModal
          error={verificationError}
          onDismiss={() => {
            signOut(auth).catch(console.error);
            setVerificationError(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

"use client";

import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { User } from "firebase/auth";
import EmailVerificationPopup from "../components/EmailVerificationPopUp";

export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth(); // Get auth state
  const [signInUserWithEmailAndPassword, , signInLoading, error] =
    useSignInWithEmailAndPassword(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customError, setCustomError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);

  // Redirect if user is logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/"); // Redirect to main page
    }
  }, [user, loading, router]);

  const onSubmit = async () => {
    setCustomError("");
    setIsVerifying(true);

    try {
      const result = await signInUserWithEmailAndPassword(email, password);

      if (result?.user) {
        if (!result.user.emailVerified) {
          setUnverifiedUser(result.user);
          setShowVerificationPopup(true);
          await auth.signOut();
          setIsVerifying(false);
          setCustomError("Please verify your email before signing in."); // NEW: Clearer message
          return;
        }

        // If emailVerified in Firebase, update DB
        const verifyResponse = await fetch(
          `/api/user/verify-email/${result.user.uid}`,
          {
            method: "PATCH",
          }
        );

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          if (errorData.error === "Email not verified") {
            setUnverifiedUser(result.user);
            setShowVerificationPopup(true);
            await auth.signOut();
            setIsVerifying(false);
            setCustomError(
              "Email verification not synced. Please verify again."
            ); // NEW: Clearer
            return;
          }
          console.error("Failed to update verification status in database");
          setCustomError("Database sync error. Please try again.");
        }

        router.push("/");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setCustomError(
        "An error occurred during sign in. Check credentials or verify email."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationSuccess = async () => {
    if (unverifiedUser) {
      try {
        await unverifiedUser.reload();

        const verifyResponse = await fetch(
          `/api/user/verify-email/${unverifiedUser.uid}`,
          {
            method: "PATCH",
          }
        );

        if (verifyResponse.ok) {
          setShowVerificationPopup(false);
          // Re-sign in after verification
          await signInUserWithEmailAndPassword(email, password);
          router.push("/");
        } else {
          const data = await verifyResponse.json();
          setCustomError(data.error || "Verification failed");
        }
      } catch (error) {
        console.error("Verification completion error:", error);
        setCustomError("Failed to complete verification. Please try again.");
      }
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render sign-in page if not logged in
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20">
      <div className="max-w-md mx-auto w-full">
        <button
          onClick={() => router.push("/")}
          className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back to Home
        </button>
        <h1 className="text-3xl font-bold mb-6 text-center">Sign In</h1>
        <input
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          placeholder="Email"
          className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
          disabled={signInLoading || isVerifying}
        />
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          placeholder="Password"
          className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
          disabled={signInLoading || isVerifying}
        />

        {(error || customError) && (
          <div className="text-red-500 mb-4 text-center">
            <p>{customError || error?.message}</p>
          </div>
        )}

        <button
          className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSubmit}
          disabled={signInLoading || isVerifying}
        >
          {signInLoading || isVerifying ? "Signing in..." : "SIGN IN"}
        </button>
      </div>

      {showVerificationPopup && unverifiedUser && (
        <EmailVerificationPopup
          user={unverifiedUser}
          onVerified={handleVerificationSuccess}
        />
      )}
    </div>
  );
}

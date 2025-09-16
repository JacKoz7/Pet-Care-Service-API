// src/app/sign-in/page.tsx
"use client";

import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { sendEmailVerification } from "firebase/auth";
import { IconRefresh, IconArrowLeft } from "@tabler/icons-react";

export default function Page() {
  const router = useRouter();
  const [signInUserWithEmailAndPassword, user, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customError, setCustomError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  const onSubmit = async () => {
    setCustomError("");
    setIsVerifying(true);

    try {
      const result = await signInUserWithEmailAndPassword(email, password);

      if (result?.user) {
        if (!result.user.emailVerified) {
          setCustomError(
            "Please verify your email before signing in. Check your inbox!"
          );
          setUnverifiedUser(result.user);
          await auth.signOut();
          setIsVerifying(false);
          return;
        }

        try {
          const response = await fetch("/api/users/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firebaseUid: result.user.uid }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (errorData.error === "Email not verified") {
              setCustomError(
                "Please verify your email before signing in. Check your inbox!"
              );
              setUnverifiedUser(result.user);
              await auth.signOut();
              setIsVerifying(false);
              return;
            }
            console.error("Failed to update verification status in database");
          }
        } catch (err) {
          console.error("Error updating verification status:", err);
        }

        router.push("/");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setCustomError("An error occurred during sign in");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;

    try {
      setResendStatus("sending");
      await sendEmailVerification(unverifiedUser);
      setResendStatus("sent");
      setTimeout(() => setResendStatus("idle"), 3000);
    } catch (err) {
      console.error("Error sending verification email:", err);
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 3000);
    }
  };

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
          disabled={loading || isVerifying}
        />
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          placeholder="Password"
          className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-full"
          disabled={loading || isVerifying}
        />

        {(error || customError) && (
          <div className="text-red-500 mb-4 text-center">
            <p>{customError || error?.message}</p>
            {customError &&
              customError.includes("verify your email") &&
              unverifiedUser && (
                <button
                  className="mt-2 flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 disabled:opacity-50 mx-auto"
                  onClick={handleResendVerification}
                  disabled={resendStatus === "sending"}
                >
                  <IconRefresh size={16} />
                  {resendStatus === "sending"
                    ? "Sending..."
                    : resendStatus === "sent"
                    ? "Email sent!"
                    : resendStatus === "error"
                    ? "Error, try again"
                    : "Resend verification email"}
                </button>
              )}
          </div>
        )}

        <button
          className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSubmit}
          disabled={loading || isVerifying}
        >
          {loading || isVerifying ? "Signing in..." : "SIGN IN"}
        </button>
      </div>
    </div>
  );
}

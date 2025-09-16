"use client";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";

export default function Page() {
  const router = useRouter();
  const [signInUserWithEmailAndPassword, user, loading, error] =
    useSignInWithEmailAndPassword(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customError, setCustomError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const onSubmit = async () => {
    setCustomError("");
    setIsVerifying(true);

    try {
      const result = await signInUserWithEmailAndPassword(email, password);

      if (result?.user) {
        // Sprawdź czy email jest zweryfikowany
        if (!result.user.emailVerified) {
          setCustomError(
            "Please verify your email before signing in. Check your inbox!"
          );
          await auth.signOut(); // Wyloguj użytkownika
          setIsVerifying(false);
          return;
        }

        // Zaktualizuj status w bazie danych
        try {
          const response = await fetch("/api/users/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firebaseUid: result.user.uid }),
          });

          if (!response.ok) {
            console.error("Failed to update verification status in database");
            // Nie blokuj logowania z tego powodu
          }
        } catch (err) {
          console.error("Error updating verification status:", err);
          // Nie blokuj logowania z tego powodu
        }

        // Przekieruj do głównej strony
        router.push("/");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setCustomError("An error occurred during sign in");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Sign in</h1>
      <input
        type="email"
        onChange={(e) => setEmail(e.target.value)}
        value={email}
        placeholder="Email"
        className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-80"
        disabled={loading || isVerifying}
      />
      <input
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        value={password}
        placeholder="Password"
        className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-80"
        disabled={loading || isVerifying}
      />

      {/* Wyświetl błędy */}
      {(error || customError) && (
        <p className="text-red-500 mb-4 text-center max-w-80">
          {customError || error?.message}
        </p>
      )}

      <button
        className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onSubmit}
        disabled={loading || isVerifying}
      >
        {loading || isVerifying ? "Signing in..." : "SIGN IN"}
      </button>

      {/* Opcjonalnie: link do ponownego wysłania emaila weryfikacyjnego */}
      {customError && customError.includes("verify your email") && (
        <button
          className="mt-4 text-blue-500 hover:text-blue-700 underline"
          onClick={async () => {
            if (auth.currentUser) {
              try {
                const { sendEmailVerification } = await import("firebase/auth");
                await sendEmailVerification(auth.currentUser);
                alert("Verification email sent! Check your inbox.");
              } catch (err) {
                console.error("Error sending verification email:", err);
              }
            }
          }}
        >
          Resend verification email
        </button>
      )}
    </div>
  );
}

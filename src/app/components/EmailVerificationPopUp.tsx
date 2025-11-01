"use client";
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { IconMail, IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import { sendEmailVerification } from "firebase/auth";

interface EmailVerificationPopupProps {
  user: User;
  onVerified: () => void;
}

export default function EmailVerificationPopup({
  user,
  onVerified,
}: EmailVerificationPopupProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const checkEmailVerification = async () => {
    setIsChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        onVerified();
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return;

    try {
      setResendStatus("sending");
      setErrorMessage(null);
      await sendEmailVerification(user);
      setResendStatus("sent");

      // Start 60s cooldown
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (error: unknown) {
      console.error("Error resending verification email:", error);
      setResendStatus("error");

      const errorCode = (error as { code?: string }).code;
      if (errorCode === "auth/too-many-requests") {
        setErrorMessage(
          "Too many requests. Please wait a few minutes before trying again."
        );
      } else {
        setErrorMessage("Something went wrong. Please try again later.");
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await user.reload();
        if (user.emailVerified) {
          onVerified();
        }
      } catch (err) {
        console.error("Error in interval check:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, onVerified]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 relative">
        <div className="text-center">
          <IconMail size={64} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We have sent a verification email to{" "}
            <span className="font-semibold">{user.email}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Please check your email and click the verification link to continue.
            (might be in spam)
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={checkEmailVerification}
              disabled={isChecking}
              className="bg-blue-500 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-600 disabled:opacity-50"
            >
              {isChecking ? "Checking..." : "I've verified my email"}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resendStatus === "sending" || cooldown > 0}
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <IconRefresh size={16} />
              {resendStatus === "sending"
                ? "Sending..."
                : resendStatus === "sent"
                ? "Email sent!"
                : resendStatus === "error"
                ? "Error"
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend verification email"}
            </button>

            {errorMessage && (
              <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm animate-fadeIn">
                <IconAlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

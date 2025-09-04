"use client";
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { IconMail, IconX } from "@tabler/icons-react";

interface EmailVerificationPopupProps {
  user: User;
  onClose: () => void;
  onVerified: () => void;
}

export default function EmailVerificationPopup({ 
  user, 
  onClose, 
  onVerified 
}: EmailVerificationPopupProps) {
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailVerification = async () => {
    setIsChecking(true);
    await user.reload();
    if (user.emailVerified) {
      onVerified();
    }
    setIsChecking(false);
  };

  useEffect(() => {
    // Check verification status every 3 seconds
    const interval = setInterval(async () => {
      await user.reload();
      if (user.emailVerified) {
        onVerified();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, onVerified]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <IconX size={24} />
        </button>
        
        <div className="text-center">
          <IconMail size={64} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent a verification email to {" "}
            <span className="font-semibold">{user.email}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Please check your email and click the verification link to continue. (might be in spam)
          </p>
          
          <button
            onClick={checkEmailVerification}
            disabled={isChecking}
            className="bg-blue-500 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-600 disabled:opacity-50"
          >
            {isChecking ? "Checking..." : "I've verified my email"}
          </button>
        </div>
      </div>
    </div>
  );
}
// src/app/components/VerificationModal.tsx 

"use client";

import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { IconAlertCircle, IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface VerificationModalProps {
  error: string;
  onDismiss: () => void;
}

export default function VerificationModal({ error, onDismiss }: VerificationModalProps) {
  const router = useRouter();

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      router.push("/sign-in");
    } catch (err) {
      console.error("Sign out error:", err);
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 relative animate-fadeIn">
        <div className="text-center">
          <IconAlertCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Email Verification Required</h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Please check your email (including spam folder) for the verification link.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogOut}
              className="flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-2 rounded-md font-bold hover:bg-red-600"
            >
              <IconLogout size={18} />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
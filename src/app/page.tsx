"use client";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import { useState, useEffect } from "react";
import Link from "next/link";
import EmailVerificationPopup from "./components/EmailVerificationPopUp";
import Dashboard from "./components/Dashboard";

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  useEffect(() => {
    if (user && !user.emailVerified) {
      setShowVerificationPopup(true);
    }
  }, [user]);

  const handleVerificationComplete = () => {
    setShowVerificationPopup(false);
  };

  const handleClosePopup = () => {
    setShowVerificationPopup(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show dashboard if user is verified
  if (user && user.emailVerified) {
    return <Dashboard />;
  }

  // Show main page for non-authenticated users
  return (
    <div className="bg-white min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8">Pet Care Service</h1>
        <div className="space-x-4">
          <Link className="bg-blue-500 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-600 inline-block" href="/sign-in">
            Sign in
          </Link>
          <Link className="bg-green-500 text-white px-6 py-3 rounded-md font-bold hover:bg-green-600 inline-block" href="/sign-up">
            Create an account
          </Link>
        </div>
      </div>

      {/* Email verification popup */}
      {user && showVerificationPopup && (
        <EmailVerificationPopup
          user={user}
          onClose={handleClosePopup}
          onVerified={handleVerificationComplete}
        />
      )}
    </div>
  );
}
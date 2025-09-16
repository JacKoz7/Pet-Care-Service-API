// src/app/components/Header.tsx
"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Header() {
  const [user] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (user?.email) {
      localStorage.setItem("userEmail", user.email);
    } else {
      localStorage.removeItem("userEmail");
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1
          className="text-2xl font-bold text-gray-800 cursor-pointer"
          onClick={() => router.push("/")}
        >
          Pet Care Service
        </h1>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-gray-600 font-medium">
                {localStorage.getItem("userEmail")}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-bold hover:bg-red-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/sign-in")}
                className="bg-blue-500 text-white px-4 py-2 rounded-md font-bold hover:bg-blue-600"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/sign-up")}
                className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // State to ensure client-side rendering consistency
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure component only renders fully on client
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getRoleLabel = () => {
    if (!user?.roles) return "";
    if (user.roles.includes("admin")) return "Admin";
    if (user.roles.includes("service_provider")) return "Service Provider";
    return "";
  };

  // Avoid rendering until client-side to prevent hydration mismatch
  if (!isClient || loading) {
    return null; // Or a minimal placeholder, e.g., <header>Loading...</header>
  }

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <h1
          className="text-2xl font-bold tracking-tight cursor-pointer hover:text-indigo-400 transition-colors duration-200"
          onClick={() => router.push("/")}
        >
          <span aria-hidden="true">🐾</span> Pet Care Service
        </h1>

        <div className="flex items-center gap-3">
          {/* Docs Button */}
          <button
            onClick={() =>
              (window.location.href = "http://localhost:3000/docs")
            }
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
            aria-label="View documentation"
          >
            Docs
          </button>

          {user ? (
            <>
              {/* Profile Button */}
              <button
                onClick={() => router.push("/profile")}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 hover:shadow-md transition-all duration-200"
                aria-label={`View profile for ${user.email}`}
              >
                {user.email} {getRoleLabel() && `(${getRoleLabel()})`}
              </button>
              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 hover:shadow-md transition-all duration-200"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              {/* Sign In Button */}
              <button
                onClick={() => router.push("/sign-in")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 hover:shadow-md transition-all duration-200"
                aria-label="Sign in"
              >
                Sign In
              </button>
              {/* Sign Up Button */}
              <button
                onClick={() => router.push("/sign-up")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 hover:shadow-md transition-all duration-200"
                aria-label="Sign up"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gradient Accent Line */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
    </header>
  );
}

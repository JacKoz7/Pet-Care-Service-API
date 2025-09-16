// src/app/components/Header.tsx
"use client";

import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
          {user && !loading ? (
            <>
              <button
                onClick={() => router.push("/profile")}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-medium hover:bg-blue-200 transition"
              >
                {user.email} {getRoleLabel() && `(${getRoleLabel()})`}
              </button>
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

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

  const onSubmit = async () => {
    const result = await signInUserWithEmailAndPassword(email, password);
    if (result) {
      router.push("/");
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
      />
      <input
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        value={password}
        placeholder="Password"
        className="text-xl px-4 py-2 rounded-md border border-gray-300 mb-4 w-80"
      />
      {error && <p className="text-red-500 mb-4">{error.message}</p>}
      <button
        className="bg-yellow-500 text-black px-4 py-2 rounded-md font-bold hover:bg-yellow-600"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? "Signing in..." : "SIGN IN"}
      </button>
    </div>
  );
}

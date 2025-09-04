"use client";
import { auth } from "../firebase";
import { IconFidgetSpinner } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCreateUserWithEmailAndPassword,
  useSendEmailVerification,
} from "react-firebase-hooks/auth";

export default function Page() {
  const router = useRouter();
  const [createUser, user, loading, error] =
    useCreateUserWithEmailAndPassword(auth);
  const [sendEmailVerification] = useSendEmailVerification(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      const result = await createUser(email, password);
      if (result) {
        await sendEmailVerification();
        router.push("/");
      }
    } catch (error) {
      console.error("Error creating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Create account</h1>
      {loading || isSubmitting ? (
        <IconFidgetSpinner className="animate-spin w-8 h-8" />
      ) : (
        <>
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
            disabled={isSubmitting}
          >
            SIGN UP
          </button>
        </>
      )}
    </div>
  );
}

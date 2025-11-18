// src/app/payment-success/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSuccess() {
  const router = useRouter();

  useEffect(() => {
    console.log("Payment successful!");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Płatność udana!</h1>
        <p className="text-gray-600 mb-6">
          Gratulacje! Jesteś teraz dostawcą usług. Twoja rola została zaktualizowana.
        </p>
        <button
          onClick={() => router.push("/")} // Zakładam, że dashboard jest pod /dashboard; dostosuj jeśli inaczej
          className="bg-blue-500 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-600 transition"
        >
          Powrót do dashboardu
        </button>
      </div>
    </div>
  );
}
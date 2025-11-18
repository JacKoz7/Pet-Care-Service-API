// src/app/payment-cancelled/page.tsx 
"use client";

import { useRouter } from "next/navigation";

export default function PaymentCancelled() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Płatność anulowana</h1>
        <p className="text-gray-600 mb-6">
          Płatność została anulowana. Spróbuj ponownie, jeśli chcesz zostać dostawcą usług.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-blue-500 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-600 transition"
        >
          Powrót do dashboardu
        </button>
      </div>
    </div>
  );
}
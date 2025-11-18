"use client";

import Link from "next/link";

export default function BookingPaymentCancelled() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Płatność anulowana
        </h1>
        <p className="text-gray-600 mb-8">
          Nie dokonano płatności. Możesz spróbować ponownie w sekcji „Moje
          rezerwacje”.
        </p>

        <Link
          href="/"
          className="inline-block bg-gray-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-700 transition"
        >
          Powrót do dashboardu
        </Link>
      </div>
    </div>
  );
}

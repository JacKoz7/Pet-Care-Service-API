"use client";

import Link from "next/link";

export default function BookingPaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">Płatność zakończona sukcesem!</h1>
        <p className="text-gray-600 mb-8">
          Dziękujemy! Twoja rezerwacja została opłacona. Dostawca usług wkrótce się z Tobą skontaktuje.
        </p>

        <Link
          href="/"
          className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Powrót do dashboardu
        </Link>
      </div>
    </div>
  );
}

// src/app/components/Dashboard.tsx
"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";

interface City {
  idCity: number;
  name: string;
  imageUrl: string;
}

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch("/api/cities");
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCities();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to Pet Care Service!
          </h1>
          <p className="text-gray-600">
            {user ? (
              <>
                Hello, <span className="font-semibold">{user.email}</span>!
                Explore pet care services in various cities.
              </>
            ) : (
              "Explore pet care services in various cities. Sign in to manage your bookings!"
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-600">Loading cities...</div>
        ) : (
          <div className="overflow-x-auto whitespace-nowrap pb-4">
            <div className="inline-flex gap-6">
              {cities.map((city) => (
                <div
                  key={city.idCity}
                  className="flex-none w-64 bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {city.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Discover pet care services in {city.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// src/app/my-advertisements/page.tsx
"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconPlus,
  IconMapPin,
  IconCalendar,
  IconPhoto,
} from "@tabler/icons-react";

interface MyAdvertisement {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  keyImage: string | null;
  city: {
    idCity: number;
    name: string;
    imageUrl: string | null;
  };
}

export default function MyAdvertisements() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [myAds, setMyAds] = useState<MyAdvertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchMyAds = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/advertisements", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMyAds(data.advertisements || []);
        } else {
          const errData = await response.json();
          setError(errData.error || "Failed to fetch advertisements");
        }
      } catch (err) {
        setError("An error occurred while fetching advertisements");
        console.error("Error fetching my advertisements:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAds();
  }, [user, router]);

  const handleAddAd = () => {
    // Non-functional for now
    alert("Add Advertisement feature coming soon!");
  };

  const handleViewAd = (adId: number) => {
    router.push(`/advertisements/${adId}`);
  };

  const handleBack = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">Loading your advertisements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <button
            onClick={handleBack}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 mx-auto"
          >
            <IconArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            My Advertisements
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage your active pet care services. View details and update as needed.
          </p>
        </div>

        {/* Add Advertisement Button */}
        <div className="mb-8">
          <button
            onClick={handleAddAd}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center justify-center mx-auto"
          >
            <IconPlus size={20} className="mr-2" />
            Add Advertisement
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Advertisements Grid */}
        {myAds.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white">
            <div className="inline-flex items-center justify-center bg-indigo-100 w-16 h-16 rounded-full mb-4 mx-auto">
              <IconPhoto className="text-indigo-500" size={28} />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No advertisements yet</h3>
            <p className="text-gray-500">Create your first advertisement to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAds.map((ad) => (
              <div
                key={ad.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={ad.keyImage || "/placeholder-pet.jpg"}
                    alt={ad.title}
                    width={400}
                    height={192}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="text-white font-semibold text-sm truncate">
                      {ad.title}
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <IconMapPin className="mr-1" size={14} />
                    {ad.city.name}
                  </div>
                  <div className="text-sm text-gray-600 mb-3 space-y-1">
                    <div className="flex items-center">
                      <IconCalendar className="mr-1" size={14} />
                      <span className="font-medium">
                        Starts: {new Date(ad.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {ad.endDate && (
                      <div className="flex items-center">
                        <IconCalendar className="mr-1" size={14} />
                        <span className="font-medium">
                          Ends: {new Date(ad.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewAd(ad.id)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
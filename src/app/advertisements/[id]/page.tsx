// src/app/advertisement/[id]/page.tsx
"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconMapPin,
  IconCalendar,
  IconCurrencyDollar,
  IconUser,
  IconPhone,
  IconInfoCircle,
  IconPhoto,
  IconPaw,
} from "@tabler/icons-react";

interface AdvertisementDetails {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  status: string;
  startDate: string;
  endDate: string | null;
  service: string;
  provider: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
  };
  city: {
    idCity: number;
    name: string;
    imageUrl: string | null;
  };
  images: Array<{
    imageUrl: string;
    order: number | null;
  }>;
}

export default function AdvertisementDetails() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;
  const [ad, setAd] = useState<AdvertisementDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adId || isNaN(Number(adId))) {
      setError("Invalid advertisement ID");
      setIsLoading(false);
      return;
    }

    const fetchAdDetails = async () => {
      try {
        const response = await fetch(`/api/advertisements/${adId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAd(data.advertisement);
          } else {
            setError("Advertisement not found");
          }
        } else {
          setError("Failed to fetch advertisement details");
        }
      } catch (err) {
        setError("An error occurred while fetching details");
        console.error("Error fetching advertisement:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdDetails();
  }, [adId]);

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">
            Loading advertisement details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-red-100 w-16 h-16 rounded-full mb-4 mx-auto">
            <IconInfoCircle className="text-red-500" size={28} />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            {error || "Advertisement not found"}
          </h3>
          <button
            onClick={handleBack}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back
        </button>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white">
          {/* Hero Image Section */}
          <div className="relative h-96 overflow-hidden">
            <Image
              src={ad.images[0]?.imageUrl || "/placeholder-pet.jpg"}
              alt={ad.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl font-bold text-white mb-2">{ad.title}</h1>
              <div className="flex items-center text-white/90 mb-1">
                <IconPaw className="mr-2" size={20} />
                <span className="font-medium">{ad.service}</span>
              </div>
              <div className="flex items-center text-white/80">
                <IconMapPin className="mr-1" size={16} />
                <span>{ad.city.name}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Description and Dates */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Description
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {ad.description || "No description available."}
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <IconCalendar className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Start Date
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(ad.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {ad.endDate && (
                  <div className="flex items-center">
                    <IconCalendar className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        End Date
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {new Date(ad.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {ad.price && (
                  <div className="flex items-center">
                    <IconCurrencyDollar
                      className="text-amber-500 mr-3"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Price</p>
                      <p className="text-lg font-semibold text-gray-800">
                        ${ad.price}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <IconInfoCircle className="text-green-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        ad.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : ad.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ad.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Provider and Gallery */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Service Provider
                </h2>
                <div className="flex items-center space-x-4 p-4 bg-indigo-50 rounded-xl">
                  <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                    <IconUser className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {ad.provider.firstName} {ad.provider.lastName}
                    </p>
                    {ad.provider.phoneNumber && (
                      <div className="flex items-center text-sm text-gray-600">
                        <IconPhone className="mr-2" size={16} />
                        {ad.provider.phoneNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Gallery
              </h2>
              {ad.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {ad.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden"
                    >
                      <Image
                        src={img.imageUrl}
                        alt={`${ad.title} - Image ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
                  <IconPhoto className="text-gray-400 mr-2" size={32} />
                  <span className="text-gray-500">No images available</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-8 pb-8 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-none bg-gray-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all duration-300"
              >
                Back
              </button>
              {user && (
                <button className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300">
                  Book Now
                </button>
              )}
            </div>
          </div>
        </div>
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

// app/advertisements/[id]/page.tsx
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
  IconClock,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconPencil,
  IconBookmark,
  IconBookmarkOff,
  IconPawFilled,
} from "@tabler/icons-react";
import BookingForm from "../../components/BookingForm";

interface AdvertisementDetails {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  status: string;
  startDate: string;
  endDate: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  service: string;
  serviceProviderId: number;
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
  species: Array<{
    id: number;
    name: string;
  }>;
}

interface UserRoles {
  roles: string[];
  serviceProviderIds: number[];
}

interface SavedAdvertisement {
  id: number;
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function AdvertisementDetails() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;
  const [ad, setAd] = useState<AdvertisementDetails | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!adId || isNaN(Number(adId))) {
        setError("Invalid advertisement ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Fetch ad details
        const adResponse = await fetch(`/api/advertisements/${adId}`);
        if (!adResponse.ok) {
          throw new Error("Failed to fetch advertisement details");
        }
        const adData = await adResponse.json();
        if (!adData.success) {
          throw new Error("Advertisement not found");
        }
        setAd(adData.advertisement);

        // Fetch user roles if user is logged in
        if (user) {
          const token = await user.getIdToken();
          const rolesResponse = await fetch("/api/user/check-role", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!rolesResponse.ok) {
            console.warn(
              "Failed to fetch user roles:",
              await rolesResponse.text()
            );
            setUserRoles({ roles: [], serviceProviderIds: [] });
          } else {
            const rolesData = await rolesResponse.json();
            console.log("Fetched user roles:", rolesData); // Debug log
            setUserRoles({
              roles: rolesData.roles || [],
              serviceProviderIds: rolesData.serviceProviderIds || [],
            });
          }

          // Check if ad is saved
          const savedResponse = await fetch("/api/advertisements/saved", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (savedResponse.ok) {
            const savedData = await savedResponse.json();
            const savedIds = savedData.advertisements.map(
              (savedAd: SavedAdvertisement) => savedAd.id
            );
            setIsSaved(savedIds.includes(Number(adId)));
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [adId, user]);

  // Check if user owns the ad
  const isOwner =
    user &&
    userRoles &&
    userRoles.serviceProviderIds.includes(ad?.serviceProviderId || 0);

  console.log(
    "Debug - isOwner:",
    isOwner,
    "ad.serviceProviderId:",
    ad?.serviceProviderId,
    "userRoles.serviceProviderIds:",
    userRoles?.serviceProviderIds
  ); // Debug log

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    if (!ad || !user) {
      showNotification("Please sign in to edit this advertisement.", "warning");
      return;
    }

    router.push(`/advertisements/${ad.id}/edit`);
  };

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleBook = () => {
    if (!user) {
      showNotification("Please sign in to book this service.", "warning");
      return;
    }

    if (isOwner) {
      showNotification("You cannot book your own advertisement.", "error");
      return;
    }

    if (ad?.status !== "ACTIVE") {
      showNotification("You cannot book an inactive advertisement.", "error");
      return;
    }

    setIsBookingOpen(true);
  };

  const handleDelete = async () => {
    if (!user || !isOwner || !ad) return;

    if (!confirm("Are you sure you want to delete this advertisement?")) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/advertisements/${ad.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification("Advertisement deleted successfully!", "success");
        setTimeout(() => router.back(), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to delete advertisement",
          "error"
        );
      }
    } catch (err) {
      console.error("Error deleting advertisement:", err);
      showNotification(
        "An error occurred while deleting the advertisement",
        "error"
      );
    }
  };

  const handleToggleSave = async () => {
    if (!user || !ad) {
      showNotification("Please sign in to save advertisements.", "warning");
      return;
    }

    try {
      const token = await user.getIdToken();
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetch(`/api/advertisements/saved/${ad.id}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        showNotification(
          isSaved
            ? "Advertisement removed from saved!"
            : "Advertisement saved successfully!",
          "success"
        );
      } else {
        const errData = await response.json();
        showNotification(errData.error || "Failed to toggle save", "error");
      }
    } catch (err) {
      console.error("Error toggling save:", err);
      showNotification("An error occurred while toggling save", "error");
    }
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
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all duration-300"
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

                {(ad.serviceStartTime || ad.serviceEndTime) && (
                  <div className="flex items-center">
                    <IconClock className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Service Hours
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {ad.serviceStartTime} - {ad.serviceEndTime}
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

                {ad.species.length > 0 && (
                  <div className="flex items-start">
                    <IconPawFilled
                      className="text-purple-500 mr-3 mt-1"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Species
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {ad.species.map((sp) => (
                          <span
                            key={sp.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            {sp.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
              <button
                onClick={handleBook}
                className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
              >
                Book Now
              </button>
              {!isOwner && (
                <button
                  onClick={handleToggleSave}
                  className={`flex-1 sm:flex-none ${
                    isSaved
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-green-500 hover:bg-green-600"
                  } text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center`}
                >
                  {isSaved ? (
                    <IconBookmarkOff size={18} className="mr-2" />
                  ) : (
                    <IconBookmark size={18} className="mr-2" />
                  )}
                  {isSaved ? "Unsave" : "Save"}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex-1 sm:flex-none bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-all duration-300 flex items-center justify-center"
                  >
                    <IconPencil size={18} className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 sm:flex-none bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 flex items-center justify-center"
                  >
                    <IconTrash size={18} className="mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Styled Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-sm">
          <div
            className={`bg-white rounded-xl shadow-2xl border-l-4 p-4 flex items-start space-x-3 animate-slide-in-right transform transition-all duration-300 ${
              notification.type === "success"
                ? "border-green-500 bg-green-50"
                : notification.type === "error"
                ? "border-red-500 bg-red-50"
                : notification.type === "warning"
                ? "border-yellow-500 bg-yellow-50"
                : "border-blue-500 bg-blue-50"
            }`}
          >
            {notification.type === "success" && (
              <IconCircleCheck
                className="text-green-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "error" && (
              <IconAlertCircle
                className="text-red-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "warning" && (
              <IconAlertCircle
                className="text-yellow-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "info" && (
              <IconInfoCircle
                className="text-blue-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  notification.type === "success"
                    ? "text-green-800"
                    : notification.type === "error"
                    ? "text-red-800"
                    : notification.type === "warning"
                    ? "text-yellow-800"
                    : "text-blue-800"
                }`}
              >
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      {isBookingOpen && ad && (
        <BookingForm
          adId={ad.id}
          serviceProviderId={ad.serviceProviderId}
          providerPhone={ad.provider.phoneNumber}
          adStartDate={ad.startDate}
          adEndDate={ad.endDate}
          adServiceStartTime={ad.serviceStartTime}
          adServiceEndTime={ad.serviceEndTime}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={() =>
            showNotification("Booking created successfully!", "success")
          }
        />
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

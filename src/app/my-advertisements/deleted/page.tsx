"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  IconArrowLeft,
  IconMapPin,
  IconCalendar,
  IconPhoto,
  IconClock,
  IconAlertCircle,
  IconX,
  IconInfoCircle,
  IconCircleCheck,
  IconRestore,
} from "@tabler/icons-react";

interface ArchivedAdvertisement {
  id: number; // idAdvertisementArchive
  originalId: number; // originalAdvertisementId
  title: string;
  startDate: string;
  endDate: string | null;
  serviceStartTime?: string;
  serviceEndTime?: string;
  keyImage: string | null;
  city: {
    idCity: number;
    name: string;
    imageUrl: string | null;
  };
}

interface UserRoles {
  isAdmin: boolean;
  isServiceProvider: boolean;
  isClient: boolean;
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function DeletedAdvertisements() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [archivedAds, setArchivedAds] = useState<ArchivedAdvertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRoles, setUserRoles] = useState<UserRoles>({
    isAdmin: false,
    isServiceProvider: false,
    isClient: true,
  });
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setIsLoadingRole(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/user/check-role", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRoles({
          isAdmin: data.roles?.includes("admin") || false,
          isServiceProvider: data.roles?.includes("service_provider") || false,
          isClient: true,
        });
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
    } finally {
      setIsLoadingRole(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchArchivedAds(), fetchUserRoles()]);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchArchivedAds = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/advertisements/archived", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setArchivedAds(data.advertisements || []);
        } else {
          const errData = await response.json();
          setError(errData.error || "Failed to fetch archived advertisements");
        }
      } catch (err) {
        setError("An error occurred while fetching archived advertisements");
        console.error("Error fetching archived advertisements:", err);
      }
    };

    loadData();
  }, [user, router, fetchUserRoles]);

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleRestoreAd = async (archiveId: number) => {
    if (!user) {
      showNotification("Please sign in to restore advertisements.", "warning");
      return;
    }

    if (!userRoles.isServiceProvider) {
      showNotification("You must be an active service provider to restore advertisements.", "warning");
      return;
    }

    if (!confirm("Are you sure you want to restore this advertisement?")) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/advertisements/restore/${archiveId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification("Advertisement restored successfully!", "success");
        // Remove the restored ad from the list
        setArchivedAds(archivedAds.filter((ad) => ad.id !== archiveId));
      } else {
        const errData = await response.json();
        showNotification(errData.error || "Failed to restore advertisement", "error");
      }
    } catch (err) {
      console.error("Error restoring advertisement:", err);
      showNotification("An error occurred while restoring the advertisement", "error");
    }
  };

  const handleBack = () => {
    router.push("/my-advertisements");
  };

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">
            Loading archived advertisements...
          </p>
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
            Back to My Advertisements
          </button>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            Deleted Advertisements
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            View and restore your deleted advertisements.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Archived Advertisements Grid */}
        {archivedAds.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white">
            <div className="inline-flex items-center justify-center bg-indigo-100 w-16 h-16 rounded-full mb-4 mx-auto">
              <IconPhoto className="text-indigo-500" size={28} />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No deleted advertisements
            </h3>
            <p className="text-gray-500">
              You have not deleted any advertisements yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedAds.map((ad) => (
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
                    {(ad.serviceStartTime || ad.serviceEndTime) && (
                      <div className="flex items-center">
                        <IconClock className="mr-1" size={14} />
                        <span className="font-medium">
                          Service hours: {ad.serviceStartTime} -{" "}
                          {ad.serviceEndTime}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestoreAd(ad.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg text-sm flex items-center justify-center"
                  >
                    <IconRestore size={16} className="mr-2" />
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
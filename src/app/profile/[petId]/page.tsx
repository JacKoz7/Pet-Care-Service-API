// app/profile/[petId]/page.tsx
"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconPaw,
  IconHash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconPencil,
  IconTrash,
  IconCalendar,
  IconPhoto,
} from "@tabler/icons-react";

interface PetDetails {
  id: number;
  name: string;
  age: number;
  description: string | null;
  species: string;
  breed: string;
  images: Array<{
    imageUrl: string;
    order: number | null;
  }>;
}

interface UserRoles {
  roles: string[];
  clientIds: number[];
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function PetDetails() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<PetDetails | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!petId || isNaN(Number(petId))) {
        setError("Invalid pet ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Fetch pet details
        const petResponse = await fetch(`/api/pets/${petId}`);
        if (!petResponse.ok) {
          throw new Error("Failed to fetch pet details");
        }
        const petData = await petResponse.json();
        if (!petData.success) {
          throw new Error("Pet not found");
        }
        setPet(petData.pet);

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
            setUserRoles({ roles: [], clientIds: [] });
          } else {
            const rolesData = await rolesResponse.json();
            setUserRoles({
              roles: rolesData.roles || [],
              clientIds: rolesData.clientIds || [],
            });
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
  }, [petId, user]);

  // Check if user owns the pet
  const isOwner = user && userRoles && userRoles.clientIds.length > 0; // Assuming one client per user

  const handleBack = () => {
    router.push("/profile");
  };

  const handleEdit = async () => {
    if (!pet || !user) {
      showNotification("Please sign in to edit this pet profile.", "warning");
      return;
    }

    router.push(`/profile/${pet.id}/edit`);
  };

  const handleDelete = async () => {
    if (!user || !isOwner || !pet) return;

    if (!confirm("Are you sure you want to delete this pet profile?")) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/pets/${pet.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification("Pet profile deleted successfully!", "success");
        setTimeout(() => router.push("/profile"), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to delete pet profile",
          "error"
        );
      }
    } catch (err) {
      console.error("Error deleting pet:", err);
      showNotification(
        "An error occurred while deleting the pet profile",
        "error"
      );
    }
  };

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">
            Loading pet details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-red-100 w-16 h-16 rounded-full mb-4 mx-auto">
            <IconAlertCircle className="text-red-500" size={28} />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            {error || "Pet not found"}
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
          Back to Profile
        </button>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white">
          {/* Hero Image Section */}
          <div className="relative h-96 overflow-hidden">
            <Image
              src={pet.images[0]?.imageUrl || "/placeholder-pet.jpg"}
              alt={pet.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl font-bold text-white mb-2">{pet.name}</h1>
              <div className="flex items-center text-white/90 mb-1">
                <IconPaw className="mr-2" size={20} />
                <span className="font-medium">
                  {pet.species} - {pet.breed}
                </span>
              </div>
              <div className="flex items-center text-white/80">
                <IconHash className="mr-1" size={16} />
                <span>Age: {pet.age}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Description
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {pet.description || "No description available."}
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <IconPaw className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Species</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {pet.species}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <IconHash className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Breed</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {pet.breed}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <IconCalendar className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Age</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {pet.age} years
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Gallery */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Gallery
              </h2>
              {pet.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {pet.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden"
                    >
                      <Image
                        src={img.imageUrl}
                        alt={`${pet.name} - Image ${index + 1}`}
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
              <IconAlertCircle
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

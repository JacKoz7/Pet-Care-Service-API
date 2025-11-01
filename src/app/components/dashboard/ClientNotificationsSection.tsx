// src/app/components/ClientNotificationsSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase";
import Image from "next/image";
import {
  IconPaw,
  IconUser,
  IconCalendarClock,
  IconMessage,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";

interface Pet {
  id: number;
  name: string;
  age: number;
  description: string | null;
  chronicDiseases: string[];
  isHealthy: boolean | null;
  breed: string;
  species: string;
  keyImage: string | null;
}

interface Provider {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

interface Booking {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  startDateTime: string;
  endDateTime: string;
  message: string | null;
  pets: Pet[];
  provider: Provider;
}

interface UserRoles {
  isAdmin: boolean;
  isServiceProvider: boolean;
  isClient: boolean;
}

interface ClientNotificationsSectionProps {
  showNotifications: boolean;
  onToggleNotifications: () => void;
  userRoles: UserRoles;
}

export default function ClientNotificationsSection({
  showNotifications,
  onToggleNotifications,
  userRoles,
}: ClientNotificationsSectionProps) {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Booking | null>(null);

  // Status badge component
  const StatusBadge = ({ status }: { status: Booking["status"] }) => {
    if (status === "CANCELLED") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <IconAlertCircle size={14} className="mr-1" />
          Cancelled
        </span>
      );
    }
    return null; // For now, only show for cancelled; extend for others later
  };

  useEffect(() => {
    if (!user || !showNotifications || !userRoles.isClient) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/bookings/client/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setNotifications(data.bookings || []);
        } else {
          console.error("Failed to fetch client notifications");
        }
      } catch (error) {
        console.error("Error fetching client notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user, showNotifications, userRoles.isClient]);

  const handleCancel = async (id: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/bookings/client/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await response.json();
      if (data.success) {
        // Refetch notifications to update the list
        const fetchResponse = await fetch("/api/bookings/client/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchData = await fetchResponse.json();
        if (fetchData.success) {
          setNotifications(fetchData.bookings || []);
          // Close modal if open
          if (selectedNotification?.id === id) {
            setSelectedNotification(null);
          }
        }
        console.log("Booking cancelled successfully");
      } else {
        console.error("Failed to cancel booking:", data.error);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  if (!userRoles.isClient) {
    return null;
  }

  return (
    <>
      <div className="mb-8">
        {showNotifications && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white transition-all duration-300">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                My Recent Bookings
              </h2>
              <button
                onClick={onToggleNotifications}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Hide
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No recent bookings
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedNotification(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">
                            Booking with {booking.provider.firstName}{" "}
                            {booking.provider.lastName} for {booking.pets.length}{" "}
                            pet
                            {booking.pets.length > 1 ? "s" : ""}:{" "}
                            {booking.pets.map((p) => p.name).join(", ")}
                          </h4>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm text-gray-600">
                          From:{" "}
                          {new Date(booking.startDateTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {new Date(booking.endDateTime).toLocaleString()}
                        </p>
                      </div>
                      {booking.status === "PENDING" && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(booking.id);
                            }}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <IconX size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl lg:max-w-4xl mx-auto shadow-2xl relative z-[100000] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  Booking Details
                </h2>
                <StatusBadge status={selectedNotification.status} />
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div>
                <h3 className="font-semibold flex items-center mb-4">
                  <IconPaw className="mr-2 text-indigo-500" />
                  Pet Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {selectedNotification.pets.map((pet) => (
                    <div
                      key={pet.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="text-center mb-4">
                        <div className="relative h-32 w-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-200">
                          <Image
                            src={pet.keyImage || "/placeholder-pet.jpg"}
                            alt={pet.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <h4 className="font-semibold mt-2">{pet.name}</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Age:</span> {pet.age}
                        </p>
                        <p>
                          <span className="font-medium">Species:</span>{" "}
                          {pet.species}
                        </p>
                        <p>
                          <span className="font-medium">Breed:</span>{" "}
                          {pet.breed}
                        </p>
                        <p>
                          <span className="font-medium">Description:</span>{" "}
                          {pet.description || "None"}
                        </p>
                        {pet.isHealthy === true && (
                          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Healthy
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold flex items-center mb-4">
                  <IconUser className="mr-2 text-indigo-500" />
                  Service Provider Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedNotification.provider.firstName}{" "}
                    {selectedNotification.provider.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {selectedNotification.provider.email}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {selectedNotification.provider.phoneNumber}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold flex items-center mb-4">
                  <IconCalendarClock className="mr-2 text-indigo-500" />
                  Booking Times
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Start:</span>{" "}
                    {new Date(
                      selectedNotification.startDateTime
                    ).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">End:</span>{" "}
                    {new Date(
                      selectedNotification.endDateTime
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedNotification.message && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold flex items-center mb-4">
                    <IconMessage className="mr-2 text-indigo-500" />
                    Message
                  </h3>
                  <p className="text-sm">{selectedNotification.message}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-6 mt-auto flex justify-end space-x-4">
              {selectedNotification.status === "PENDING" && (
                <button
                  onClick={() => handleCancel(selectedNotification.id)}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
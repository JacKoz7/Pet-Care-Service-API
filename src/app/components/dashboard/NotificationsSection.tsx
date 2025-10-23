// src/app/components/NotificationsSection.tsx
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
  IconCheck,
  IconX,
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

interface Client {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

interface Booking {
  id: number;
  startDateTime: string;
  endDateTime: string;
  message: string | null;
  pet: Pet;
  client: Client;
}

interface NotificationsSectionProps {
  showNotifications: boolean;
  onToggleNotifications: () => void;
}

export default function NotificationsSection({
  showNotifications,
  onToggleNotifications,
}: NotificationsSectionProps) {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Booking | null>(null);

  useEffect(() => {
    if (!user || !showNotifications) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          "/api/bookings/notifications/service-provider",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (data.success) {
          setNotifications(data.bookings || []);
        } else {
          console.error("Failed to fetch notifications");
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user, showNotifications]);

  const handleAccept = (id: number) => {
    // TODO: Implement accept functionality
    console.log(`Accept booking ${id}`);
  };

  const handleDecline = (id: number) => {
    // TODO: Implement decline functionality
    console.log(`Decline booking ${id}`);
  };

  return (
    <>
      <div className="mb-8">
        {showNotifications && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white transition-all duration-300">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                Pending Bookings
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
                No pending bookings
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
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Booking for {booking.pet.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          From:{" "}
                          {new Date(booking.startDateTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {new Date(booking.endDateTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(booking.id);
                          }}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                          <IconCheck size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecline(booking.id);
                          }}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          <IconX size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl relative z-[100000]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Booking Details
              </h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="relative h-32 w-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-200">
                  <Image
                    src={
                      selectedNotification.pet.keyImage ||
                      "/placeholder-pet.jpg"
                    }
                    alt={selectedNotification.pet.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-semibold flex items-center">
                  <IconPaw className="mr-2 text-indigo-500" />
                  Pet Information
                </h3>
                <p>Name: {selectedNotification.pet.name}</p>
                <p>Age: {selectedNotification.pet.age}</p>
                <p>Species: {selectedNotification.pet.species}</p>
                <p>Breed: {selectedNotification.pet.breed}</p>
                <p>
                  Description: {selectedNotification.pet.description || "None"}
                </p>
                {selectedNotification.pet.isHealthy === true && (
                  <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Healthy
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-semibold flex items-center">
                  <IconUser className="mr-2 text-indigo-500" />
                  Client Information
                </h3>
                <p>
                  Name: {selectedNotification.client.firstName}{" "}
                  {selectedNotification.client.lastName}
                </p>
                <p>Email: {selectedNotification.client.email}</p>
                <p>Phone: {selectedNotification.client.phoneNumber}</p>
              </div>

              <div>
                <h3 className="font-semibold flex items-center">
                  <IconCalendarClock className="mr-2 text-indigo-500" />
                  Booking Times
                </h3>
                <p>
                  Start:{" "}
                  {new Date(
                    selectedNotification.startDateTime
                  ).toLocaleString()}
                </p>
                <p>
                  End:{" "}
                  {new Date(selectedNotification.endDateTime).toLocaleString()}
                </p>
              </div>

              {selectedNotification.message && (
                <div>
                  <h3 className="font-semibold flex items-center">
                    <IconMessage className="mr-2 text-indigo-500" />
                    Message
                  </h3>
                  <p>{selectedNotification.message}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => handleDecline(selectedNotification.id)}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(selectedNotification.id)}
                  className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

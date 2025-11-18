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
  IconCheck,
  IconCreditCard,
  IconClock,
} from "@tabler/icons-react";

interface Pet {
  id: number;
  name: string;
  age: number;
  description: string | null;
  chronicDiseases: string[];
  isHealthy: boolean | null;
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
  status:
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELLED"
    | "AWAITING_PAYMENT"
    | "OVERDUE"
    | "PAID";
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

const PaymentTimer = ({ endDateTime }: { endDateTime: string }) => {
  const deadline = new Date(endDateTime).getTime() + 48 * 60 * 60 * 1000;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = deadline - now;
  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  const format = () => {
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div
      className={`flex items-center gap-2 text-sm font-medium ${
        isOverdue ? "text-red-600" : "text-orange-600"
      }`}
    >
      <IconClock size={16} />
      {isOverdue ? (
        <span>{format()} overdue</span>
      ) : (
        <span>{format()} left</span>
      )}
    </div>
  );
};

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

  const StatusBadge = ({ status }: { status: Booking["status"] }) => {
    const getColor = () => {
      switch (status) {
        case "PENDING":
          return "bg-yellow-100 text-yellow-800";
        case "ACCEPTED":
          return "bg-green-100 text-green-800";
        case "REJECTED":
        case "CANCELLED":
          return "bg-red-100 text-red-800";
        case "AWAITING_PAYMENT":
          return "bg-orange-100 text-orange-800";
        case "OVERDUE":
          return "bg-red-200 text-red-900";
        case "PAID":
          return "bg-emerald-100 text-emerald-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    const getIcon = () => {
      switch (status) {
        case "PENDING":
          return <IconCalendarClock size={14} />;
        case "ACCEPTED":
          return <IconCheck size={14} />;
        case "REJECTED":
        case "CANCELLED":
          return <IconAlertCircle size={14} />;
        case "AWAITING_PAYMENT":
        case "OVERDUE":
          return <IconCreditCard size={14} />;
        case "PAID":
          return <IconCheck size={14} />;
        default:
          return null;
      }
    };

    const getText = () => {
      switch (status) {
        case "PENDING":
          return "Pending";
        case "ACCEPTED":
          return "Accepted";
        case "REJECTED":
          return "Rejected";
        case "CANCELLED":
          return "Cancelled";
        case "AWAITING_PAYMENT":
          return "Awaiting Payment";
        case "OVERDUE":
          return "Overdue";
        case "PAID":
          return "Paid";
        default:
          return status;
      }
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getColor()}`}
      >
        {getIcon()} {getText()}
      </span>
    );
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
        if (data.success) setNotifications(data.bookings || []);
      } catch (error) {
        console.error("Error fetching client notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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
        setNotifications((prev) => prev.filter((b) => b.id !== id));
        if (selectedNotification?.id === id) setSelectedNotification(null);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  };

  const handlePay = async (id: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/payments/create-booking-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not create payment session");
      }
    } catch (error) {
      console.error("Error starting payment:", error);
      alert("Payment failed to start");
    }
  };

  const needsPayment = (booking: Booking) =>
    booking.status === "AWAITING_PAYMENT" || booking.status === "OVERDUE";

  if (!userRoles.isClient) return null;

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
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">
                            Booking with {booking.provider.firstName}{" "}
                            {booking.provider.lastName} –{" "}
                            {booking.pets.map((p) => p.name).join(", ")}
                          </h4>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={booking.status} />
                            {needsPayment(booking) && (
                              <PaymentTimer endDateTime={booking.endDateTime} />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          From:{" "}
                          {new Date(booking.startDateTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {new Date(booking.endDateTime).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {booking.status === "PENDING" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(booking.id);
                            }}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <IconX size={20} />
                          </button>
                        )}
                        {needsPayment(booking) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePay(booking.id);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition ${
                              booking.status === "OVERDUE"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-orange-500 hover:bg-orange-600"
                            }`}
                          >
                            <IconCreditCard size={20} />
                            Pay Now
                          </button>
                        )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl lg:max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Booking Details
                </h2>
                <StatusBadge status={selectedNotification.status} />
                {needsPayment(selectedNotification) && (
                  <PaymentTimer
                    endDateTime={selectedNotification.endDateTime}
                  />
                )}
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={24} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h3 className="font-semibold flex items-center mb-4">
                  <IconPaw className="mr-2 text-indigo-500" />
                  Pet Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <span className="font-medium">Description:</span>{" "}
                          {pet.description || "None"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold flex items-center mb-4">
                  <IconUser className="mr-2 text-indigo-500" />
                  Service Provider
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

            <div className="border-t pt-6 mt-auto flex justify-end gap-4">
              {selectedNotification.status === "PENDING" && (
                <button
                  onClick={() => handleCancel(selectedNotification.id)}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  Cancel Booking
                </button>
              )}
              {needsPayment(selectedNotification) && (
                <button
                  onClick={() => handlePay(selectedNotification.id)}
                  className={`px-8 py-3 font-bold rounded-xl text-white flex items-center gap-2 transition ${
                    selectedNotification.status === "OVERDUE"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                >
                  <IconCreditCard size={24} />
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

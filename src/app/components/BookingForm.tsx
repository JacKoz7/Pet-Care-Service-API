// src/app/components/BookingForm.tsx
"use client";

import { useState, useEffect } from "react";
import {
  IconPaw,
  IconMessage,
  IconPhone,
  IconCalendarClock,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
} from "@tabler/icons-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

interface Pet {
  id: number;
  name: string;
  age: number;
  breed: string;
  species: string;
}

interface BookingFormProps {
  adId: number;
  serviceProviderId: number;
  providerPhone: string | null;
  adStartDate: string;
  adEndDate: string | null;
  adServiceStartTime: string | null;
  adServiceEndTime: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingForm({
  adId,
  serviceProviderId,
  providerPhone,
  adStartDate,
  adEndDate,
  adServiceStartTime,
  adServiceEndTime,
  onClose,
  onSuccess,
}: BookingFormProps) {
  const [user] = useAuthState(auth);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/pets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setPets(data.pets || []);
        } else {
          setError(data.error || "Failed to fetch pets");
        }
      } catch (err) {
        console.error("Error fetching pets:", err);
        setError("Error fetching pets");
      }
    };

    fetchPets();
  }, [user]);

  const togglePet = (id: number) => {
    setSelectedPets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const validateDates = (start: string, end: string): string | null => {
    const bookingStart = new Date(start);
    const bookingEnd = new Date(end);
    const adStart = new Date(adStartDate);
    const adEnd = adEndDate ? new Date(adEndDate) : null;

    // Basic validation
    if (bookingStart >= bookingEnd) {
      return "End date/time must be after start date/time";
    }

    // Check against ad start date
    if (bookingStart < adStart) {
      return `Booking cannot start before advertisement start date (${adStart.toLocaleDateString()})`;
    }

    // Check against ad end date if provided
    if (adEnd && bookingEnd > adEnd) {
      return `Booking cannot end after advertisement end date (${adEnd.toLocaleDateString()})`;
    }

    // Check service times if provided
    if (adServiceStartTime && adServiceEndTime) {
      const startTime = bookingStart.toTimeString().slice(0, 5); // HH:MM
      const endTime = bookingEnd.toTimeString().slice(0, 5);
      if (startTime < adServiceStartTime || endTime > adServiceEndTime) {
        return `Booking times must be within service hours (${adServiceStartTime} - ${adServiceEndTime})`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPets.length || !startDateTime || !endDateTime) {
      setError("Please select at least one pet and provide start/end times");
      return;
    }

    const dateValidationError = validateDates(startDateTime, endDateTime);
    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          petIds: selectedPets,
          serviceProviderId,
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
          message: message || undefined,
          advertisementId: adId, // For reference in message or logging
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Booking request sent successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(data.error || "Failed to create booking");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("An error occurred while creating the booking");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Book Service</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IconX size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
            <IconAlertCircle size={20} className="mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
            <IconCircleCheck size={20} className="mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <IconPaw className="mr-2 text-indigo-500" size={18} />
              Select Pets
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
              {pets.length > 0 ? (
                pets.map((pet) => (
                  <label
                    key={pet.id}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPets.includes(pet.id)}
                      onChange={() => togglePet(pet.id)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
                    />
                    {pet.name} ({pet.species}, {pet.breed}, Age: {pet.age})
                  </label>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No pets available</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <IconCalendarClock className="mr-2 text-indigo-500" size={18} />
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <IconCalendarClock className="mr-2 text-indigo-500" size={18} />
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <IconMessage className="mr-2 text-indigo-500" size={18} />
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any details or arrangements..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
            />
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl flex items-center">
            <IconPhone className="mr-2 text-indigo-600" size={18} />
            <span className="text-sm text-gray-700">
              Provider Phone: {providerPhone || "Not available"}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Submit Booking Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

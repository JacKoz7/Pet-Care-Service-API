"use client";

import { auth } from "../../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconCalendar,
  IconClock,
  IconCurrencyDollar,
  IconPaw,
  IconPhoto,
} from "@tabler/icons-react";

interface Service {
  idService: number;
  name: string;
}

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
}

interface UserRoles {
  roles: string[];
  serviceProviderIds: number[];
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function EditAdvertisement() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;
  const [ad, setAd] = useState<AdvertisementDetails | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [serviceStartTime, setServiceStartTime] = useState("");
  const [serviceEndTime, setServiceEndTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [images, setImages] = useState<string[]>([""]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      if (!adId || isNaN(Number(adId))) {
        setError("Invalid advertisement ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Fetch services
        const servicesResponse = await fetch("/api/services");
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          setServices(servicesData.services || []);
        } else {
          setError("Failed to fetch services");
        }

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

        // Fetch user roles
        const token = await user.getIdToken();
        const rolesResponse = await fetch("/api/user/check-role", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setUserRoles({
            roles: rolesData.roles || [],
            serviceProviderIds: rolesData.serviceProviderIds || [],
          });
        } else {
          console.warn("Failed to fetch user roles:", await rolesResponse.text());
          setUserRoles({ roles: [], serviceProviderIds: [] });
        }

        // Pre-fill form (except selectedService)
        setTitle(adData.advertisement.title);
        setDescription(adData.advertisement.description || "");
        setPrice(adData.advertisement.price ? adData.advertisement.price.toString() : "");
        setStartDate(new Date(adData.advertisement.startDate).toISOString().split("T")[0]);
        setEndDate(adData.advertisement.endDate ? new Date(adData.advertisement.endDate).toISOString().split("T")[0] : "");
        setServiceStartTime(adData.advertisement.serviceStartTime || "");
        setServiceEndTime(adData.advertisement.serviceEndTime || "");
        setStatus(adData.advertisement.status);
        setImages(adData.advertisement.images.map((img: { imageUrl: string }) => img.imageUrl) || [""]);
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
  }, [user, router, adId]);

  // Pre-fill selectedService when ad and services are available
  useEffect(() => {
    if (ad && services.length > 0) {
      const service = services.find((s) => s.name === ad.service);
      if (service) {
        setSelectedService(service.idService.toString());
      }
    }
  }, [ad, services]);

  // Check if user owns the ad
  useEffect(() => {
    if (ad && userRoles && !userRoles.serviceProviderIds.includes(ad.serviceProviderId)) {
      showNotification("You are not authorized to edit this advertisement.", "error");
      router.push(`/advertisements/${adId}`);
    }
  }, [ad, userRoles, router, adId]);

  const handleAddImage = () => {
    setImages([...images, ""]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages.length === 0 ? [""] : newImages);
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const validateForm = () => {
    if (!title.trim()) return "Title is required";
    if (!selectedService) return "Service is required";
    if (!startDate) return "Start date is required";
    if (!endDate) return "End date is required";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return "End date must be on or after start date";
    if (start.getTime() === end.getTime() && serviceStartTime && serviceEndTime && serviceStartTime >= serviceEndTime) {
      return "End time must be after start time for the same day";
    }
    if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) return "Price must be a non-negative number";
    const validImages = images.filter((img) => img.trim());
    if (validImages.length === 0) return "At least one image URL is required";
    if (!["ACTIVE", "INACTIVE"].includes(status)) return "Invalid status";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showNotification(validationError, "error");
      return;
    }

    try {
      const token = await user!.getIdToken();
      const response = await fetch(`/api/advertisements/${adId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || null,
          price: price ? parseFloat(price) : null,
          status,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          serviceStartTime: serviceStartTime ? `1970-01-01T${serviceStartTime}:00` : null,
          serviceEndTime: serviceEndTime ? `1970-01-01T${serviceEndTime}:00` : null,
          serviceId: parseInt(selectedService),
          images: images.filter((img) => img.trim()).map((img, index) => ({
            imageUrl: img,
            order: index + 1,
          })),
        }),
      });

      if (response.ok) {
        showNotification("Advertisement updated successfully!", "success");
        setTimeout(() => router.push(`/advertisements/${adId}`), 1500);
      } else {
        const errData = await response.json();
        showNotification(errData.error || "Failed to update advertisement", "error");
      }
    } catch (err) {
      console.error("Error updating advertisement:", err);
      showNotification("An error occurred while updating the advertisement", "error");
    }
  };

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBack = () => {
    router.push(`/advertisements/${adId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-red-100 w-16 h-16 rounded-full mb-4 mx-auto">
            <IconAlertCircle className="text-red-500" size={28} />
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
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back to Advertisement
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Advertisement</h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <div className="relative">
                <IconCurrencyDollar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <div className="relative">
                  <IconCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <div className="relative">
                  <IconCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="serviceStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Start Time
                </label>
                <div className="relative">
                  <IconClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="serviceStartTime"
                    type="time"
                    value={serviceStartTime}
                    onChange={(e) => setServiceStartTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="serviceEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Service End Time
                </label>
                <div className="relative">
                  <IconClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="serviceEndTime"
                    type="time"
                    value={serviceEndTime}
                    onChange={(e) => setServiceEndTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
                Service *
              </label>
              <div className="relative">
                <IconPaw className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  id="service"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.idService} value={service.idService}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Images * (at least one)
                </label>
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                  <IconPlus size={16} className="mr-1" />
                  Add Image
                </button>
              </div>
              {images.map((img, index) => (
                <div key={index} className="flex items-center mb-2">
                  <div className="relative flex-1">
                    <IconPhoto className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      value={img}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <IconTrash size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              Update Advertisement
            </button>
          </form>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-sm">
          <div
            className={`bg-white rounded-xl shadow-2xl border-l-4 p-4 flex items-start space-x-3 animate-slide-in-right ${
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
              <IconCircleCheck className="text-green-500 mt-0.5" size={20} />
            )}
            {notification.type === "error" && (
              <IconAlertCircle className="text-red-500 mt-0.5" size={20} />
            )}
            {notification.type === "warning" && (
              <IconAlertCircle className="text-yellow-500 mt-0.5" size={20} />
            )}
            {notification.type === "info" && (
              <IconAlertCircle className="text-blue-500 mt-0.5" size={20} />
            )}
            <p
              className={`text-sm font-medium flex-1 ${
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
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600"
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
// app/my-advertisements/add/page.tsx
"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconCalendar,
  IconClock,
  IconCurrencyDollar,
  IconPaw,
  IconUpload,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import Image from "next/image";

interface Service {
  idService: number;
  name: string;
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

interface ImageFile {
  file?: File;
  url: string;
  preview?: string;
  isUploading?: boolean;
  order: number;
}

export default function AddAdvertisement() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [serviceStartTime, setServiceStartTime] = useState("");
  const [serviceEndTime, setServiceEndTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services");
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        } else {
          setError("Failed to fetch services");
        }
      } catch (err) {
        setError("An error occurred while fetching services");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [user, router]);

  const onDrop = (acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file, index) => ({
      file,
      url: "",
      preview: URL.createObjectURL(file),
      order: images.length + index + 1,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif"] },
    multiple: true,
  });

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<
    { imageUrl: string; order: number }[]
  > => {
    const uploaded: { imageUrl: string; order: number }[] = [];
    for (const [index, img] of images.entries()) {
      if (img.file) {
        setImages((prev) =>
          prev.map((p, i) => (i === index ? { ...p, isUploading: true } : p))
        );
        const storageRef = ref(
          storage,
          `advertisements/${user!.uid}/${Date.now()}_${img.file.name}`
        );
        await uploadBytes(storageRef, img.file);
        const url = await getDownloadURL(storageRef);
        uploaded.push({ imageUrl: url, order: img.order });
        setImages((prev) =>
          prev.map((p, i) =>
            i === index ? { ...p, url, isUploading: false } : p
          )
        );
      } else if (img.url) {
        uploaded.push({ imageUrl: img.url, order: img.order });
      }
    }
    return uploaded;
  };

  const validateForm = () => {
    if (!title.trim()) return "Title is required";
    if (!selectedService) return "Service is required";
    if (!startDate) return "Start date is required";
    if (!endDate) return "End date is required";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return "End date must be on or after start date";
    if (
      start.getTime() === end.getTime() &&
      serviceStartTime &&
      serviceEndTime &&
      serviceStartTime >= serviceEndTime
    ) {
      return "End time must be after start time for the same day";
    }
    if (price && (isNaN(parseFloat(price)) || parseFloat(price) < 0))
      return "Price must be a non-negative number";
    if (images.length === 0) return "At least one image is required";
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
      const uploadedImages = await uploadImages();
      if (uploadedImages.length !== images.length) {
        throw new Error("Failed to upload all images");
      }

      const token = await user!.getIdToken();
      const response = await fetch("/api/advertisements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || null,
          price: price ? parseFloat(price) : null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          serviceStartTime: serviceStartTime
            ? `1970-01-01T${serviceStartTime}:00`
            : null,
          serviceEndTime: serviceEndTime
            ? `1970-01-01T${serviceEndTime}:00`
            : null,
          serviceId: parseInt(selectedService),
          images: uploadedImages,
        }),
      });

      if (response.ok) {
        showNotification("Advertisement added successfully!", "success");
        setTimeout(() => router.push("/my-advertisements"), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to add advertisement",
          "error"
        );
      }
    } catch (err) {
      console.error("Error adding advertisement:", err);
      showNotification(
        "An error occurred while adding the advertisement",
        "error"
      );
    }
  };

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBack = () => {
    router.back();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back to My Advertisements
        </button>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Add New Advertisement
          </h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price
              </label>
              <div className="relative">
                <IconCurrencyDollar
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
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

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date *
                </label>
                <div className="relative">
                  <IconCalendar
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
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
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date *
                </label>
                <div className="relative">
                  <IconCalendar
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
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

            {/* Service Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="serviceStartTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Service Start Time
                </label>
                <div className="relative">
                  <IconClock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
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
                <label
                  htmlFor="serviceEndTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Service End Time
                </label>
                <div className="relative">
                  <IconClock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
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

            {/* Service */}
            <div>
              <label
                htmlFor="service"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service *
              </label>
              <div className="relative">
                <IconPaw
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
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

            {/* Images Dropzone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Images * (at least one)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-300 hover:border-indigo-500"
                }`}
              >
                <input {...getInputProps()} />
                <IconUpload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-600">
                  {isDragActive
                    ? "Drop the images here"
                    : "Drag & drop images here, or click to select"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: JPG, PNG, GIF
                </p>
              </div>
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={img.preview || img.url}
                        alt={`Image ${index + 1}`}
                        width={200}
                        height={128}
                        className={`w-full h-32 object-cover rounded-lg ${
                          img.isUploading ? "opacity-50" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <IconTrash size={16} />
                      </button>
                      {img.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              Create Advertisement
            </button>
          </form>
        </div>
      </div>

      {/* Notification */}
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

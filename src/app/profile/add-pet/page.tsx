// app/profile/add-pet/page.tsx
"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconPaw,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconHash,
} from "@tabler/icons-react";

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function AddPet() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([""]);
  const [speciesName, setSpeciesName] = useState("");
  const [breedName, setBreedName] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    setIsLoading(false);
  }, [user, router]);

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
    if (!name.trim()) return "Name is required";
    if (!age || isNaN(parseFloat(age)) || parseFloat(age) < 0 || parseFloat(age) > 999) return "Age must be a number between 0 and 999";
    const validImages = images.filter((img) => img.trim());
    if (validImages.length === 0) return "At least one image URL is required";
    if (!speciesName.trim()) return "Species name is required";
    if (!breedName.trim()) return "Breed name is required";
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
      const response = await fetch("/api/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          age: parseFloat(age),
          description: description || null,
          images: images
            .filter((img) => img.trim())
            .map((img, index) => ({
              imageUrl: img,
              order: index + 1,
            })),
          speciesName,
          breedName,
        }),
      });

      if (response.ok) {
        showNotification("Pet added successfully!", "success");
        setTimeout(() => router.push("/profile"), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to add pet",
          "error"
        );
      }
    } catch (err) {
      console.error("Error adding pet:", err);
      showNotification(
        "An error occurred while adding the pet",
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
          Back to Profile
        </button>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Add New Pet
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Age */}
            <div>
              <label
                htmlFor="age"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Age *
              </label>
              <input
                id="age"
                type="number"
                min="0"
                max="999"
                step="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
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

            {/* Images */}
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
                    <IconPhoto
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
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

            {/* Species Name */}
            <div>
              <label
                htmlFor="speciesName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Species Name *
              </label>
              <div className="relative">
                <IconPaw
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  id="speciesName"
                  type="text"
                  value={speciesName}
                  onChange={(e) => setSpeciesName(e.target.value)}
                  placeholder="e.g., Dog"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Breed Name */}
            <div>
              <label
                htmlFor="breedName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Breed Name *
              </label>
              <div className="relative">
                <IconHash
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  id="breedName"
                  type="text"
                  value={breedName}
                  onChange={(e) => setBreedName(e.target.value)}
                  placeholder="e.g., Labrador"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              Create Pet Profile
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
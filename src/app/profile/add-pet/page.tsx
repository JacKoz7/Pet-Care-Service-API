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
  IconUpload,
  IconTrash,
  IconHash,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import Image from "next/image";

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

export default function AddPet() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [speciesName, setSpeciesName] = useState("");
  const [breedName, setBreedName] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    setIsLoading(false);
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
          `pets/${user!.uid}/${Date.now()}_${img.file.name}`
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
    if (!name.trim()) return "Name is required";
    if (
      !age ||
      isNaN(parseFloat(age)) ||
      parseFloat(age) < 0 ||
      parseFloat(age) > 999
    )
      return "Age must be a number between 0 and 999";
    if (images.length === 0) return "At least one image is required";
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
      const uploadedImages = await uploadImages();
      if (uploadedImages.length !== images.length) {
        throw new Error("Failed to upload all images");
      }

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
          images: uploadedImages,
          speciesName,
          breedName,
        }),
      });

      if (response.ok) {
        showNotification("Pet added successfully!", "success");
        setTimeout(() => router.push("/profile"), 1500);
      } else {
        const errData = await response.json();
        showNotification(errData.error || "Failed to add pet", "error");
      }
    } catch (err) {
      console.error("Error adding pet:", err);
      showNotification("An error occurred while adding the pet", "error");
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Add New Pet</h1>

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

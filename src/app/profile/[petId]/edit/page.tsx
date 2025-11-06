// app/profile/[petId]/edit/page.tsx
"use client";

import { auth } from "../../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconUpload,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../firebase";
import Image from "next/image";

interface PetDetails {
  id: number;
  name: string;
  age: number;
  description: string | null;
  species: string;
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

interface ImageFile {
  file?: File;
  url: string;
  preview?: string;
  isUploading?: boolean;
  order: number;
}

interface Species {
  idSpiece: number;
  name: string;
}

export default function EditPet() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const [pet, setPet] = useState<PetDetails | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [customSpecies, setCustomSpecies] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

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
            clientIds: rolesData.clientIds || [],
          });
        } else {
          console.warn(
            "Failed to fetch user roles:",
            await rolesResponse.text()
          );
          setUserRoles({ roles: [], clientIds: [] });
        }

        // Fetch species list
        const speciesResponse = await fetch("/api/pets/species");
        if (speciesResponse.ok) {
          const speciesData = await speciesResponse.json();
          setSpeciesList(speciesData.species || []);
        }

        // Pre-fill form
        setName(petData.pet.name);
        setAge(petData.pet.age.toString());
        setDescription(petData.pet.description || "");
        setSelectedSpecies(petData.pet.species);
        setImages(
          petData.pet.images.map(
            (
              img: { imageUrl: string; order: number | null },
              index: number
            ) => ({
              url: img.imageUrl,
              order: img.order || index + 1,
            })
          )
        );
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
  }, [user, router, petId]);

  // Check if user owns the pet
  useEffect(() => {
    if (pet && userRoles && userRoles.clientIds.length === 0) {
      showNotification(
        "You are not authorized to edit this pet profile.",
        "error"
      );
      router.push(`/profile/${petId}`);
    }
  }, [pet, userRoles, router, petId]);

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
    if (selectedSpecies !== "Inne" && !selectedSpecies)
      return "Species is required";
    if (selectedSpecies === "Inne" && !customSpecies.trim())
      return "Custom species name is required";
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

      const speciesName =
        selectedSpecies === "Inne" ? customSpecies : selectedSpecies;

      const token = await user!.getIdToken();
      const response = await fetch(`/api/pets/${petId}`, {
        method: "PUT",
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
        }),
      });

      if (response.ok) {
        showNotification("Pet profile updated successfully!", "success");
        setTimeout(() => router.push(`/profile/${petId}`), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to update pet profile",
          "error"
        );
      }
    } catch (err) {
      console.error("Error updating pet:", err);
      showNotification(
        "An error occurred while updating the pet profile",
        "error"
      );
    }
  };

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBack = () => {
    router.push(`/profile/${petId}`);
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
        <button
          onClick={handleBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <IconArrowLeft size={20} className="mr-2" />
          Back to Pet Profile
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Edit Pet Profile
          </h1>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

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

            {/* Species Selection */}
            <div>
              <label
                htmlFor="selectedSpecies"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Species *
              </label>
              <select
                id="selectedSpecies"
                value={selectedSpecies}
                onChange={(e) => {
                  setSelectedSpecies(e.target.value);
                  if (e.target.value !== "Inne") setCustomSpecies("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select species</option>
                {speciesList.map((sp) => (
                  <option key={sp.idSpiece} value={sp.name}>
                    {sp.name}
                  </option>
                ))}
              </select>
              {selectedSpecies === "Inne" && (
                <input
                  type="text"
                  value={customSpecies}
                  onChange={(e) => setCustomSpecies(e.target.value)}
                  placeholder="Enter custom species name"
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              Update Pet Profile
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

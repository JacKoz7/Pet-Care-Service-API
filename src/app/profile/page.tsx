// app/profile/page.tsx
"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { useEffect, useState, useCallback } from "react";
import {
  IconArrowLeft,
  IconEdit,
  IconPaw,
  IconUser,
  IconMapPin,
  IconPhone,
  IconMail,
  IconCalendar,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

interface UserData {
  id: number;
  firebaseUid: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  city: {
    idCity: number;
    name: string;
    imageUrl: string;
  } | null;
  isAdmin: boolean;
  isServiceProvider: boolean;
  lastActive: string;
  profilePictureUrl: string | null;
}

interface City {
  idCity: number;
  name: string;
}

interface Pet {
  id: number;
  name: string;
  age: number;
  keyImage: string | null;
  species: string;
  isHealthy: boolean | null;
}

export default function Profile() {
  const { user: contextUser, token, loading: contextLoading } = useAuth();
  const [firebaseUser] = useAuthState(auth);
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    cityId: "",
  });
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!firebaseUser) {
      setRoles(["client"]);
      return;
    }

    try {
      const roleToken = await firebaseUser.getIdToken();
      const response = await fetch("/api/user/check-role", {
        headers: {
          Authorization: `Bearer ${roleToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || ["client"]);
      } else {
        setRoles(["client"]);
      }
    } catch (err) {
      console.error("Error fetching roles in Profile:", err);
      setRoles(["client"]);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!contextUser || !token) {
      router.push("/sign-in");
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setUserData(data.user);
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            phoneNumber: data.user.phoneNumber || "",
            cityId: data.user.city ? String(data.user.city.idCity) : "",
          });
        } else {
          setError(data.error || "Failed to fetch user data");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("An error occurred while fetching user data");
      }
    };

    const fetchCities = async () => {
      try {
        const response = await fetch("/api/cities");
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };

    const fetchPets = async () => {
      setPetsLoading(true);
      try {
        const response = await fetch("/api/pets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setPets(data.pets || []);
        } else {
          setPetsError(data.error || "Failed to fetch pets");
        }
      } catch (err) {
        console.error("Error fetching pets:", err);
        setPetsError("An error occurred while fetching pets");
      } finally {
        setPetsLoading(false);
      }
    };

    fetchUserData();
    fetchCities();
    fetchRoles();
    fetchPets();
  }, [contextUser, token, router, fetchRoles]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (
      formData.phoneNumber &&
      (formData.phoneNumber.length !== 9 || !/^\d+$/.test(formData.phoneNumber))
    ) {
      setError("Phone number must be exactly 9 digits");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setError("");
      setSuccess("");
      const response = await fetch("/api/user/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          cityId: formData.cityId ? Number(formData.cityId) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUserData(data.user);
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("An error occurred while updating profile");
    }
  };

  const handleDeleteAccount = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action is permanent and will remove all your data, including pets, advertisements, and bookings."
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSuccess("Account deleted successfully. Redirecting...");
        await auth.signOut();
        setTimeout(() => router.push("/sign-in"), 2000);
      } else {
        setError(data.error || "Failed to delete account");
      }
    } catch (err) {
      console.error("Error deleting account:", err);
      setError("An error occurred while deleting the account");
    }
  }, [token, router]);

  const handleDeleteProfilePicture = useCallback(async () => {
    if (
      !window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      const response = await fetch("/api/user/profile-picture", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUserData((prev) =>
          prev ? { ...prev, profilePictureUrl: null } : null
        );
        setSuccess("Profile picture removed successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to remove profile picture");
      }
    } catch (err) {
      console.error("Error deleting profile picture:", err);
      setError("An error occurred while deleting the profile picture");
    }
  }, [token]);

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-blue-600 text-xl font-medium">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              onClick={() => router.push("/")}
              className="flex items-center text-indigo-600 hover:text-indigo-800 transition-all duration-300 hover:-translate-x-1 mr-6"
            >
              <IconArrowLeft size={24} className="mr-2" />
              Back
            </button>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Your Profile
            </h1>
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-white">
            <p className="text-gray-600 text-sm">
              Welcome back, {userData?.firstName || "User"}!
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Data Section */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white transition-all duration-300 hover:shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center">
                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                  <IconUser className="text-indigo-600" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Personal Information
                </h2>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-all duration-300 hover:scale-105 text-sm"
              >
                <IconEdit size={18} className="mr-1" />
                {isEditing ? "Cancel" : "Edit Info"}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    className="w-full px-4 py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    className="w-full px-4 py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Phone Number (9 digits)"
                    maxLength={9}
                    className="w-full px-4 py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    name="cityId"
                    value={formData.cityId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  >
                    <option value="">Select City (Optional)</option>
                    {cities.map((city) => (
                      <option key={city.idCity} value={city.idCity}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none disabled:shadow-lg text-base"
                  disabled={
                    !formData.firstName &&
                    !formData.lastName &&
                    !formData.phoneNumber &&
                    !formData.cityId
                  }
                >
                  Save Changes
                </button>
              </div>
            ) : userData ? (
              <div className="space-y-3 text-gray-700 animate-fade-in">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
                    {userData.profilePictureUrl ? (
                      <Image
                        src={userData.profilePictureUrl}
                        alt="Profile picture"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <IconUser className="text-gray-400" size={64} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                    <label
                      htmlFor="profile-picture"
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg text-sm cursor-pointer flex-1 text-center ${
                        uploading
                          ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {uploading
                        ? "Uploading..."
                        : userData.profilePictureUrl
                        ? "Change Profile Picture"
                        : "Set Profile Picture"}
                      <input
                        id="profile-picture"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const selectedFile = e.target.files?.[0];
                          if (!selectedFile) return;
                          setUploading(true);
                          const formData = new FormData();
                          formData.append("image", selectedFile);
                          try {
                            const endpoint = "/api/user/profile-picture";
                            const method = userData.profilePictureUrl
                              ? "PATCH"
                              : "POST";
                            const res = await fetch(endpoint, {
                              method,
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData,
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setUserData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      profilePictureUrl: data.profilePictureUrl,
                                    }
                                  : null
                              );
                              setSuccess(
                                "Profile picture updated successfully!"
                              );
                              setTimeout(() => setSuccess(""), 3000);
                            } else {
                              const errData = await res.json();
                              setError(
                                errData.error || "Failed to upload picture"
                              );
                            }
                          } catch (err) {
                            console.error("Upload error:", err);
                            setError("An error occurred while uploading");
                          } finally {
                            setUploading(false);
                            e.target.value = ""; // Reset input
                          }
                        }}
                      />
                    </label>
                    {userData.profilePictureUrl && (
                      <button
                        onClick={handleDeleteProfilePicture}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-300 shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-1"
                      >
                        <IconTrash size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <IconMail className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-base font-medium text-gray-900">
                      {userData.email}
                    </p>
                  </div>
                </div>

                {userData.firstName && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                    <IconUser className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">First Name</p>
                      <p className="text-base font-medium text-gray-900">
                        {userData.firstName}
                      </p>
                    </div>
                  </div>
                )}

                {userData.lastName && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                    <IconUser className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Last Name</p>
                      <p className="text-base font-medium text-gray-900">
                        {userData.lastName}
                      </p>
                    </div>
                  </div>
                )}

                {userData.phoneNumber && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                    <IconPhone className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="text-base font-medium text-gray-900">
                        {userData.phoneNumber}
                      </p>
                    </div>
                  </div>
                )}

                {userData.city && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                    <IconMapPin className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">City</p>
                      <p className="text-base font-medium text-gray-900">
                        {userData.city.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <div className="bg-indigo-100 p-1 rounded-full mr-3">
                    <svg
                      className="h-4 w-4 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-base font-medium text-gray-900">
                      {userData.isAdmin
                        ? "Admin"
                        : roles.includes("service_provider")
                        ? "Service Provider"
                        : "Client"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <IconCalendar className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(userData.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>

                {userData && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl text-base"
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pet Profiles Section - Updated with borders and add button */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white transition-all duration-300 hover:shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center">
                <div className="bg-amber-100 p-2 rounded-full mr-3">
                  <IconPaw className="text-amber-600" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Pet Profiles
                </h2>
              </div>
              <Link
                href="/profile/add-pet"
                className="flex items-center text-amber-600 hover:text-amber-800 font-medium transition-all duration-300 hover:scale-105 text-sm"
              >
                <IconPlus size={18} className="mr-1" />
                Add Pet
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-4 italic text-center">
              Zachęć usługodawców do opieki nad twoim zwierzęciem, wykonując
              sprawdzanie jego zdrowia.
            </p>

            {petsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : petsError ? (
              <div className="text-center py-8 text-red-600">{petsError}</div>
            ) : pets.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-grow py-8 animate-pulse">
                <div className="inline-flex items-center justify-center bg-amber-100 w-16 h-16 rounded-full mb-4">
                  <IconPaw className="text-amber-500" size={28} />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No pet profiles yet
                </h3>
                <p className="text-gray-500 text-sm mb-5 text-center">
                  Add your furry friends to get started!
                </p>
                <Link
                  href="/profile/add-pet"
                  className="bg-amber-500 text-white px-5 py-2 rounded-xl font-medium hover:bg-amber-600 transition-colors duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-lg text-sm"
                >
                  Add Your First Pet
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2">
                {pets.map((pet) => (
                  <Link
                    key={pet.id}
                    href={`/profile/${pet.id}`}
                    className="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:bg-gray-100 border-2 border-gray-200 hover:border-amber-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0">
                        <Image
                          src={pet.keyImage || "/placeholder-pet.jpg"}
                          alt={pet.name}
                          fill
                          className="object-cover rounded-lg border-2 border-amber-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 mb-1 truncate">
                          {pet.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          Species: {pet.species}
                        </p>
                        <p className="text-sm text-gray-600">Age: {pet.age}</p>
                        {/* NOWOŚĆ: Label jeśli isHealthy true */}
                        {pet.isHealthy === true && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Zwierzę jest zdrowe
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center bg-amber-100 w-8 h-8 rounded-full">
                        <IconEdit className="text-amber-600" size={16} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

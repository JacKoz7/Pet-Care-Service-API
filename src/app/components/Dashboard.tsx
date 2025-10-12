// src/app/dashboard/page.tsx
"use client";

import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  IconPaw,
  IconSearch,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
  IconStar,
  IconBug,
  IconUser,
  IconFileText,
  IconClock,
  IconList,
  IconActivity,
} from "@tabler/icons-react";

interface City {
  idCity: number;
  name: string;
  imageUrl: string;
}

interface Advertisement {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  serviceStartTime?: string;
  serviceEndTime?: string;
  keyImage: string | null;
  city: City;
}

interface UserRoles {
  isAdmin: boolean;
  isServiceProvider: boolean;
  isClient: boolean;
}

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [latestAds, setLatestAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoles, setUserRoles] = useState<UserRoles>({
    isAdmin: false,
    isServiceProvider: false,
    isClient: true,
  });
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchUserRoles = useCallback(async () => {
    if (!user) {
      setIsLoadingRole(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/user/check-role", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRoles({
          isAdmin: data.roles?.includes("admin") || false,
          isServiceProvider: data.roles?.includes("service_provider") || false,
          isClient: true,
        });
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
    } finally {
      setIsLoadingRole(false);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchCities(), fetchLatestAds()]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    fetchUserRoles();
  }, [user, fetchUserRoles]);

  const fetchCities = async () => {
    try {
      const response = await fetch("/api/cities");
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchLatestAds = async () => {
    try {
      const response = await fetch("/api/advertisements/latest");
      const data = await response.json();
      setLatestAds(data.advertisements || []);
    } catch (error) {
      console.error("Error fetching latest advertisements:", error);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const toggleServiceProviderRole = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const endpoint = userRoles.isServiceProvider
        ? "/api/service-provider/unbecome"
        : "/api/service-provider/become";

      const method = userRoles.isServiceProvider ? "DELETE" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        await fetchUserRoles();
        const action = userRoles.isServiceProvider
          ? "removed from"
          : "added to";
        alert(`Service provider role ${action} successfully!`);
      } else {
        const errorData = await response.json();
        alert(
          `Error: ${
            errorData.error || "Failed to update service provider role"
          }`
        );
      }
    } catch (error) {
      console.error("Error updating service provider role:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleDebugJWT = async () => {
    if (!user) {
      console.log("No user logged in");
      return;
    }

    try {
      const token = await user.getIdToken();
      console.log("JWT Token:", token);
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log("JWT Payload:", payload);
      alert("JWT token logged to console. Check developer tools.");
    } catch (error) {
      console.error("Error getting JWT token:", error);
    }
  };

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAds = latestAds.filter((ad) =>
    ad.city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewAd = (adId: number) => {
    router.push(`/advertisements/${adId}`);
  };

  const handleMyAds = () => {
    router.push("/my-advertisements");
  };

  const handleViewAllAds = () => {
    router.push("/advertisements/all");
  };

  const handleExploreCity = (cityId: number) => {
    router.push(`/advertisements/all?cityId=${cityId}`);
  };

  const handleDiagnosePet = () => {
    router.push("/diagnose");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Role Management Buttons */}
        <div className="mb-10 text-center relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col space-y-2">
              {user && !isLoadingRole && (
                <button
                  onClick={toggleServiceProviderRole}
                  className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
                    userRoles.isServiceProvider
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
                  }`}
                >
                  <IconStar size={18} className="mr-2" />
                  {userRoles.isServiceProvider
                    ? "Switch to Client"
                    : "Become Service Provider"}
                </button>
              )}
              {user && !isLoadingRole && (
                <button
                  onClick={handleDebugJWT}
                  className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                  title="Log JWT token to console (developer tool)"
                >
                  <IconBug size={18} className="mr-2" />
                  Debug JWT
                </button>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              {user && !isLoadingRole && (
                <button
                  onClick={handleMyAds}
                  className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                >
                  <IconFileText size={18} className="mr-2" />
                  My Advertisements
                </button>
              )}
              <button
                onClick={handleViewAllAds}
                className="flex items-center bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                <IconList size={18} className="mr-2" />
                View All Advertisements
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            Welcome to Pet Care Service!
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {user ? (
              <>
                Hello,{" "}
                <span className="font-semibold text-indigo-600">
                  {user.email}
                </span>
                ! Explore pet care services in various cities.
              </>
            ) : (
              "Explore pet care services in various cities. Sign in to manage your bookings!"
            )}
          </p>

          {user && (
            <div className="mt-4 flex justify-center space-x-2">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <IconUser size={14} className="mr-1" />
                Client
              </div>
              {userRoles.isServiceProvider && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <IconStar size={14} className="mr-1" />
                  Service Provider
                </div>
              )}
              {userRoles.isAdmin && (
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Administrator
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white">
          <div className="flex items-center max-w-2xl mx-auto">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Cities Section */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <IconMapPin className="text-indigo-500 mr-2" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Available Cities
              </h2>
            </div>
            {filteredCities.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={scrollLeft}
                  className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-white text-indigo-600 hover:text-indigo-800 transition-all duration-300 hover:scale-110"
                  aria-label="Scroll left"
                >
                  <IconChevronLeft size={20} />
                </button>
                <button
                  onClick={scrollRight}
                  className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-white text-indigo-600 hover:text-indigo-800 transition-all duration-300 hover:scale-110"
                  aria-label="Scroll right"
                >
                  <IconChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-indigo-600 text-lg font-medium">
                  Loading cities...
                </p>
              </div>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white">
              <div className="inline-flex items-center justify-center bg-indigo-100 w-16 h-16 rounded-full mb-4">
                <IconMapPin className="text-indigo-500" size={28} />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No cities found
              </h3>
              <p className="text-gray-500">Try adjusting your search query</p>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto scrollbar-hide space-x-6 pb-6 -mx-4 px-4"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {filteredCities.map((city) => (
                  <div
                    key={city.idCity}
                    className="flex-none w-80 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={city.imageUrl}
                        alt={city.name}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4">
                        <h3 className="text-xl font-semibold text-white">
                          {city.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm mb-4">
                        Discover pet care services in {city.name}
                      </p>
                      <button
                        onClick={() => handleExploreCity(city.idCity)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg text-sm"
                      >
                        Explore Services
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Latest Advertisements Section */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <IconPaw className="text-amber-500 mr-2" size={24} />
            <h2 className="text-2xl font-semibold text-gray-800">
              Latest Advertisements
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-amber-600 text-lg font-medium">
                  Loading advertisements...
                </p>
              </div>
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white">
              <div className="inline-flex items-center justify-center bg-amber-100 w-16 h-16 rounded-full mb-4">
                <IconPaw className="text-amber-500" size={28} />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                No advertisements found
              </h3>
              <p className="text-gray-500">Try searching for a city</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={ad.keyImage || "/placeholder-pet.jpg"}
                      alt={ad.title}
                      width={400}
                      height={192}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-white font-semibold text-sm truncate">
                        {ad.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <IconMapPin className="mr-1" size={14} />
                      {ad.city.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-3 space-y-1">
                      <p>
                        Starts:{" "}
                        <span className="font-medium">
                          {new Date(ad.startDate).toLocaleDateString()}
                        </span>
                      </p>
                      {ad.endDate && (
                        <p>
                          Ends:{" "}
                          <span className="font-medium">
                            {new Date(ad.endDate).toLocaleDateString()}
                          </span>
                        </p>
                      )}
                      {(ad.serviceStartTime || ad.serviceEndTime) && (
                        <div className="flex items-center">
                          <IconClock className="mr-1" size={14} />
                          <span className="font-medium">
                            Service hours: {ad.serviceStartTime} -{" "}
                            {ad.serviceEndTime}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewAd(ad.id)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnose Pet Button - Only for logged-in users */}
        {user && (
          <div className="mb-8 text-center">
            <button
              onClick={handleDiagnosePet}
              className="flex items-center justify-center mx-auto bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl"
            >
              <IconActivity size={24} className="mr-3" />
              Diagnose Pet
            </button>
          </div>
        )}

        {/* Features Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white">
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">
            Why Choose Our Service?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-indigo-50 rounded-2xl transition-all duration-300 hover:bg-indigo-100">
              <div className="inline-flex items-center justify-center bg-indigo-100 w-16 h-16 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Trusted Professionals
              </h3>
              <p className="text-gray-600 text-sm">
                All our service providers are verified and experienced with
                pets.
              </p>
            </div>
            <div className="text-center p-6 bg-amber-50 rounded-2xl transition-all duration-300 hover:bg-amber-100">
              <div className="inline-flex items-center justify-center bg-amber-100 w-16 h-16 rounded-full mb-4">
                <IconPaw className="text-amber-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Wide Range of Services
              </h3>
              <p className="text-gray-600 text-sm">
                From grooming to walking, we offer everything your pet needs.
              </p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-2xl transition-all duration-300 hover:bg-purple-100">
              <div className="inline-flex items-center justify-center bg-purple-100 w-16 h-16 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Available 24/7
              </h3>
              <p className="text-gray-600 text-sm">
                Book services anytime, anywhere with our easy-to-use platform.
              </p>
            </div>
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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

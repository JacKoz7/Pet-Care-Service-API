// src/app/advertisements/all/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  IconPaw,
  IconSearch,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
} from "@tabler/icons-react";

interface City {
  idCity: number;
  name: string;
  imageUrl: string | null;
}

interface Advertisement {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  keyImage: string | null;
  city: City;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdvertisementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCityId, setSelectedCityId] = useState<number | null>(
    searchParams.get("cityId") ? parseInt(searchParams.get("cityId")!) : null
  );
  const [pagination, setPagination] = useState<Pagination>({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "10"),
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCities = useCallback(async () => {
    try {
      const response = await fetch("/api/cities");
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  }, []);

  const fetchAdvertisements = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCityId && { cityId: selectedCityId.toString() }),
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      }).toString();

      const response = await fetch(`/api/advertisements/all?${query}`);
      const data = await response.json();
      if (data.success) {
        setAdvertisements(data.advertisements || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Error fetching advertisements:", error);
    }
  }, [searchQuery, selectedCityId, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchCities(), fetchAdvertisements()]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchCities, fetchAdvertisements]);

  const handleViewAd = (adId: number) => {
    router.push(`/advertisements/${adId}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      router.push(
        `/advertisements/all?${new URLSearchParams({
          ...(searchQuery && { search: searchQuery }),
          ...(selectedCityId && { cityId: selectedCityId.toString() }),
          page: newPage.toString(),
          pageSize: pagination.pageSize.toString(),
        }).toString()}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-8 text-center">
          All Pet Care Advertisements
        </h1>

        {/* Search and Filter Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white">
          <div className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by advertisement title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  router.push(
                    `/advertisements/all?${new URLSearchParams({
                      search: e.target.value,
                      ...(selectedCityId && {
                        cityId: selectedCityId.toString(),
                      }),
                      page: "1",
                      pageSize: pagination.pageSize.toString(),
                    }).toString()}`
                  );
                }}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 transition-all duration-300"
              />
            </div>
            <select
              value={selectedCityId || ""}
              onChange={(e) => {
                const cityId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedCityId(cityId);
                router.push(
                  `/advertisements/all?${new URLSearchParams({
                    ...(searchQuery && { search: searchQuery }),
                    ...(cityId && { cityId: cityId.toString() }),
                    page: "1",
                    pageSize: pagination.pageSize.toString(),
                  }).toString()}`
                );
              }}
              className="w-full sm:w-48 py-3 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 transition-all duration-300"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city.idCity} value={city.idCity}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advertisements Section */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-amber-600 text-lg font-medium">
                Loading advertisements...
              </p>
            </div>
          </div>
        ) : advertisements.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white">
            <div className="inline-flex items-center justify-center bg-amber-100 w-16 h-16 rounded-full mb-4">
              <IconPaw className="text-amber-500" size={28} />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No advertisements found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or city filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advertisements.map((ad) => (
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-white text-indigo-600 hover:text-indigo-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <IconChevronLeft size={20} />
            </button>
            <span className="text-gray-700 font-medium">
              Page {pagination.page} of {pagination.totalPages} (
              {pagination.total} ads)
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-white text-indigo-600 hover:text-indigo-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <IconChevronRight size={20} />
            </button>
          </div>
        )}
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

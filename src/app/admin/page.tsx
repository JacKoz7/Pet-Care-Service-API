// src/app/admin/page.tsx
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconTrash,
  IconSearch,
  IconUsers,
  IconFileText,
  IconPaw,
} from "@tabler/icons-react";
import Image from "next/image";
import { IconMapPin, IconClock } from "@tabler/icons-react";

interface User {
  id: number;
  firebaseUid: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  city: {
    idCity: number;
    name: string;
    imageUrl: string | null;
  };
  isAdmin: boolean;
  isServiceProvider: boolean;
  lastActive: string | null;
}

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

interface PetAdmin {
  id: number;
  name: string;
  age: number;
  description: string | null;
  species: string;
  breed: string;
  keyImage: string | null;
  owner: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  isHealthy: boolean | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AdsResponse {
  success: boolean;
  advertisements: Advertisement[];
  pagination: Pagination;
}

interface PetsResponse {
  success: boolean;
  pets: PetAdmin[];
  pagination: Pagination;
}

export default function AdminPanel() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users"); // "users", "ads", or "pets"
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adsPagination, setAdsPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [pets, setPets] = useState<PetAdmin[]>([]);
  const [petsPagination, setPetsPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [usersSearch, setUsersSearch] = useState("");
  const [adsSearch, setAdsSearch] = useState("");
  const [petsSearch, setPetsSearch] = useState("");
  const [usersLimit] = useState(10);
  const [usersOffset, setUsersOffset] = useState(0);
  const [adsPage, setAdsPage] = useState(1);
  const [adsPageSize] = useState(10);
  const [petsPage, setPetsPage] = useState(1);
  const [petsPageSize] = useState(10);

  useEffect(() => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "ads") {
      fetchAds();
    } else if (activeTab === "pets") {
      fetchPets();
    }
  }, [
    user,
    activeTab,
    usersSearch,
    usersOffset,
    adsSearch,
    adsPage,
    petsSearch,
    petsPage,
  ]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(
          usersSearch
        )}&limit=${usersLimit}&offset=${usersOffset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
      } else {
        console.error("Failed to fetch users");
        if (response.status === 403) {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/advertisements/all?search=${encodeURIComponent(
          adsSearch
        )}&page=${adsPage}&pageSize=${adsPageSize}`
      );

      if (response.ok) {
        const data: AdsResponse = await response.json();
        setAds(data.advertisements || []);
        setAdsPagination(
          data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 }
        );
      } else {
        console.error("Failed to fetch ads");
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPets = async () => {
    setIsLoading(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch(
        `/api/admin/pets?search=${encodeURIComponent(
          petsSearch
        )}&page=${petsPage}&pageSize=${petsPageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data: PetsResponse = await response.json();
        setPets(data.pets || []);
        setPetsPagination(
          data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 }
        );
      } else {
        console.error("Failed to fetch pets");
        if (response.status === 403) {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (firebaseUid: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = await user!.getIdToken();
      const response = await fetch(`/api/admin/${firebaseUid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("User deleted successfully");
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to delete user"}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    try {
      const token = await user!.getIdToken();
      const response = await fetch(`/api/admin/advertisements/${adId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("Advertisement deleted successfully");
        fetchAds();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to delete advertisement"}`);
      }
    } catch (error) {
      console.error("Error deleting advertisement:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleDeletePet = async (petId: number) => {
    if (!confirm("Are you sure you want to delete this pet?")) return;

    try {
      const token = await user!.getIdToken();
      const response = await fetch(`/api/admin/pets/${petId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("Pet deleted successfully");
        fetchPets();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to delete pet"}`);
      }
    } catch (error) {
      console.error("Error deleting pet:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleUsersSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersOffset(0);
    fetchUsers();
  };

  const handleAdsSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAdsPage(1);
    fetchAds();
  };

  const handlePetsSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPetsPage(1);
    fetchPets();
  };

  const nextUsersPage = () => {
    if (usersOffset + usersLimit < totalUsers) {
      setUsersOffset(usersOffset + usersLimit);
    }
  };

  const prevUsersPage = () => {
    if (usersOffset > 0) {
      setUsersOffset(usersOffset - usersLimit);
    }
  };

  const nextAdsPage = () => {
    if (adsPage < adsPagination.totalPages) {
      setAdsPage(adsPage + 1);
    }
  };

  const prevAdsPage = () => {
    if (adsPage > 1) {
      setAdsPage(adsPage - 1);
    }
  };

  const nextPetsPage = () => {
    if (petsPage < petsPagination.totalPages) {
      setPetsPage(petsPage + 1);
    }
  };

  const prevPetsPage = () => {
    if (petsPage > 1) {
      setPetsPage(petsPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600 border-b-2"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <IconUsers size={20} className="inline mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("ads")}
            className={`px-4 py-2 font-medium ${
              activeTab === "ads"
                ? "border-indigo-500 text-indigo-600 border-b-2"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <IconFileText size={20} className="inline mr-2" />
            Advertisements
          </button>
          <button
            onClick={() => setActiveTab("pets")}
            className={`px-4 py-2 font-medium ${
              activeTab === "pets"
                ? "border-indigo-500 text-indigo-600 border-b-2"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <IconPaw size={20} className="inline mr-2" />
            Pets
          </button>
        </div>

        {/* Users Section */}
        {activeTab === "users" && (
          <>
            <form onSubmit={handleUsersSearch} className="mb-6">
              <div className="flex">
                <input
                  type="text"
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r-xl hover:bg-indigo-600 transition"
                >
                  <IconSearch size={20} />
                </button>
              </div>
            </form>

            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white shadow-md rounded-xl overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roles
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.firebaseUid}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            Client
                            {u.isServiceProvider ? ", Service Provider" : ""}
                            {u.isAdmin ? ", Admin" : ""}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.city.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteUser(u.firebaseUid)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <IconTrash size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={prevUsersPage}
                    disabled={usersOffset === 0}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>
                    Showing {usersOffset + 1} -{" "}
                    {Math.min(usersOffset + usersLimit, totalUsers)} of{" "}
                    {totalUsers}
                  </span>
                  <button
                    onClick={nextUsersPage}
                    disabled={usersOffset + usersLimit >= totalUsers}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Advertisements Section */}
        {activeTab === "ads" && (
          <>
            <form onSubmit={handleAdsSearch} className="mb-6">
              <div className="flex">
                <input
                  type="text"
                  value={adsSearch}
                  onChange={(e) => setAdsSearch(e.target.value)}
                  placeholder="Search by title"
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r-xl hover:bg-indigo-600 transition"
                >
                  <IconSearch size={20} />
                </button>
              </div>
            </form>

            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <IconPaw className="text-amber-500 mr-2" size={24} />
                    <h2 className="text-2xl font-semibold text-gray-800">
                      All Advertisements
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ads.map((ad) => (
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
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                router.push(`/advertisements/${ad.id}`)
                              }
                              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleDeleteAd(ad.id)}
                              className="bg-red-500 text-white px-3 py-2 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 text-sm"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={prevAdsPage}
                      disabled={adsPage === 1}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Showing {(adsPage - 1) * adsPageSize + 1} -{" "}
                      {Math.min(adsPage * adsPageSize, adsPagination.total)} of{" "}
                      {adsPagination.total}
                    </span>
                    <button
                      onClick={nextAdsPage}
                      disabled={adsPage >= adsPagination.totalPages}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Pets Section */}
        {activeTab === "pets" && (
          <>
            <form onSubmit={handlePetsSearch} className="mb-6">
              <div className="flex">
                <input
                  type="text"
                  value={petsSearch}
                  onChange={(e) => setPetsSearch(e.target.value)}
                  placeholder="Search by pet name"
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 text-white px-4 py-2 rounded-r-xl hover:bg-indigo-600 transition"
                >
                  <IconSearch size={20} />
                </button>
              </div>
            </form>

            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center mb-6">
                    <IconPaw className="text-amber-500 mr-2" size={24} />
                    <h2 className="text-2xl font-semibold text-gray-800">
                      All Pets
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pets.map((pet) => (
                      <div
                        key={pet.id}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={pet.keyImage || "/placeholder-pet.jpg"}
                            alt={pet.name}
                            width={400}
                            height={192}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <h3 className="text-white font-semibold text-sm truncate">
                              {pet.name}
                            </h3>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="text-sm text-gray-600 mb-2">
                            <p>
                              <span className="font-medium">Species:</span>{" "}
                              {pet.species}
                            </p>
                            <p>
                              <span className="font-medium">Breed:</span>{" "}
                              {pet.breed}
                            </p>
                            <p>
                              <span className="font-medium">Age:</span>{" "}
                              {pet.age}
                            </p>
                            {pet.description && (
                              <p>
                                <span className="font-medium">
                                  Description:
                                </span>{" "}
                                {pet.description}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mb-3">
                            <p>
                              <span className="font-medium">Owner:</span>{" "}
                              {pet.owner.firstName} {pet.owner.lastName}
                            </p>
                            <p>
                              <span className="font-medium">Email:</span>{" "}
                              {pet.owner.email}
                            </p>
                          </div>
                          {pet.isHealthy !== null && (
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${
                                pet.isHealthy
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {pet.isHealthy ? "Healthy" : "Not Healthy"}
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/profile/${pet.id}`)}
                              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-sm"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleDeletePet(pet.id)}
                              className="bg-red-500 text-white px-3 py-2 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 text-sm"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={prevPetsPage}
                      disabled={petsPage === 1}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Showing {(petsPage - 1) * petsPageSize + 1} -{" "}
                      {Math.min(petsPage * petsPageSize, petsPagination.total)}{" "}
                      of {petsPagination.total}
                    </span>
                    <button
                      onClick={nextPetsPage}
                      disabled={petsPage >= petsPagination.totalPages}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

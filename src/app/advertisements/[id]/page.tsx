"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconArrowLeft,
  IconMapPin,
  IconCalendar,
  IconCurrencyDollar,
  IconUser,
  IconPhone,
  IconInfoCircle,
  IconPhoto,
  IconPaw,
  IconClock,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
  IconPencil,
  IconBookmark,
  IconBookmarkOff,
  IconPawFilled,
  IconStarFilled,
  IconMessageCircle2,
} from "@tabler/icons-react";
import BookingForm from "../../components/BookingForm";

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
    averageRating: number;
    totalReviews: number;
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
  species: Array<{
    id: number;
    name: string;
  }>;
}

interface ServiceProviderProfile {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  city: string;
  averageRating: number;
  totalReviews: number;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string | null;
    createdAt: string;
    clientName: string;
  }>;
}

interface UserRoles {
  roles: string[];
  serviceProviderIds: number[];
}

interface SavedAdvertisement {
  id: number;
}

interface Notification {
  message: string;
  type: "info" | "error" | "warning" | "success";
}

export default function AdvertisementDetails() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;

  const [ad, setAd] = useState<AdvertisementDetails | null>(null);
  const [providerProfile, setProviderProfile] =
    useState<ServiceProviderProfile | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isLoadingProvider, setIsLoadingProvider] = useState(false);

  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!adId || isNaN(Number(adId))) {
        setError("Invalid advertisement ID");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const adResponse = await fetch(`/api/advertisements/${adId}`);
        if (!adResponse.ok)
          throw new Error("Failed to fetch advertisement details");
        const adData = await adResponse.json();
        if (!adData.success) throw new Error("Advertisement not found");
        setAd(adData.advertisement);

        if (user) {
          const token = await user.getIdToken();

          const rolesResponse = await fetch("/api/user/check-role", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            setUserRoles({
              roles: rolesData.roles || [],
              serviceProviderIds: rolesData.serviceProviderIds || [],
            });
          }

          const savedResponse = await fetch("/api/advertisements/saved", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (savedResponse.ok) {
            const savedData = await savedResponse.json();
            const savedIds = savedData.advertisements.map(
              (a: SavedAdvertisement) => a.id
            );
            setIsSaved(savedIds.includes(Number(adId)));
          }
        }
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
  }, [adId, user]);

  const fetchProviderProfile = async () => {
    if (!ad?.serviceProviderId) return;

    setIsLoadingProvider(true);
    try {
      const res = await fetch(`/api/service-provider/${ad.serviceProviderId}`);
      if (!res.ok) throw new Error("Failed to load provider profile");
      const data = await res.json();
      if (data.success) {
        setProviderProfile(data.serviceProvider);
      }
    } catch (err) {
      showNotification("Could not load service provider profile", "error");
    } finally {
      setIsLoadingProvider(false);
      setIsProviderModalOpen(true);
    }
  };

  const isOwner =
    user &&
    userRoles &&
    ad &&
    userRoles.serviceProviderIds.includes(ad.serviceProviderId);

  const showNotification = (message: string, type: Notification["type"]) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBack = () => router.back();

  const handleEdit = () => {
    if (!ad || !user) {
      showNotification("Please sign in to edit this advertisement.", "warning");
      return;
    }
    router.push(`/advertisements/${ad.id}/edit`);
  };

  const handleBook = () => {
    if (!user) {
      showNotification("Please sign in to book this service.", "warning");
      return;
    }
    if (isOwner) {
      showNotification("You cannot book your own advertisement.", "error");
      return;
    }
    if (ad?.status !== "ACTIVE") {
      showNotification("You cannot book an inactive advertisement.", "error");
      return;
    }
    setIsBookingOpen(true);
  };

  const handleDelete = async () => {
    if (!user || !isOwner || !ad) return;

    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/advertisements/${ad.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        showNotification("Advertisement deleted successfully!", "success");
        setTimeout(() => router.back(), 1500);
      } else {
        const errData = await response.json();
        showNotification(
          errData.error || "Failed to delete advertisement",
          "error"
        );
      }
    } catch (err) {
      showNotification(
        "An error occurred while deleting the advertisement",
        "error"
      );
    }
  };

  const handleToggleSave = async () => {
    if (!user || !ad) {
      showNotification("Please sign in to save advertisements.", "warning");
      return;
    }

    try {
      const token = await user.getIdToken();
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetch(`/api/advertisements/saved/${ad.id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        showNotification(
          isSaved ? "Removed from saved!" : "Saved successfully!",
          "success"
        );
      } else {
        const errData = await response.json();
        showNotification(errData.error || "Failed to toggle save", "error");
      }
    } catch (err) {
      showNotification("An error occurred while saving", "error");
    }
  };

  const renderStars = (rating: number, size: number = 20) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStarFilled
            key={star}
            size={size}
            className={star <= rating ? "text-yellow-500" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-600 text-lg font-medium">
            Loading advertisement details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-red-100 w-16 h-16 rounded-full mb-4 mx-auto">
            <IconInfoCircle className="text-red-500" size={28} />
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
          Back
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white">
          <div className="relative h-96 overflow-hidden">
            <Image
              src={ad.images[0]?.imageUrl || "/placeholder-pet.jpg"}
              alt={ad.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl font-bold text-white mb-2">{ad.title}</h1>
              <div className="flex items-center text-white/90 mb-1">
                <IconPaw className="mr-2" size={20} />
                <span className="font-medium">{ad.service}</span>
              </div>
              <div className="flex items-center text-white/80">
                <IconMapPin className="mr-1" size={16} />
                <span>{ad.city.name}</span>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Description
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {ad.description || "No description available."}
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <IconCalendar className="text-indigo-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Start Date
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(ad.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {ad.endDate && (
                  <div className="flex items-center">
                    <IconCalendar className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        End Date
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {new Date(ad.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {(ad.serviceStartTime || ad.serviceEndTime) && (
                  <div className="flex items-center">
                    <IconClock className="text-indigo-500 mr-3" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Service Hours
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {ad.serviceStartTime} - {ad.serviceEndTime}
                      </p>
                    </div>
                  </div>
                )}

                {ad.price && (
                  <div className="flex items-center">
                    <IconCurrencyDollar
                      className="text-amber-500 mr-3"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Price</p>
                      <p className="text-lg font-semibold text-gray-800">
                        ${ad.price}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <IconInfoCircle className="text-green-500 mr-3" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        ad.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : ad.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ad.status}
                    </span>
                  </div>
                </div>

                {ad.species.length > 0 && (
                  <div className="flex items-start">
                    <IconPawFilled
                      className="text-purple-500 mr-3 mt-1"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Species
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {ad.species.map((sp) => (
                          <span
                            key={sp.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            {sp.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Service Provider
                </h2>
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-indigo-200 rounded-full flex items-center justify-center overflow-hidden">
                        {providerProfile?.profilePictureUrl ? (
                          <Image
                            src={providerProfile.profilePictureUrl}
                            alt={`${providerProfile.firstName} ${providerProfile.lastName}`}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        ) : (
                          <IconUser className="text-indigo-600" size={32} />
                        )}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-800">
                          {ad.provider.firstName} {ad.provider.lastName}
                        </p>
                        {ad.provider.phoneNumber && (
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <IconPhone size={16} className="mr-1" />
                            {ad.provider.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {ad.provider.totalReviews > 0 ? (
                    <div className="flex items-center space-x-3 mb-4">
                      {renderStars(Math.round(ad.provider.averageRating))}
                      <span className="text-lg font-semibold text-gray-800">
                        {ad.provider.averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({ad.provider.totalReviews} review
                        {ad.provider.totalReviews !== 1 && "s"})
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mb-4">
                      No reviews yet
                    </div>
                  )}

                  <button
                    onClick={fetchProviderProfile}
                    disabled={isLoadingProvider}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {isLoadingProvider ? (
                      "Loading..."
                    ) : (
                      <>
                        <IconUser size={20} />
                        <span>View Full Profile & Reviews</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Gallery
              </h2>
              {ad.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {ad.images.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden"
                    >
                      <Image
                        src={img.imageUrl}
                        alt={`${ad.title} - Image ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
                  <IconPhoto className="text-gray-400 mr-2" size={32} />
                  <span className="text-gray-500">No images available</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 pb-8 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-none bg-gray-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all duration-300"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
              >
                Book Now
              </button>
              {!isOwner && (
                <button
                  onClick={handleToggleSave}
                  className={`flex-1 sm:flex-none ${
                    isSaved
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-green-500 hover:bg-green-600"
                  } text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center`}
                >
                  {isSaved ? (
                    <IconBookmarkOff size={18} className="mr-2" />
                  ) : (
                    <IconBookmark size={18} className="mr-2" />
                  )}
                  {isSaved ? "Unsave" : "Save"}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={handleEdit}
                    className="flex-1 sm:flex-none bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-all duration-300 flex items-center justify-center"
                  >
                    <IconPencil size={18} className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 sm:flex-none bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 flex items-center justify-center"
                  >
                    <IconTrash size={18} className="mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Provider Profile Modal */}
      {isProviderModalOpen && providerProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Service Provider Profile
              </h2>
              <button
                onClick={() => setIsProviderModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={28} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-6 mb-8">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0">
                  {providerProfile.profilePictureUrl ? (
                    <Image
                      src={providerProfile.profilePictureUrl}
                      alt={`${providerProfile.firstName} ${providerProfile.lastName}`}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <IconUser className="w-full h-full text-indigo-600 p-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {providerProfile.firstName} {providerProfile.lastName}
                  </h3>
                  <p className="text-gray-600 flex items-center mt-2">
                    <IconMapPin size={18} className="mr-2" />
                    {providerProfile.city}
                  </p>
                  {providerProfile.phoneNumber && (
                    <p className="text-gray-600 flex items-center mt-2">
                      <IconPhone size={18} className="mr-2" />
                      {providerProfile.phoneNumber}
                    </p>
                  )}
                  {providerProfile.email && (
                    <p className="text-gray-600 mt-2">
                      {providerProfile.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 text-center">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  {renderStars(Math.round(providerProfile.averageRating), 36)}
                </div>
                <p className="text-5xl font-bold text-gray-800">
                  {providerProfile.averageRating.toFixed(1)}
                </p>
                <p className="text-gray-600">
                  based on {providerProfile.totalReviews} review
                  {providerProfile.totalReviews !== 1 && "s"}
                </p>
              </div>

              <div>
                <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <IconMessageCircle2 className="mr-2" />
                  Client Reviews
                </h4>
                {providerProfile.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {providerProfile.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-gray-50 rounded-xl p-5"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {review.clientName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {renderStars(review.rating, 22)}
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mt-2 italic">
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No reviews yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-sm">
          <div
            className={`bg-white rounded-xl shadow-2xl border-l-4 p-4 flex items-start space-x-3 animate-slide-in-right transform transition-all duration-300 ${
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
              <IconCircleCheck
                className="text-green-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "error" && (
              <IconAlertCircle
                className="text-red-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "warning" && (
              <IconAlertCircle
                className="text-yellow-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            {notification.type === "info" && (
              <IconInfoCircle
                className="text-blue-500 mt-0.5 flex-shrink-0"
                size={20}
              />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
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
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}

      {isBookingOpen && ad && (
        <BookingForm
          adId={ad.id}
          serviceProviderId={ad.serviceProviderId}
          providerPhone={ad.provider.phoneNumber}
          adStartDate={ad.startDate}
          adEndDate={ad.endDate}
          adServiceStartTime={ad.serviceStartTime}
          adServiceEndTime={ad.serviceEndTime}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={() =>
            showNotification("Booking created successfully!", "success")
          }
        />
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

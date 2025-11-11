// Zaktualizowany Dashboard.tsx (dodano handleDeleteDiagnosis i prop do DiagnoseSection)

"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { IconAlertCircle, IconRefresh, IconLogout } from "@tabler/icons-react";

import HeaderSection from "./HeaderSection";
import ActionButtons from "./ActionButtons";
import DiagnoseSection from "./DiagnoseSection";
import SearchBar from "./SearchBar";
import CitiesSection from "./CitiesSection";
import AdsSection from "./AdsSection";
import FeaturesSection from "./FeaturesSection";
import NotificationsSection from "./NotificationsSection";
import ClientNotificationsSection from "./ClientNotificationsSection";

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

interface AnalysisSummary {
  idAnalysis: number;
  createdAt: string;
  petName: string;
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
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDiagnoses, setShowDiagnoses] = useState(false);
  const [showProviderNotifications, setShowProviderNotifications] =
    useState(false);
  const [showClientNotifications, setShowClientNotifications] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoles>({
    isAdmin: false,
    isServiceProvider: false,
    isClient: true,
  });
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

      if (!response.ok) {
        if (response.status === 403) {
          setShowVerificationModal(true);
          setIsLoadingRole(false);
          return;
        }
        throw new Error(`Failed to fetch roles: ${response.statusText}`);
      }

      const data = await response.json();
      setUserRoles({
        isAdmin: data.roles?.includes("admin") || false,
        isServiceProvider: data.roles?.includes("service_provider") || false,
        isClient: true,
      });
    } catch (error) {
      console.error("Error fetching user roles:", error);
    } finally {
      setIsLoadingRole(false);
    }
  }, [user]);

  const fetchAnalyses = useCallback(async () => {
    if (!user || !userRoles.isClient) {
      setAnalyses([]);
      return;
    }

    setIsLoadingAnalyses(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/analysis", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const sortedAnalyses = (data.analyses || []).sort(
          (a: AnalysisSummary, b: AnalysisSummary) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAnalyses(sortedAnalyses);
      } else {
        console.error("Failed to fetch analyses");
        setAnalyses([]);
      }
    } catch (error) {
      console.error("Error fetching analyses:", error);
      setAnalyses([]);
    } finally {
      setIsLoadingAnalyses(false);
    }
  }, [user, userRoles.isClient]);

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

  useEffect(() => {
    if (showDiagnoses) {
      fetchAnalyses();
    }
  }, [showDiagnoses, fetchAnalyses]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("payment") === "success") {
      fetchUserRoles();
      alert("Payment successful! You are now a service provider.");
    } else if (query.get("payment") === "cancelled") {
      alert("Payment cancelled. Try again if you want to become a provider.");
    }
  }, [fetchUserRoles]);

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

      if (userRoles.isServiceProvider) {
        const response = await fetch("/api/service-provider/unbecome", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          await fetchUserRoles();
          alert("Powrócono do roli klienta!");
        } else {
          const errorData = await response.json();
          alert(`Błąd: ${errorData.error || "Nie udało się zmienić roli"}`);
        }
      } else {
        const response = await fetch("/api/payments/create-become-session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(
            `Błąd: ${errorData.error || "Nie udało się rozpocząć płatności"}`
          );
          return;
        }

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Nie udało się uzyskać linku do płatności.");
        }
      }
    } catch (error) {
      console.error("Błąd zmiany roli:", error);
      alert("Wystąpił błąd. Spróbuj ponownie.");
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

  const handleViewDiagnosis = (id: number) => {
    router.push(`/diagnose/results/${id}`);
  };

  const handleDeleteDiagnosis = async (id: number) => {
    // Dodano nowy handler
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/analysis/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchAnalyses(); // Odśwież listę po usunięciu
      } else {
        console.error("Failed to delete analysis");
        alert("Nie udało się usunąć diagnozy.");
      }
    } catch (error) {
      console.error("Error deleting analysis:", error);
      alert("Wystąpił błąd podczas usuwania.");
    }
  };

  const handleToggleDiagnoses = () => {
    setShowDiagnoses(!showDiagnoses);
    if (!showDiagnoses) {
      fetchAnalyses();
    }
  };

  const handleToggleProviderNotifications = () => {
    setShowProviderNotifications(!showProviderNotifications);
  };

  const handleToggleClientNotifications = () => {
    setShowClientNotifications(!showClientNotifications);
  };

  const handleResendEmail = async () => {
    if (!user || resendStatus === "sending") return;

    try {
      setResendStatus("sending");
      setErrorMessage(null);
      await sendEmailVerification(user);
      setResendStatus("sent");
      setTimeout(() => setResendStatus("idle"), 3000);
    } catch (error: unknown) {
      console.error("Error resending verification email:", error);
      setResendStatus("error");
      const errorCode = (error as { code?: string }).code;
      setErrorMessage(
        errorCode === "auth/too-many-requests"
          ? "Too many requests. Please wait a few minutes."
          : "Something went wrong. Please try again."
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Error logging out. Please try again.");
    }
    setShowVerificationModal(false);
  };

  const VerificationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 relative animate-fadeIn">
        <div className="text-center">
          <IconAlertCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Verify Your Email
          </h2>
          <p className="text-gray-600 mb-6">
            Your email is not verified. Please check your inbox (including spam)
            and click the verification link.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            We&apos;ve sent a verification email to{" "}
            <span className="font-semibold">{user?.email}</span>.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResendEmail}
              disabled={resendStatus === "sending"}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-600 disabled:opacity-50"
            >
              <IconRefresh size={18} />
              {resendStatus === "sending"
                ? "Sending..."
                : resendStatus === "sent"
                ? "Sent!"
                : "Resend Email"}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-2 rounded-md font-bold hover:bg-red-600"
            >
              <IconLogout size={18} />
              Logout
            </button>

            {errorMessage && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <HeaderSection
            user={user}
            userRoles={userRoles}
            isLoadingRole={isLoadingRole}
          />
          <ActionButtons
            user={user}
            userRoles={userRoles}
            isLoadingRole={isLoadingRole}
            onToggleServiceProvider={toggleServiceProviderRole}
            onDebugJWT={handleDebugJWT}
            onMyAds={handleMyAds}
            onViewAllAds={handleViewAllAds}
            onToggleDiagnoses={handleToggleDiagnoses}
            showDiagnoses={showDiagnoses}
            onToggleProviderNotifications={handleToggleProviderNotifications}
            showProviderNotifications={showProviderNotifications}
            onToggleClientNotifications={handleToggleClientNotifications}
            showClientNotifications={showClientNotifications}
          />
          <DiagnoseSection
            user={user}
            onDiagnosePet={handleDiagnosePet}
            showDiagnoses={showDiagnoses}
            onToggleDiagnoses={handleToggleDiagnoses}
            analyses={analyses}
            isLoadingAnalyses={isLoadingAnalyses}
            onViewDiagnosis={handleViewDiagnosis}
            onDeleteDiagnosis={handleDeleteDiagnosis} // Dodano prop
          />
          <NotificationsSection
            showNotifications={showProviderNotifications}
            onToggleNotifications={handleToggleProviderNotifications}
            userRoles={userRoles}
          />
          <ClientNotificationsSection
            showNotifications={showClientNotifications}
            onToggleNotifications={handleToggleClientNotifications}
            userRoles={userRoles}
          />
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <CitiesSection
            filteredCities={filteredCities}
            isLoading={isLoading}
            onExploreCity={handleExploreCity}
            carouselRef={carouselRef}
            onScrollLeft={scrollLeft}
            onScrollRight={scrollRight}
          />
          <AdsSection
            filteredAds={filteredAds}
            isLoading={isLoading}
            onViewAd={handleViewAd}
          />
          <FeaturesSection />
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
          .animate-fadeIn {
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

      {showVerificationModal && <VerificationModal />}
    </>
  );
}

// src/app/dashboard/page.tsx
"use client";

import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

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

  const handleViewDiagnosis = (id: number) => {
    router.push(`/diagnose/results/${id}`);
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

  return (
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
        <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
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

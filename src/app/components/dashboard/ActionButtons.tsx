// src/app/components/ActionButtons.tsx
import { User } from "firebase/auth";
import {
  IconStar,
  IconBug,
  IconFileText,
  IconList,
  IconUserShield,
  IconBell,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface UserRoles {
  isAdmin: boolean;
  isServiceProvider: boolean;
  isClient: boolean;
}

interface ActionButtonsProps {
  user: User | null | undefined;
  userRoles: UserRoles;
  isLoadingRole: boolean;
  onToggleServiceProvider: () => void;
  onDebugJWT: () => void;
  onMyAds: () => void;
  onViewAllAds: () => void;
  onToggleDiagnoses: () => void;
  showDiagnoses: boolean;
  onToggleNotifications: () => void;
  showNotifications: boolean;
}

export default function ActionButtons({
  user,
  userRoles,
  isLoadingRole,
  onToggleServiceProvider,
  onDebugJWT,
  onMyAds,
  onViewAllAds,
  onToggleDiagnoses,
  showDiagnoses,
  onToggleNotifications,
  showNotifications,
}: ActionButtonsProps) {
  const router = useRouter();

  const handleAdminPanel = () => {
    router.push("/admin");
  };

  return (
    <div className="flex justify-between items-start mb-4">
      <div className="flex flex-col space-y-2">
        {user && !isLoadingRole && (
          <button
            onClick={onToggleServiceProvider}
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
            onClick={onDebugJWT}
            className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            title="Log JWT token to console (developer tool)"
          >
            <IconBug size={18} className="mr-2" />
            Debug JWT
          </button>
        )}
        {user && !isLoadingRole && userRoles.isAdmin && (
          <button
            onClick={handleAdminPanel}
            className="flex items-center bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
          >
            <IconUserShield size={18} className="mr-2" />
            Admin Panel
          </button>
        )}
      </div>
      <div className="flex flex-col space-y-2">
        {user && !isLoadingRole && (
          <>
            <button
              onClick={onMyAds}
              className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              <IconFileText size={18} className="mr-2" />
              My Advertisements
            </button>
            <button
              onClick={onToggleDiagnoses}
              className="flex items-center bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              <IconStar size={18} className="mr-2" />
              {showDiagnoses ? "Ukryj Diagnozy" : "Diagnozy"}
            </button>
          </>
        )}
        {user && !isLoadingRole && userRoles.isServiceProvider && (
          <button
            onClick={onToggleNotifications}
            className="flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-xl font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
          >
            <IconBell size={18} className="mr-2" />
            {showNotifications ? "Hide Notifications" : "Notifications"}
          </button>
        )}
        <button
          onClick={onViewAllAds}
          className="flex items-center bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
        >
          <IconList size={18} className="mr-2" />
          View All Advertisements
        </button>
      </div>
    </div>
  );
}

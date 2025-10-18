import { User } from "firebase/auth";
import { IconUser } from "@tabler/icons-react";

interface UserRoles {
  isAdmin: boolean;
  isServiceProvider: boolean;
  isClient: boolean;
}

interface HeaderSectionProps {
  user: User | null | undefined;
  userRoles: UserRoles;
  isLoadingRole: boolean;
}

export default function HeaderSection({ user, userRoles }: HeaderSectionProps) {
  return (
    <div className="mb-10 text-center relative">
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
              <IconUser size={14} className="mr-1" />
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
  );
}
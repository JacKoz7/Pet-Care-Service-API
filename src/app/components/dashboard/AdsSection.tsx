import Image from "next/image";
import { IconPaw, IconMapPin, IconClock } from "@tabler/icons-react";

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

interface AdsSectionProps {
  filteredAds: Advertisement[];
  isLoading: boolean;
  onViewAd: (adId: number) => void;
}

export default function AdsSection({ filteredAds, isLoading, onViewAd }: AdsSectionProps) {
  return (
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
                        Service hours: {ad.serviceStartTime} - {ad.serviceEndTime}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onViewAd(ad.id)}
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
  );
}
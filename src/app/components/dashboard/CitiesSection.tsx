import Image from "next/image";
import { RefObject } from "react";
import { IconMapPin, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface City {
  idCity: number;
  name: string;
  imageUrl: string;
}

interface CitiesSectionProps {
  filteredCities: City[];
  isLoading: boolean;
  onExploreCity: (cityId: number) => void;
  carouselRef: RefObject<HTMLDivElement | null>;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

export default function CitiesSection({
  filteredCities,
  isLoading,
  onExploreCity,
  carouselRef,
  onScrollLeft,
  onScrollRight,
}: CitiesSectionProps) {
  return (
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
              onClick={onScrollLeft}
              className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-white text-indigo-600 hover:text-indigo-800 transition-all duration-300 hover:scale-110"
              aria-label="Scroll left"
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              onClick={onScrollRight}
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
                    onClick={() => onExploreCity(city.idCity)}
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
  );
}